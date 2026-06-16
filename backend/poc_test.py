"""Phase 1 POC test: proves core business logic + auth + per-user isolation + KSeF simulation.

Run:  python poc_test.py   (backend must be running on :8001)
"""
import sys
import time
import uuid
import requests

BASE = "http://localhost:8001"
PASS = 0
FAIL = 0


def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  \u2713 {name}")
    else:
        FAIL += 1
        print(f"  \u2717 {name}  {detail}")


# ---------------- pure logic (direct import) ----------------
def test_pure_logic():
    print("\n[1] Pure business logic")
    from core.nip import validate_nip
    from core.numbering import generate_invoice_number
    from core.words import amount_in_words_pl
    from core.vat import calculate_vat_groups

    # NIP: 5260001246 (valid GUS NIP), invalid checksum example
    check("NIP valid 5260001246", validate_nip("5260001246") is True)
    check("NIP valid with dashes 526-000-12-46", validate_nip("526-000-12-46") is True)
    check("NIP invalid 1234567890", validate_nip("1234567890") is False)
    check("NIP invalid length", validate_nip("12345") is False)

    num = generate_invoice_number("FV/{YYYY}/{MM}/{NNN}", 2024, 1, 7)
    check("Numbering FV/2024/01/007", num == "FV/2024/01/007", f"got {num}")
    num2 = generate_invoice_number("{TYPE}/{YY}/{MM}/{NNNN}", 2024, 12, 42, "PRO")
    check("Numbering PRO/24/12/0042", num2 == "PRO/24/12/0042", f"got {num2}")

    words = amount_in_words_pl(1234.56)
    expected = "jeden tysi\u0105c dwie\u015bcie trzydzie\u015bci cztery z\u0142ote 56/100"
    check("Amount in words 1234.56", words == expected, f"got '{words}'")
    check("Amount in words 1 zl", amount_in_words_pl(1).startswith("jeden z\u0142oty"), amount_in_words_pl(1))
    check("Amount in words 0", amount_in_words_pl(0) == "zero z\u0142otych 00/100", amount_in_words_pl(0))
    check("Amount in words 21 (zlotych)", "z\u0142otych" in amount_in_words_pl(21), amount_in_words_pl(21))

    items = [
        {"name": "Usluga A", "quantity": 2, "unit_price_net": 100, "vat_rate": "23"},
        {"name": "Usluga B", "quantity": 1, "unit_price_net": 50, "vat_rate": "8"},
        {"name": "Usluga C", "quantity": 1, "unit_price_net": 1000, "vat_rate": "ZW"},
    ]
    vat = calculate_vat_groups(items)
    check("VAT total_net", abs(vat["total_net"] - 1250.0) < 0.001, vat)
    check("VAT total_vat", abs(vat["total_vat"] - 50.0) < 0.001, vat)  # 200*0.23=46 + 50*0.08=4 => 50
    check("VAT total_gross", abs(vat["total_gross"] - 1300.0) < 0.001, vat)
    check("VAT groups count", len(vat["groups"]) == 3, vat)

    big = calculate_vat_groups([{ "name": "X", "quantity": 1, "unit_price_net": 20000, "vat_rate": "23"}])
    check("MPP required > 15000", big["mpp_required"] is True, big)


# ---------------- auth + isolation + ksef (HTTP) ----------------
def api(method, path, **kw):
    return requests.request(method, BASE + path, timeout=20, **kw)


def register(name):
    email = f"poc_{uuid.uuid4().hex[:8]}@test.pl"
    r = api("POST", "/api/auth/register", json={"email": email, "password": "Secret123", "name": name})
    if r.status_code != 200:
        return None, None, r.text
    return email, r.json()["session_token"], None


def test_auth_and_isolation():
    print("\n[2] Auth, isolation & KSeF (HTTP)")
    emailA, tokenA, errA = register("User A")
    check("Register user A", tokenA is not None, errA or "")
    if not tokenA:
        return
    hA = {"Authorization": f"Bearer {tokenA}"}

    # /me
    r = api("GET", "/api/auth/me", headers=hA)
    check("GET /me works", r.status_code == 200 and r.json().get("email") == emailA, r.text)

    # login again
    r = api("POST", "/api/auth/login", json={"email": emailA, "password": "Secret123"})
    check("Login user A", r.status_code == 200, r.text)
    r = api("POST", "/api/auth/login", json={"email": emailA, "password": "wrong"})
    check("Login wrong password rejected", r.status_code == 401, r.text)

    # company for A
    r = api("POST", "/api/companies", headers=hA, json={
        "name": "TechSoft Sp. z o.o.", "nip": "5260001246",
        "street": "ul. Testowa 1", "postal_code": "00-001", "city": "Warszawa",
        "invoice_scheme": "FV/{YYYY}/{MM}/{NNN}",
    })
    check("Create company A", r.status_code == 200, r.text)
    companyA = r.json()

    # invoice for A
    r = api("POST", "/api/invoices", headers=hA, json={
        "company_id": companyA["id"],
        "invoice_type": "FV",
        "issue_date": "2024-01-15",
        "buyer": {"name": "Klient ABC", "nip": "7010001454", "street": "ul. Kliencka 5", "postal_code": "30-001", "city": "Krak\u00f3w"},
        "items": [
            {"name": "Usluga programistyczna", "unit": "godz.", "quantity": 10, "unit_price_net": 150, "vat_rate": "23"},
            {"name": "Hosting", "unit": "szt.", "quantity": 1, "unit_price_net": 200, "vat_rate": "23"},
        ],
    })
    check("Create invoice A", r.status_code == 200, r.text)
    invoiceA = r.json()
    check("Invoice number generated", invoiceA["number"].startswith("FV/2024/01/"), invoiceA.get("number"))
    check("Invoice VAT total_gross", abs(invoiceA["vat_summary"]["total_gross"] - 2091.0) < 0.001, invoiceA["vat_summary"])
    check("Invoice amount in words present", len(invoiceA["amount_in_words"]) > 0)

    # send to KSeF
    r = api("POST", f"/api/invoices/{invoiceA['id']}/send-ksef", headers=hA)
    check("Send to KSeF", r.status_code == 200, r.text)
    ksef = r.json().get("ksef", {})
    check("KSeF number format", ksef.get("ksef_number", "").startswith("5260001246-20240115-"), ksef.get("ksef_number"))
    check("UPO present", "NumerKSeF" in r.json().get("ksef", {}).get("upo_xml", ""), "")
    check("FA XML generated", "<Faktura" in r.json().get("xml", ""), "")

    # user B isolation
    emailB, tokenB, errB = register("User B")
    check("Register user B", tokenB is not None, errB or "")
    if tokenB:
        hB = {"Authorization": f"Bearer {tokenB}"}
        r = api("GET", "/api/companies", headers=hB)
        bComps = [c for c in r.json() if c.get("name") == "TechSoft Sp. z o.o."]
        check("User B cannot see user A company", len(bComps) == 0, f"B sees {len(r.json())} comps")
        r = api("GET", "/api/invoices", headers=hB)
        check("User B cannot see user A invoices", len(r.json()) == 0, f"B sees {len(r.json())} invoices")

    # unauth rejected
    r = api("GET", "/api/companies")
    check("Unauthenticated request rejected", r.status_code == 401, r.text)


def main():
    # wait for backend
    for _ in range(20):
        try:
            if api("GET", "/api/").status_code == 200:
                break
        except Exception:
            time.sleep(1)
    test_pure_logic()
    test_auth_and_isolation()
    print(f"\n==== RESULT: {PASS} passed, {FAIL} failed ====")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
