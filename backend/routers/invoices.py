"""Sales invoices (Faktury sprzeda\u017cy) — full CRUD + KSeF send + duplicate + status."""
from fastapi import APIRouter, Body, Depends, HTTPException

from auth import get_current_user
from db import db
from helpers import gen_id, now_iso, audit, decorate_invoice, build_invoice_doc
from ksef.client import get_ksef_client
from ksef.xml_gen import generate_fa_xml

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


async def _get_company(user_id, company_id):
    company = None
    if company_id:
        company = await db.companies.find_one({"id": company_id, "user_id": user_id}, {"_id": 0})
    if not company:
        company = await db.companies.find_one({"user_id": user_id, "is_active": True}, {"_id": 0})
    if not company:
        company = await db.companies.find_one({"user_id": user_id}, {"_id": 0})
    return company


@router.get("")
async def list_invoices(user=Depends(get_current_user)):
    invoices = await db.invoices.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return [decorate_invoice(i) for i in invoices]


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str, user=Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": invoice_id, "user_id": user["user_id"]}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Faktura nie znaleziona")
    company = await db.companies.find_one({"id": inv["company_id"], "user_id": user["user_id"]}, {"_id": 0})
    return {"invoice": decorate_invoice(inv), "company": company}


@router.post("")
async def create_invoice(payload: dict = Body(...), user=Depends(get_current_user)):
    company = await _get_company(user["user_id"], payload.get("company_id"))
    if not company:
        raise HTTPException(status_code=400, detail="Najpierw dodaj firm\u0119 (Moje Firmy)")
    doc = await build_invoice_doc(user["user_id"], payload, company)
    doc["history"] = [{"at": now_iso(), "event": "Utworzono faktur\u0119"}]
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    await audit(user["user_id"], "invoice", doc["id"], "create", doc["number"])
    return decorate_invoice(doc)


@router.put("/{invoice_id}")
async def update_invoice(invoice_id: str, payload: dict = Body(...), user=Depends(get_current_user)):
    existing = await db.invoices.find_one({"id": invoice_id, "user_id": user["user_id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Faktura nie znaleziona")
    company = await _get_company(user["user_id"], payload.get("company_id", existing.get("company_id")))
    doc = await build_invoice_doc(user["user_id"], payload, company, existing=existing)
    doc["history"] = existing.get("history", []) + [{"at": now_iso(), "event": "Zaktualizowano faktur\u0119"}]
    await db.invoices.replace_one({"id": invoice_id, "user_id": user["user_id"]}, doc)
    doc.pop("_id", None)
    return decorate_invoice(doc)


@router.post("/{invoice_id}/status")
async def change_status(invoice_id: str, payload: dict = Body(...), user=Depends(get_current_user)):
    new_status = payload.get("status")
    valid = {"Szkic", "Wystawiona", "Wys\u0142ana", "Zap\u0142acona", "Przeterminowana", "Anulowana"}
    if new_status not in valid:
        raise HTTPException(status_code=400, detail="Nieprawid\u0142owy status")
    inv = await db.invoices.find_one({"id": invoice_id, "user_id": user["user_id"]}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Faktura nie znaleziona")
    old = inv.get("status")
    event = {"at": now_iso(), "event": f"Status zmieniony z '{old}' na '{new_status}'"}
    update = {"status": new_status}
    if new_status == "Zap\u0142acona":
        update["paid_at"] = now_iso()
    await db.invoices.update_one(
        {"id": invoice_id, "user_id": user["user_id"]},
        {"$set": update, "$push": {"history": event}},
    )
    await audit(user["user_id"], "invoice", invoice_id, "status", f"{old} -> {new_status}")
    updated = await db.invoices.find_one({"id": invoice_id, "user_id": user["user_id"]}, {"_id": 0})
    return decorate_invoice(updated)


@router.post("/{invoice_id}/duplicate")
async def duplicate_invoice(invoice_id: str, user=Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": invoice_id, "user_id": user["user_id"]}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Faktura nie znaleziona")
    company = await _get_company(user["user_id"], inv.get("company_id"))
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    payload = dict(inv)
    payload.pop("number", None)
    payload["issue_date"] = today
    payload["sale_date"] = today
    payload["status"] = "Szkic"
    doc = await build_invoice_doc(user["user_id"], payload, company)
    doc["ksef"] = None
    doc["history"] = [{"at": now_iso(), "event": f"Zduplikowano z {inv['number']}"}]
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    await audit(user["user_id"], "invoice", doc["id"], "duplicate", f"from {inv['number']}")
    return decorate_invoice(doc)


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str, user=Depends(get_current_user)):
    res = await db.invoices.delete_one({"id": invoice_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Faktura nie znaleziona")
    await audit(user["user_id"], "invoice", invoice_id, "delete")
    return {"success": True}


@router.post("/{invoice_id}/send-ksef")
async def send_invoice_ksef(invoice_id: str, user=Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": invoice_id, "user_id": user["user_id"]}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Faktura nie znaleziona")
    company = await db.companies.find_one({"id": inv["company_id"], "user_id": user["user_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Firma nie znaleziona")

    # Load user KSeF settings — use real client when token is configured
    user_settings = await db.settings.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    client = get_ksef_client(user_settings)

    seller = {"name": company.get("name", ""), "nip": company.get("nip", ""), "address": company}
    buyer = inv.get("buyer", {})
    xml = generate_fa_xml(inv, seller, buyer, inv["vat_summary"])

    try:
        result = await client.send_invoice_async(xml, company.get("nip", ""), inv["issue_date"])
    except Exception as exc:
        error_msg = str(exc)
        # Persist the error so UI can display it
        await db.invoices.update_one(
            {"id": invoice_id, "user_id": user["user_id"]},
            {
                "$set": {"ksef_last_error": {"message": error_msg, "at": now_iso(), "mode": client.mode, "environment": getattr(client, "env", "test")}},
                "$push": {"history": {"at": now_iso(), "event": f"Błąd wysyłki KSeF: {error_msg[:120]}"}},
            },
        )
        raise HTTPException(status_code=502, detail=f"Błąd wysyłki do KSeF: {error_msg}") from exc

    ksef_record = {
        "ksef_number": result["ksef_number"],
        "reference_number": result["reference_number"],
        "status": result["status"],
        "environment": result["environment"],
        "mode": result["mode"],
        "document_hash": result["document_hash"],
        "upo_xml": result["upo_xml"],
        "xml": xml,
        "sent_at": result["sent_at"],
    }
    new_status = "Wysłana" if inv.get("status") in ("Szkic", "Wystawiona") else inv.get("status")
    await db.invoices.update_one(
        {"id": invoice_id, "user_id": user["user_id"]},
        {
            "$set": {"ksef": ksef_record, "status": new_status},
            "$push": {"history": {"at": now_iso(), "event": f"Wysłano do KSeF: {result['ksef_number']} [{result['mode']}]"}},
        },
    )
    await audit(user["user_id"], "invoice", invoice_id, "ksef_send", result["ksef_number"])
    return {"ksef": ksef_record}
