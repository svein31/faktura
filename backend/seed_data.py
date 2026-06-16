"""Per-user demo data seeding (companies, clients, invoices, expenses, templates, settings)."""
from datetime import datetime, timezone, timedelta

from db import db
from helpers import gen_id, now_iso
from core.vat import enrich_items, calculate_vat_groups
from core.words import amount_in_words_pl
from core.numbering import generate_invoice_number


def _date(days_offset=0):
    return (datetime.now(timezone.utc) + timedelta(days=days_offset)).strftime("%Y-%m-%d")


def _month_date(months_back=0, day=10):
    d = datetime.now(timezone.utc).replace(day=1)
    y = d.year
    m = d.month - months_back
    while m <= 0:
        m += 12
        y -= 1
    return f"{y}-{m:02d}-{day:02d}"


async def seed_for_user(user_id: str):
    # Avoid double seeding
    if await db.companies.find_one({"user_id": user_id}):
        return

    # ---- Companies ----
    comp1_id = gen_id()
    comp2_id = gen_id()
    companies = [
        {
            "id": comp1_id, "user_id": user_id, "name": "TechSoft Sp. z o.o.", "short_name": "TechSoft",
            "nip": "5260001246", "regon": "012345678", "krs": "0000123456",
            "street": "ul. Pu\u0142awska 145", "postal_code": "02-715", "city": "Warszawa", "country_code": "PL",
            "same_correspondence": True, "correspondence": {},
            "logo": "", "bank_accounts": [{"iban": "PL61109010140000071219812874", "bank": "Santander Bank Polska", "swift": "WBKPPLPP"}],
            "email": "biuro@techsoft.pl", "phone": "+48 22 123 45 67", "www": "www.techsoft.pl",
            "tax_form": "Podatek liniowy 19%", "vat_status": "Czynny podatnik VAT",
            "invoice_scheme": "FV/{YYYY}/{MM}/{NNN}", "default_payment_days": 14, "default_payment_method": "Przelew",
            "is_active": True, "created_at": now_iso(),
        },
        {
            "id": comp2_id, "user_id": user_id, "name": "Jan Kowalski Freelancer", "short_name": "JK Freelancer",
            "nip": "5252248481", "regon": "387654321", "krs": "",
            "street": "ul. Kwiatowa 8/3", "postal_code": "30-001", "city": "Krak\u00f3w", "country_code": "PL",
            "same_correspondence": True, "correspondence": {},
            "logo": "", "bank_accounts": [{"iban": "PL27114020040000300201355387", "bank": "mBank", "swift": "BREXPLPWMBK"}],
            "email": "jan@kowalski.dev", "phone": "+48 600 100 200", "www": "www.kowalski.dev",
            "tax_form": "Rycza\u0142t", "vat_status": "Zwolniony z VAT",
            "invoice_scheme": "JK/{YYYY}/{NNN}", "default_payment_days": 7, "default_payment_method": "Przelew",
            "is_active": False, "created_at": now_iso(),
        },
    ]
    await db.companies.insert_many(companies)

    # ---- Clients ----
    clients = [
        {"id": gen_id(), "user_id": user_id, "type": "Firma", "name": "Globex Solutions S.A.", "nip": "7010001453", "regon": "", "pesel": "",
         "street": "al. Jerozolimskie 100", "postal_code": "00-807", "city": "Warszawa", "country": "Polska", "vat_eu": "",
         "email": "kontakt@globex.pl", "phone": "+48 22 500 60 70", "notes": "Kluczowy klient \u2014 priorytet obs\u0142ugi.", "created_at": now_iso()},
        {"id": gen_id(), "user_id": user_id, "type": "Firma", "name": "Nova Media Sp. z o.o.", "nip": "7792367701", "regon": "", "pesel": "",
         "street": "ul. G\u0142ogowska 31", "postal_code": "60-702", "city": "Pozna\u0144", "country": "Polska", "vat_eu": "",
         "email": "faktury@novamedia.pl", "phone": "+48 61 222 33 44", "notes": "", "created_at": now_iso()},
        {"id": gen_id(), "user_id": user_id, "type": "Firma", "name": "BuildPro Construction", "nip": "8982100048", "regon": "", "pesel": "",
         "street": "ul. Legnicka 55", "postal_code": "54-203", "city": "Wroc\u0142aw", "country": "Polska", "vat_eu": "",
         "email": "biuro@buildpro.pl", "phone": "+48 71 100 20 30", "notes": "", "created_at": now_iso()},
        {"id": gen_id(), "user_id": user_id, "type": "Osoba fizyczna", "name": "Anna Nowak", "nip": "", "regon": "", "pesel": "89010112345",
         "street": "ul. Lipowa 12", "postal_code": "40-001", "city": "Katowice", "country": "Polska", "vat_eu": "",
         "email": "anna.nowak@gmail.com", "phone": "+48 501 234 567", "notes": "Klient indywidualny.", "created_at": now_iso()},
        {"id": gen_id(), "user_id": user_id, "type": "Zagraniczna firma", "name": "Bright GmbH", "nip": "", "regon": "", "pesel": "",
         "street": "Hauptstrasse 25", "postal_code": "10115", "city": "Berlin", "country": "Niemcy", "vat_eu": "DE811569869",
         "email": "office@bright.de", "phone": "+49 30 123456", "notes": "Rozliczenie w EUR.", "created_at": now_iso()},
    ]
    await db.clients.insert_many(clients)

    # ---- Invoices (8, varied statuses/months) ----
    c = companies[0]
    period_counters = {}

    def make_invoice(buyer, items, issue, status, due_days=14, currency="PLN", invoice_type="FV"):
        items_e = enrich_items(items)
        vat = calculate_vat_groups(items_e)
        dt = datetime.strptime(issue, "%Y-%m-%d")
        pk = f"{dt.year}-{dt.month:02d}"
        period_counters[pk] = period_counters.get(pk, 0) + 1
        seq = period_counters[pk]
        due = (dt + timedelta(days=due_days)).strftime("%Y-%m-%d")
        number = generate_invoice_number(c["invoice_scheme"], dt.year, dt.month, seq, invoice_type)
        return {
            "id": gen_id(), "user_id": user_id, "company_id": c["id"], "number": number,
            "invoice_type": invoice_type, "issue_date": issue, "sale_date": issue, "due_date": due,
            "payment_days": due_days, "payment_method": "Przelew", "currency": currency, "exchange_rate": 1,
            "seller_snapshot": {"name": c["name"], "nip": c["nip"], "address": {"street": c["street"], "postal_code": c["postal_code"], "city": c["city"], "country_code": "PL"}, "bank_accounts": c["bank_accounts"]},
            "buyer": {"client_id": buyer["id"], "name": buyer["name"], "nip": buyer["nip"], "street": buyer["street"], "postal_code": buyer["postal_code"], "city": buyer["city"]},
            "items": items_e, "vat_summary": vat, "amount_in_words": amount_in_words_pl(vat["total_gross"]),
            "mpp": vat["mpp_required"], "paragon": False, "paragon_number": "", "po_number": "", "delivery_method": "",
            "notes": "", "status": status, "ksef": None,
            "history": [{"at": now_iso(), "event": "Utworzono faktur\u0119"}], "created_at": now_iso(),
        }

    # Specs with explicit issue dates; sorted chronologically so numbering increments with date.
    specs = [
        (clients[4], [{"name": "Konsulting (us\u0142uga UE)", "unit": "godz.", "quantity": 20, "unit_price_net": 90, "vat_rate": "NP"}], _month_date(3, 8), "Zap\u0142acona", 14, "EUR"),
        (clients[3], [{"name": "Szkolenie z obs\u0142ugi systemu", "unit": "szt.", "quantity": 1, "unit_price_net": 2400, "vat_rate": "23"}], _month_date(2, 12), "Zap\u0142acona", 7, "PLN"),
        (clients[1], [{"name": "Hosting roczny", "unit": "szt.", "quantity": 1, "unit_price_net": 3600, "vat_rate": "23"}], _month_date(2, 18), "Zap\u0142acona", 30, "PLN"),
        (clients[0], [{"name": "Wdro\u017cenie systemu CRM", "unit": "szt.", "quantity": 1, "unit_price_net": 18000, "vat_rate": "23"}], _date(-40), "Wys\u0142ana", 30, "PLN"),  # overdue: due -10d
        (clients[2], [{"name": "Audyt bezpiecze\u0144stwa IT", "unit": "szt.", "quantity": 1, "unit_price_net": 9500, "vat_rate": "23"}], _month_date(1, 10), "Zap\u0142acona", 21, "PLN"),
        (clients[0], [{"name": "Rozw\u00f3j aplikacji mobilnej", "unit": "godz.", "quantity": 40, "unit_price_net": 200, "vat_rate": "23"}], _month_date(1, 20), "Zap\u0142acona", 14, "PLN"),
        (clients[1], [{"name": "Abonament SaaS (miesi\u0119czny)", "unit": "mies.", "quantity": 1, "unit_price_net": 1200, "vat_rate": "23"}, {"name": "Wsparcie techniczne", "unit": "godz.", "quantity": 8, "unit_price_net": 180, "vat_rate": "23"}], _month_date(0, 6), "Zap\u0142acona", 14, "PLN"),
        (clients[2], [{"name": "Projekt strony WWW", "unit": "szt.", "quantity": 1, "unit_price_net": 6800, "vat_rate": "23"}], _date(-3), "Wystawiona", 7, "PLN"),  # upcoming: due +4d
    ]
    specs.sort(key=lambda s: s[2])
    invoices = [make_invoice(buyer, items, issue, status, due_days, currency) for (buyer, items, issue, status, due_days, currency) in specs]
    await db.invoices.insert_many(invoices)

    # Persist numbering counters so newly created invoices never collide with seeded numbers.
    for pk, seq in period_counters.items():
        await db.counters.update_one({"_id": f"{user_id}:{c['id']}:{pk}"}, {"$set": {"seq": seq}}, upsert=True)

    # ---- Expenses (5) ----
    def make_expense(num, supplier_name, supplier_nip, category, items, months_back, status, deduction=100):
        items_e = enrich_items(items)
        vat = calculate_vat_groups(items_e)
        issue = _month_date(months_back, day=15)
        return {
            "id": gen_id(), "user_id": user_id, "supplier_number": num,
            "supplier": {"name": supplier_name, "nip": supplier_nip}, "category": category,
            "issue_date": issue, "received_date": issue, "items": items_e, "vat_summary": vat,
            "vat_deduction": deduction, "status": status, "scan": "", "notes": "", "created_at": now_iso(),
        }

    expenses = [
        make_expense("FV/100/2024", "Dell Technologies", "6420000808", "Sprz\u0119t IT", [{"name": "Laptop Dell XPS 15", "unit": "szt.", "quantity": 1, "unit_price_net": 7200, "vat_rate": "23"}], 0, "Zap\u0142acona"),
        make_expense("OR/2024/0567", "Orange Polska", "5260001246", "Telefon/Internet", [{"name": "Abonament telefon + internet", "unit": "mies.", "quantity": 1, "unit_price_net": 220, "vat_rate": "23"}], 0, "Zap\u0142acona"),
        make_expense("PAL/8891", "Orlen S.A.", "7792367701", "Paliwo", [{"name": "Paliwo Pb95", "unit": "l", "quantity": 50, "unit_price_net": 5.2, "vat_rate": "23"}], 0, "Oczekuje", 50),
        make_expense("BIU/2024/03", "Regus Biura", "9512415513", "Wynajem biura", [{"name": "Wynajem biura (miesi\u0119czny)", "unit": "mies.", "quantity": 1, "unit_price_net": 2500, "vat_rate": "23"}], 1, "Zap\u0142acona"),
        make_expense("MKT/2024/45", "Google Ireland", "", "Marketing", [{"name": "Kampania Google Ads", "unit": "szt.", "quantity": 1, "unit_price_net": 1500, "vat_rate": "OO"}], 1, "Zakwestionowana", 100),
    ]
    await db.expenses.insert_many(expenses)

    # ---- Templates (2) ----
    templates = [
        {"id": gen_id(), "user_id": user_id, "name": "Abonament SaaS \u2014 miesi\u0119czny", "company_id": comp1_id, "client_id": clients[1]["id"],
         "items": [{"name": "Abonament SaaS (miesi\u0119czny)", "unit": "mies.", "quantity": 1, "unit_price_net": 1200, "vat_rate": "23"}],
         "notes": "P\u0142atno\u015b\u0107 z g\u00f3ry za miesi\u0105c.", "payment_days": 14, "payment_method": "Przelew",
         "cyclic": True, "frequency": "Miesi\u0119cznie", "first_date": _date(-5), "created_at": now_iso()},
        {"id": gen_id(), "user_id": user_id, "name": "Wsparcie techniczne \u2014 pakiet", "company_id": comp1_id, "client_id": clients[0]["id"],
         "items": [{"name": "Wsparcie techniczne", "unit": "godz.", "quantity": 10, "unit_price_net": 180, "vat_rate": "23"}],
         "notes": "", "payment_days": 14, "payment_method": "Przelew",
         "cyclic": False, "frequency": "Miesi\u0119cznie", "first_date": _date(), "created_at": now_iso()},
    ]
    await db.templates.insert_many(templates)

    # ---- Settings ----
    await db.settings.update_one(
        {"user_id": user_id},
        {"$setOnInsert": {
            "user_id": user_id, "theme": "light", "language": "pl", "base_currency": "PLN",
            "tax_year": datetime.now(timezone.utc).year, "invoice_scheme": "FV/{YYYY}/{MM}/{NNN}",
            "counter_reset": "monthly", "email_template": "Dzie\u0144 dobry,\n\nW za\u0142\u0105czeniu przesy\u0142am faktur\u0119 {numer} na kwot\u0119 {kwota}.\nTermin p\u0142atno\u015bci: {termin}.\n\nPozdrawiam",
            "ksef_token": "", "ksef_env": "test", "default_payment_days": 14, "default_payment_method": "Przelew",
        }},
        upsert=True,
    )
