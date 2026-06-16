"""User settings (per-user single document)."""
from fastapi import APIRouter, Body, Depends

from auth import get_current_user
from db import db

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULTS = {
    "theme": "light", "language": "pl", "base_currency": "PLN", "tax_year": 2024,
    "invoice_scheme": "FV/{YYYY}/{MM}/{NNN}", "counter_reset": "monthly",
    "email_template": "Dzie\u0144 dobry,\n\nW za\u0142\u0105czeniu faktura {numer}.\n\nPozdrawiam",
    "ksef_token": "", "ksef_env": "test", "default_payment_days": 14, "default_payment_method": "Przelew",
}


@router.get("")
async def get_settings(user=Depends(get_current_user)):
    doc = await db.settings.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        doc = {"user_id": user["user_id"], **DEFAULTS}
        await db.settings.insert_one(dict(doc))
    return doc


@router.put("")
async def update_settings(payload: dict = Body(...), user=Depends(get_current_user)):
    payload.pop("user_id", None)
    await db.settings.update_one({"user_id": user["user_id"]}, {"$set": payload}, upsert=True)
    return await db.settings.find_one({"user_id": user["user_id"]}, {"_id": 0})
