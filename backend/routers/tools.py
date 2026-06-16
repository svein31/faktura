"""Utility tools: NIP validation, amount-in-words, VAT calc, scheme preview, GUS lookup, KSeF test."""
import httpx
from datetime import date
from fastapi import APIRouter, Body, Depends

from auth import get_current_user
from core.nip import validate_nip, format_nip, clean_nip
from core.numbering import preview_scheme
from core.words import amount_in_words_pl
from core.vat import calculate_vat_groups
from ksef.client import get_ksef_client

router = APIRouter(prefix="/api/tools", tags=["tools"])

MF_API = "https://wl-api.mf.gov.pl/api/search/nip/{nip}?date={date}"


@router.post("/validate-nip")
async def validate_nip_endpoint(payload: dict = Body(...)):
    nip = payload.get("nip", "")
    valid = validate_nip(nip)
    return {"nip": nip, "valid": valid, "formatted": format_nip(nip) if valid else None}


@router.post("/amount-in-words")
async def amount_in_words_endpoint(payload: dict = Body(...)):
    return {"text": amount_in_words_pl(payload.get("amount", 0))}


@router.post("/vat-calc")
async def vat_calc_endpoint(payload: dict = Body(...)):
    return calculate_vat_groups(payload.get("items", []))


@router.get("/scheme-preview")
async def scheme_preview_endpoint(scheme: str = "FV/{YYYY}/{MM}/{NNN}"):
    return {"scheme": scheme, "preview": preview_scheme(scheme)}


@router.post("/gus-lookup")
async def gus_lookup_endpoint(payload: dict = Body(...), user=Depends(get_current_user)):
    """GUS lookup by NIP — queries Ministerstwo Finansów whitelist API (free, no key needed)."""
    nip = clean_nip(payload.get("nip", ""))
    if len(nip) != 10:
        return {"found": False, "message": "Nieprawidłowy NIP"}
    today = date.today().isoformat()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(MF_API.format(nip=nip, date=today))
        if resp.status_code != 200:
            return {"found": False, "message": "Nie znaleziono podmiotu dla podanego NIP"}
        body = resp.json()
        subject = body.get("result", {}).get("subject")
        if not subject:
            return {"found": False, "message": "Nie znaleziono podmiotu dla podanego NIP"}

        name = subject.get("name", "")
        regon = subject.get("regon", "")

        addresses = subject.get("workingAddress", "") or subject.get("residenceAddress", "")
        street, postal_code, city = "", "", ""
        if addresses:
            addr = addresses if isinstance(addresses, str) else str(addresses)
            parts = [p.strip() for p in addr.split(",")]
            if len(parts) >= 2:
                street = parts[0]
                rest = parts[-1].strip()
                tokens = rest.split(" ", 1)
                if len(tokens) == 2 and len(tokens[0]) <= 7:
                    postal_code = tokens[0]
                    city = tokens[1]
                else:
                    city = rest
            else:
                street = addr

        return {
            "found": True,
            "nip": format_nip(nip),
            "data": {
                "name": name,
                "street": street,
                "postal_code": postal_code,
                "city": city,
                "regon": regon,
            },
            "message": "Pobrano dane z rejestru MF (VAT)"
        }
    except Exception:
        return {"found": False, "message": "Błąd połączenia z serwisem MF — spróbuj ponownie"}


@router.post("/ksef-test")
async def ksef_test_endpoint(payload: dict = Body(None), user=Depends(get_current_user)):
    from db import db as _db
    user_settings = await _db.settings.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    if payload:
        user_settings.update(payload)
    client = get_ksef_client(user_settings)
    return await client.test_connection_async()


@router.post("/ksef-auth-test")
async def ksef_auth_test_endpoint(payload: dict = Body(None), user=Depends(get_current_user)):
    """Run the full KSeF auth flow step-by-step and return per-step results."""
    import time
    import base64
    import os
    from db import db as _db
    from ksef.client import RealKsefClient, _clean_nip

    user_settings = await _db.settings.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    if payload:
        user_settings.update(payload)

    token = (user_settings.get("ksef_token") or "").strip()
    env = (user_settings.get("ksef_env") or "test").strip()

    steps = []

    def _step(name: str, ok: bool, detail: str, duration_ms: int):
        steps.append({"name": name, "ok": ok, "detail": detail, "duration_ms": duration_ms})

    if not token:
        return {
            "success": False,
            "mode": "simulation",
            "steps": [{"name": "Sprawdzenie tokena", "ok": False, "detail": "Brak tokena KSeF — uzupełnij pole Token KSeF i zapisz ustawienia.", "duration_ms": 0}],
        }

    client = RealKsefClient(token, env)

    # Pobierz NIP z pierwszej aktywnej firmy usera
    company = await _db.companies.find_one({"user_id": user["user_id"], "is_active": True}, {"_id": 0})
    if not company:
        company = await _db.companies.find_one({"user_id": user["user_id"]}, {"_id": 0})
    nip = _clean_nip((company or {}).get("nip", ""))
    if not nip:
        return {
            "success": False,
            "mode": "real",
            "steps": [{"name": "Sprawdzenie NIP", "ok": False, "detail": "Brak NIP firmy — dodaj firmę z NIP w sekcji 'Moje Firmy'.", "duration_ms": 0}],
        }

    # Step 1: Certyfikaty
    t0 = time.time()
    try:
        certs = await client._get_certs()
        cert_ok = bool(certs.get("token_cert"))
        tok_id = certs.get("token_id", "") or ""
        sym_id = certs.get("sym_id", "") or ""
        _step("Pobranie certyfikatów KSeF", cert_ok,
              f"KsefTokenEncryption: {'OK' if cert_ok else 'BRAK'} | SymmetricKey: {'OK' if certs.get('sym_cert') else 'BRAK'} | publicKeyId(token): {tok_id[:24] or 'BRAK'} | publicKeyId(sym): {sym_id[:24] or 'BRAK'}",
              int((time.time() - t0) * 1000))
        if not cert_ok:
            return {"success": False, "mode": "real", "environment": env, "steps": steps}
    except Exception as e:
        _step("Pobranie certyfikatów KSeF", False, str(e), int((time.time() - t0) * 1000))
        return {"success": False, "mode": "real", "environment": env, "steps": steps}

    # Step 2: Challenge
    t0 = time.time()
    try:
        chall_data = await client._get_challenge(nip)
        challenge = chall_data.get("challenge", "")
        timestamp_ms = chall_data.get("timestampMs") or chall_data.get("timestamp") or 0
        if not challenge:
            raise RuntimeError(f"Brak pola 'challenge' w odpowiedzi: {chall_data}")
        _step("Pobranie challenge (NIP: " + nip + ")", True,
              f"challenge: {challenge[:24]}… | timestamp: {timestamp_ms}",
              int((time.time() - t0) * 1000))
    except Exception as e:
        _step("Pobranie challenge", False, str(e), int((time.time() - t0) * 1000))
        return {"success": False, "mode": "real", "environment": env, "steps": steps}

    # Step 3: Autoryzacja tokenem
    t0 = time.time()
    try:
        auth_token = await client._auth_ksef_token(nip, challenge, timestamp_ms, certs["token_cert"])
        if not auth_token:
            raise RuntimeError("KSeF nie zwrócił authenticationToken (puste pole)")
        _step("Autoryzacja tokenem KSeF (/auth/ksef-token)", True,
              f"authenticationToken: {auth_token[:32]}…",
              int((time.time() - t0) * 1000))
    except Exception as e:
        _step("Autoryzacja tokenem KSeF (/auth/ksef-token)", False, str(e), int((time.time() - t0) * 1000))
        return {"success": False, "mode": "real", "environment": env, "steps": steps}

    # Step 4: Otwarcie sesji online
    session_ref = None
    t0 = time.time()
    try:
        session_ref, aes_key, iv = await client._open_session(auth_token, certs["sym_cert"])
        if not session_ref:
            raise RuntimeError("KSeF nie zwrócił referenceNumber sesji (puste pole)")
        _step("Otwarcie sesji online (/sessions/online)", True,
              f"sessionRef: {session_ref}",
              int((time.time() - t0) * 1000))
    except Exception as e:
        err_str = str(e)
        # Detect presentPermissions: [] — token lacks InvoiceWrite in KSeF portal
        import json as _json
        try:
            err_json = _json.loads(err_str[err_str.index("{"):]) if "{" in err_str else {}
        except Exception:
            err_json = {}
        sec = err_json.get("security", {})
        present_perms = sec.get("presentPermissions")
        required_perms = sec.get("requiredAnyOfPermissions", [])
        if present_perms is not None and len(present_perms) == 0:
            detail = (
                f"BRAK UPRAWNIEŃ TOKENU — Token KSeF nie ma żadnych uprawnień "
                f"(requiredAnyOf: {', '.join(required_perms)}, presentPermissions: []).\n"
                f"Rozwiązanie: zaloguj się do portalu KSeF ({('Test: https://ksef-test.mf.gov.pl' if env == 'test' else 'Prod: https://ksef.mf.gov.pl')}), "
                f"przejdź do Zarządzanie > Uprawnienia > znajdź swój token i dodaj uprawnienie 'InvoiceWrite'. "
                f"Następnie poczekaj kilka minut i spróbuj ponownie."
            )
        else:
            detail = err_str
        _step("Otwarcie sesji online (/sessions/online)", False, detail, int((time.time() - t0) * 1000))
        return {"success": False, "mode": "real", "environment": env, "steps": steps, "permissions_error": present_perms is not None and len(present_perms) == 0}

    # Step 5: Zamknięcie sesji
    t0 = time.time()
    try:
        await client._close_session(auth_token, session_ref)
        _step("Zamknięcie sesji (DELETE /sessions/online/{ref})", True,
              "Sesja zamknięta poprawnie",
              int((time.time() - t0) * 1000))
    except Exception as e:
        _step("Zamknięcie sesji", False, str(e), int((time.time() - t0) * 1000))

    all_ok = all(s["ok"] for s in steps)
    return {
        "success": all_ok,
        "mode": "real",
        "environment": env,
        "steps": steps,
        "message": "Pełna autoryzacja KSeF zakończona sukcesem — token jest gotowy do wysyłki faktur!" if all_ok else "Autoryzacja KSeF nieudana — sprawdź szczegóły kroków poniżej.",
    }


@router.post("/ksef-send-test")
async def ksef_send_test_endpoint(payload: dict = Body(None), user=Depends(get_current_user)):
    """Send a minimal dummy invoice to KSeF and return detailed step results."""
    import time
    from datetime import date as _date
    from db import db as _db
    from ksef.client import RealKsefClient, _clean_nip
    from ksef.xml_gen import generate_fa_xml

    user_settings = await _db.settings.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    if payload:
        user_settings.update(payload)

    token = (user_settings.get("ksef_token") or "").strip()
    env = (user_settings.get("ksef_env") or "test").strip()

    steps = []

    def _step(name: str, ok: bool, detail: str, duration_ms: int):
        steps.append({"name": name, "ok": ok, "detail": detail, "duration_ms": duration_ms})

    if not token:
        return {
            "success": False,
            "steps": [{"name": "Sprawdzenie tokena", "ok": False,
                        "detail": "Brak tokena KSeF — uzupełnij i zapisz ustawienia.", "duration_ms": 0}],
        }

    company = await _db.companies.find_one({"user_id": user["user_id"], "is_active": True}, {"_id": 0})
    if not company:
        company = await _db.companies.find_one({"user_id": user["user_id"]}, {"_id": 0})
    nip = _clean_nip((company or {}).get("nip", ""))
    if not nip:
        return {
            "success": False,
            "steps": [{"name": "Sprawdzenie NIP", "ok": False,
                        "detail": "Brak NIP firmy — dodaj firmę w 'Moje Firmy'.", "duration_ms": 0}],
        }

    today = _date.today().isoformat()
    dummy_invoice = {
        "number": f"TEST/{today.replace('-','')}/001",
        "invoice_type": "FV",
        "issue_date": today,
        "sale_date": today,
        "currency": "PLN",
        "items": [{"name": "Testowa pozycja KSeF", "quantity": 1, "unit": "szt.", "unit_price_net": 1.00, "net": 1.00, "vat_rate": "23", "vat": 0.23, "gross": 1.23}],
    }
    dummy_vat = {"groups": [{"rate": "23", "net": 1.00, "vat": 0.23, "gross": 1.23}], "total_net": 1.00, "total_vat": 0.23, "total_gross": 1.23}
    seller = {"name": company.get("name", "Test"), "nip": nip, "address": company}
    buyer = {"name": "NABYWCA TESTOWY", "nip": "0000000000", "address": {"street": "ul. Testowa 1", "postal_code": "00-001", "city": "Warszawa", "country_code": "PL"}}

    t0 = time.time()
    try:
        xml = generate_fa_xml(dummy_invoice, seller, buyer, dummy_vat)
        _step("Generowanie XML faktury", True, f"Rozmiar XML: {len(xml)} bajtów", int((time.time() - t0) * 1000))
    except Exception as e:
        _step("Generowanie XML faktury", False, str(e), int((time.time() - t0) * 1000))
        return {"success": False, "steps": steps}

    client = RealKsefClient(token, env)

    t0 = time.time()
    try:
        result = await client.send_invoice_async(xml, nip, today)
        _step("Wysyłka faktury do KSeF (pełny flow)", True,
              f"Numer KSeF: {result['ksef_number']} | Referencja: {result['reference_number']} | Status: {result['status']}",
              int((time.time() - t0) * 1000))
        return {
            "success": True,
            "ksef_number": result["ksef_number"],
            "reference_number": result["reference_number"],
            "environment": env,
            "steps": steps,
            "message": f"Testowa faktura wysłana do KSeF pomyślnie! Numer KSeF: {result['ksef_number']}",
        }
    except Exception as e:
        err_str = str(e)
        import json as _json2
        try:
            err_json2 = _json2.loads(err_str[err_str.index("{"):]) if "{" in err_str else {}
        except Exception:
            err_json2 = {}
        sec2 = err_json2.get("security", {})
        present_perms2 = sec2.get("presentPermissions")
        required_perms2 = sec2.get("requiredAnyOfPermissions", [])
        is_perm_err2 = present_perms2 is not None and len(present_perms2) == 0
        if is_perm_err2:
            detail2 = (
                f"BRAK UPRAWNIEŃ TOKENU — requiredAnyOf: {', '.join(required_perms2)}, presentPermissions: [].\n"
                f"Rozwiązanie: zaloguj się do portalu KSeF ({('https://ksef-test.mf.gov.pl' if env == 'test' else 'https://ksef.mf.gov.pl')}), "
                f"przejdź do Zarządzanie → Uprawnienia → Tokeny i dodaj uprawnienie InvoiceWrite do swojego tokenu. "
                f"Następnie poczekaj ~2 minuty i spróbuj ponownie."
            )
        else:
            detail2 = err_str
        _step("Wysyłka faktury do KSeF (pełny flow)", False, detail2, int((time.time() - t0) * 1000))
        return {
            "success": False,
            "steps": steps,
            "environment": env,
            "permissions_error": is_perm_err2,
            "message": f"Błąd wysyłki: {e}",
        }
