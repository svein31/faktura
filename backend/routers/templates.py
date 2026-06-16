"""Invoice templates (Szablony) + issue invoice from template."""
from fastapi import APIRouter, Body, Depends, HTTPException
from datetime import datetime, timezone, timedelta

from auth import get_current_user
from db import db
from helpers import gen_id, now_iso, audit, build_invoice_doc, decorate_invoice

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("")
async def list_templates(user=Depends(get_current_user)):
    return await db.templates.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@router.post("")
async def create_template(payload: dict = Body(...), user=Depends(get_current_user)):
    doc = dict(payload)
    doc["id"] = gen_id()
    doc["user_id"] = user["user_id"]
    doc["created_at"] = now_iso()
    await db.templates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/{template_id}")
async def update_template(template_id: str, payload: dict = Body(...), user=Depends(get_current_user)):
    payload.pop("id", None)
    payload.pop("user_id", None)
    res = await db.templates.update_one({"id": template_id, "user_id": user["user_id"]}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Szablon nie znaleziony")
    return await db.templates.find_one({"id": template_id, "user_id": user["user_id"]}, {"_id": 0})


@router.delete("/{template_id}")
async def delete_template(template_id: str, user=Depends(get_current_user)):
    res = await db.templates.delete_one({"id": template_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Szablon nie znaleziony")
    return {"success": True}


@router.post("/{template_id}/issue")
async def issue_from_template(template_id: str, user=Depends(get_current_user)):
    tpl = await db.templates.find_one({"id": template_id, "user_id": user["user_id"]}, {"_id": 0})
    if not tpl:
        raise HTTPException(status_code=404, detail="Szablon nie znaleziony")
    company = await db.companies.find_one(
        {"id": tpl.get("company_id"), "user_id": user["user_id"]}, {"_id": 0}
    ) or await db.companies.find_one({"user_id": user["user_id"], "is_active": True}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=400, detail="Brak firmy do wystawienia faktury")

    client = await db.clients.find_one({"id": tpl.get("client_id"), "user_id": user["user_id"]}, {"_id": 0}) or {}
    today = datetime.now(timezone.utc)
    due = (today + timedelta(days=tpl.get("payment_days", 14))).strftime("%Y-%m-%d")
    payload = {
        "company_id": company["id"],
        "invoice_type": "FV",
        "issue_date": today.strftime("%Y-%m-%d"),
        "sale_date": today.strftime("%Y-%m-%d"),
        "due_date": due,
        "payment_days": tpl.get("payment_days", 14),
        "payment_method": tpl.get("payment_method", "Przelew"),
        "buyer": {"client_id": client.get("id", ""), "name": client.get("name", ""), "nip": client.get("nip", ""),
                   "street": client.get("street", ""), "postal_code": client.get("postal_code", ""), "city": client.get("city", "")},
        "items": tpl.get("items", []),
        "notes": tpl.get("notes", ""),
        "status": "Wystawiona",
    }
    doc = await build_invoice_doc(user["user_id"], payload, company)
    doc["history"] = [{"at": now_iso(), "event": f"Wystawiono z szablonu: {tpl['name']}"}]
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    await audit(user["user_id"], "invoice", doc["id"], "from_template", tpl["name"])
    return decorate_invoice(doc)
