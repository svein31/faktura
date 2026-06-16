"""Expenses (Wydatki / faktury kosztowe) — user scoped CRUD + stats."""
from fastapi import APIRouter, Body, Depends, HTTPException

from auth import get_current_user
from db import db
from helpers import gen_id, now_iso, audit
from core.vat import enrich_items, calculate_vat_groups

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

CATEGORIES = ["Us\u0142ugi", "Sprz\u0119t IT", "Paliwo", "Wynajem biura", "Telefon/Internet", "Marketing", "Delegacje", "Szkolenia", "Inne"]


def _build(payload):
    items = enrich_items(payload.get("items", []))
    vat = calculate_vat_groups(items)
    return items, vat


@router.get("")
async def list_expenses(user=Depends(get_current_user)):
    return await db.expenses.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(5000)


@router.post("")
async def create_expense(payload: dict = Body(...), user=Depends(get_current_user)):
    items, vat = _build(payload)
    doc = dict(payload)
    doc.update({
        "id": gen_id(), "user_id": user["user_id"], "items": items, "vat_summary": vat,
        "vat_deduction": payload.get("vat_deduction", 100), "status": payload.get("status", "Oczekuje"),
        "created_at": now_iso(),
    })
    await db.expenses.insert_one(doc)
    doc.pop("_id", None)
    await audit(user["user_id"], "expense", doc["id"], "create", doc.get("supplier_number", ""))
    return doc


@router.put("/{expense_id}")
async def update_expense(expense_id: str, payload: dict = Body(...), user=Depends(get_current_user)):
    items, vat = _build(payload)
    payload.pop("id", None)
    payload.pop("user_id", None)
    payload["items"] = items
    payload["vat_summary"] = vat
    res = await db.expenses.update_one({"id": expense_id, "user_id": user["user_id"]}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Wydatek nie znaleziony")
    return await db.expenses.find_one({"id": expense_id, "user_id": user["user_id"]}, {"_id": 0})


@router.post("/{expense_id}/status")
async def expense_status(expense_id: str, payload: dict = Body(...), user=Depends(get_current_user)):
    status = payload.get("status")
    if status not in {"Oczekuje", "Zap\u0142acona", "Zakwestionowana"}:
        raise HTTPException(status_code=400, detail="Nieprawid\u0142owy status")
    res = await db.expenses.update_one({"id": expense_id, "user_id": user["user_id"]}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Wydatek nie znaleziony")
    return await db.expenses.find_one({"id": expense_id, "user_id": user["user_id"]}, {"_id": 0})


@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, user=Depends(get_current_user)):
    res = await db.expenses.delete_one({"id": expense_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Wydatek nie znaleziony")
    await audit(user["user_id"], "expense", expense_id, "delete")
    return {"success": True}
