"""Clients (Klienci) CRUD — user scoped, with per-client invoice stats."""
from fastapi import APIRouter, Body, Depends, HTTPException

from auth import get_current_user
from db import db
from helpers import gen_id, now_iso, audit, decorate_invoice

router = APIRouter(prefix="/api/clients", tags=["clients"])


async def _client_stats(user_id: str):
    invoices = await db.invoices.find({"user_id": user_id}, {"_id": 0}).to_list(5000)
    stats = {}
    for inv in invoices:
        cid = (inv.get("buyer") or {}).get("client_id")
        if not cid:
            continue
        s = stats.setdefault(cid, {"count": 0, "revenue": 0.0})
        s["count"] += 1
        if inv.get("status") != "Anulowana":
            s["revenue"] += (inv.get("vat_summary") or {}).get("total_net", 0)
    return stats


@router.get("")
async def list_clients(user=Depends(get_current_user)):
    clients = await db.clients.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    stats = await _client_stats(user["user_id"])
    for c in clients:
        s = stats.get(c["id"], {"count": 0, "revenue": 0.0})
        c["invoice_count"] = s["count"]
        c["total_revenue"] = round(s["revenue"], 2)
    return clients


@router.post("")
async def create_client(payload: dict = Body(...), user=Depends(get_current_user)):
    doc = dict(payload)
    doc["id"] = gen_id()
    doc["user_id"] = user["user_id"]
    doc["created_at"] = now_iso()
    await db.clients.insert_one(doc)
    doc.pop("_id", None)
    await audit(user["user_id"], "client", doc["id"], "create", doc.get("name", ""))
    return doc


@router.put("/{client_id}")
async def update_client(client_id: str, payload: dict = Body(...), user=Depends(get_current_user)):
    payload.pop("id", None)
    payload.pop("user_id", None)
    res = await db.clients.update_one({"id": client_id, "user_id": user["user_id"]}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")
    return await db.clients.find_one({"id": client_id, "user_id": user["user_id"]}, {"_id": 0})


@router.delete("/{client_id}")
async def delete_client(client_id: str, user=Depends(get_current_user)):
    res = await db.clients.delete_one({"id": client_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")
    await audit(user["user_id"], "client", client_id, "delete")
    return {"success": True}


@router.get("/{client_id}/invoices")
async def client_invoices(client_id: str, user=Depends(get_current_user)):
    invoices = await db.invoices.find(
        {"user_id": user["user_id"], "buyer.client_id": client_id}, {"_id": 0}
    ).to_list(2000)
    return [decorate_invoice(i) for i in invoices]
