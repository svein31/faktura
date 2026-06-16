"""Companies (Moje Firmy) CRUD — user scoped."""
from fastapi import APIRouter, Body, Depends, HTTPException

from auth import get_current_user
from db import db
from helpers import gen_id, now_iso, audit

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("")
async def list_companies(user=Depends(get_current_user)):
    return await db.companies.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@router.post("")
async def create_company(payload: dict = Body(...), user=Depends(get_current_user)):
    doc = dict(payload)
    doc["id"] = gen_id()
    doc["user_id"] = user["user_id"]
    doc["created_at"] = now_iso()
    doc.setdefault("is_active", False)
    # First company becomes active automatically
    count = await db.companies.count_documents({"user_id": user["user_id"]})
    if count == 0:
        doc["is_active"] = True
    await db.companies.insert_one(doc)
    doc.pop("_id", None)
    await audit(user["user_id"], "company", doc["id"], "create", doc.get("name", ""))
    return doc


@router.put("/{company_id}")
async def update_company(company_id: str, payload: dict = Body(...), user=Depends(get_current_user)):
    payload.pop("id", None)
    payload.pop("user_id", None)
    res = await db.companies.update_one({"id": company_id, "user_id": user["user_id"]}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Firma nie znaleziona")
    doc = await db.companies.find_one({"id": company_id, "user_id": user["user_id"]}, {"_id": 0})
    return doc


@router.post("/{company_id}/activate")
async def activate_company(company_id: str, user=Depends(get_current_user)):
    company = await db.companies.find_one({"id": company_id, "user_id": user["user_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Firma nie znaleziona")
    await db.companies.update_many({"user_id": user["user_id"]}, {"$set": {"is_active": False}})
    await db.companies.update_one({"id": company_id, "user_id": user["user_id"]}, {"$set": {"is_active": True}})
    return {"success": True, "active_company_id": company_id}


@router.delete("/{company_id}")
async def delete_company(company_id: str, user=Depends(get_current_user)):
    res = await db.companies.delete_one({"id": company_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Firma nie znaleziona")
    await audit(user["user_id"], "company", company_id, "delete")
    return {"success": True}
