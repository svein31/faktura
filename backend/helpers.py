"""Shared backend helpers: ids, audit, counters, invoice computations."""
import uuid
from datetime import datetime, timezone, date

from pymongo import ReturnDocument

from db import db
from core.vat import enrich_items, calculate_vat_groups
from core.numbering import generate_invoice_number
from core.words import amount_in_words_pl

ISSUED_STATUSES = {"Wystawiona", "Wys\u0142ana", "Zap\u0142acona", "Przeterminowana"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id() -> str:
    return str(uuid.uuid4())


async def audit(user_id: str, entity_type: str, entity_id: str, action: str, detail: str = ""):
    await db.audit_events.insert_one({
        "id": gen_id(),
        "user_id": user_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "detail": detail,
        "at": now_iso(),
    })


async def next_invoice_counter(user_id: str, company_id: str, year: int, month: int, reset_type: str = "monthly") -> int:
    if reset_type == "yearly":
        key = f"{user_id}:{company_id}:{year}"
    else:
        key = f"{user_id}:{company_id}:{year}-{month:02d}"
    res = await db.counters.find_one_and_update(
        {"_id": key},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return res["seq"]


def effective_status(inv: dict) -> str:
    status = inv.get("status")
    due = inv.get("due_date")
    if status in ("Wystawiona", "Wys\u0142ana") and due:
        try:
            d = datetime.strptime(str(due)[:10], "%Y-%m-%d").date()
            if d < date.today():
                return "Przeterminowana"
        except Exception:
            pass
    return status


def decorate_invoice(inv: dict) -> dict:
    inv = dict(inv)
    inv.pop("_id", None)
    inv["effective_status"] = effective_status(inv)
    return inv


async def build_invoice_doc(user_id: str, payload: dict, company: dict, existing: dict = None) -> dict:
    """Create or recompute an invoice document from a payload."""
    items = enrich_items(payload.get("items", []))
    vat = calculate_vat_groups(items)

    issue_date = payload.get("issue_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    dt = datetime.strptime(str(issue_date)[:10], "%Y-%m-%d")

    if existing and existing.get("number"):
        number = payload.get("number") or existing["number"]
    else:
        user_settings = await db.settings.find_one({"user_id": user_id}, {"_id": 0}) or {}
        scheme = user_settings.get("invoice_scheme") or company.get("invoice_scheme") or "FV/{YYYY}/{MM}/{NNN}"
        if payload.get("number"):
            number = payload["number"]
        else:
            reset_type = user_settings.get("counter_reset", "monthly")
            counter = await next_invoice_counter(user_id, company["id"], dt.year, dt.month, reset_type)
            number = generate_invoice_number(scheme, dt.year, dt.month, counter, payload.get("invoice_type", "FV"))

    seller_snapshot = {
        "name": company.get("name", ""),
        "short_name": company.get("short_name", ""),
        "nip": company.get("nip", ""),
        "address": {
            "street": company.get("street", company.get("address", {}).get("street", "")) if isinstance(company.get("address"), dict) else company.get("street", ""),
            "postal_code": company.get("postal_code", ""),
            "city": company.get("city", ""),
            "country_code": company.get("country_code", "PL"),
        },
        "bank_accounts": company.get("bank_accounts", []),
    }

    doc = {
        "id": existing["id"] if existing else gen_id(),
        "user_id": user_id,
        "company_id": company["id"],
        "number": number,
        "invoice_type": payload.get("invoice_type", "FV"),
        "issue_date": issue_date,
        "sale_date": payload.get("sale_date", issue_date),
        "due_date": payload.get("due_date"),
        "payment_days": payload.get("payment_days", 14),
        "payment_method": payload.get("payment_method", "Przelew"),
        "currency": payload.get("currency", "PLN"),
        "exchange_rate": payload.get("exchange_rate", 1),
        "seller_snapshot": seller_snapshot,
        "buyer": payload.get("buyer", {}),
        "items": items,
        "vat_summary": vat,
        "amount_in_words": amount_in_words_pl(vat["total_gross"]),
        "mpp": bool(payload.get("mpp")) or vat["mpp_required"],
        "paragon": bool(payload.get("paragon")),
        "paragon_number": payload.get("paragon_number", ""),
        "po_number": payload.get("po_number", ""),
        "delivery_method": payload.get("delivery_method", ""),
        "notes": payload.get("notes", ""),
        "status": payload.get("status", existing["status"] if existing else "Szkic"),
        "ksef": existing.get("ksef") if existing else None,
        "ksef_last_error": existing.get("ksef_last_error") if existing else None,
        "created_at": existing["created_at"] if existing else now_iso(),
    }
    return doc
