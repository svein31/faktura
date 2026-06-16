"""Reports: revenue, VAT (JPK-V7 helper), costs, accountant ledger."""
from datetime import datetime

from fastapi import APIRouter, Depends

from auth import get_current_user
from db import db

router = APIRouter(prefix="/api/reports", tags=["reports"])

NON_REVENUE = {"Anulowana", "Szkic"}
MONTHS_PL = ["Stycze\u0144", "Luty", "Marzec", "Kwiecie\u0144", "Maj", "Czerwiec", "Lipiec", "Sierpie\u0144", "Wrzesie\u0144", "Pa\u017adziernik", "Listopad", "Grudzie\u0144"]


def _y(d):
    return str(d)[:4]


def _m(d):
    try:
        return int(str(d)[5:7])
    except Exception:
        return 0


@router.get("/revenue")
async def revenue_report(year: int = None, user=Depends(get_current_user)):
    year = year or datetime.now().year
    invoices = await db.invoices.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    rows = []
    for m in range(1, 13):
        net = vat = gross = 0.0
        count = 0
        for i in invoices:
            if i.get("status") in NON_REVENUE:
                continue
            if _y(i.get("issue_date", "")) == str(year) and _m(i.get("issue_date", "")) == m:
                vs = i.get("vat_summary") or {}
                net += vs.get("total_net") or 0.0; vat += vs.get("total_vat") or 0.0; gross += vs.get("total_gross") or 0.0
                count += 1
        rows.append({"month": m, "month_name": MONTHS_PL[m - 1], "net": round(net, 2), "vat": round(vat, 2), "gross": round(gross, 2), "count": count})
    totals = {
        "net": round(sum(r["net"] for r in rows), 2),
        "vat": round(sum(r["vat"] for r in rows), 2),
        "gross": round(sum(r["gross"] for r in rows), 2),
        "count": sum(r["count"] for r in rows),
    }
    return {"year": year, "rows": rows, "totals": totals}


@router.get("/vat")
async def vat_report(year: int = None, month: int = None, user=Depends(get_current_user)):
    now = datetime.now()
    year = year or now.year
    month = month or now.month
    invoices = await db.invoices.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)

    sales = {}
    for i in invoices:
        if i.get("status") in NON_REVENUE:
            continue
        if _y(i.get("issue_date", "")) == str(year) and _m(i.get("issue_date", "")) == month:
            for g in (i.get("vat_summary") or {}).get("groups", []):
                s = sales.setdefault(g["rate"], {"rate": g["rate"], "net": 0.0, "vat": 0.0})
                s["net"] += g.get("net") or 0.0; s["vat"] += g.get("vat") or 0.0

    purchases = {}
    for e in expenses:
        if _y(e.get("issue_date", "")) == str(year) and _m(e.get("issue_date", "")) == month:
            ded = e.get("vat_deduction", 100) / 100.0
            for g in (e.get("vat_summary") or {}).get("groups", []):
                p = purchases.setdefault(g["rate"], {"rate": g["rate"], "net": 0.0, "vat": 0.0})
                p["net"] += g.get("net") or 0.0; p["vat"] += (g.get("vat") or 0.0) * ded

    sales_rows = [{"rate": k, "net": round(v["net"], 2), "vat": round(v["vat"], 2)} for k, v in sales.items()]
    purchase_rows = [{"rate": k, "net": round(v["net"], 2), "vat": round(v["vat"], 2)} for k, v in purchases.items()]
    vat_due = round(sum(r["vat"] for r in sales_rows), 2)
    vat_deductible = round(sum(r["vat"] for r in purchase_rows), 2)
    balance = round(vat_due - vat_deductible, 2)
    return {
        "year": year, "month": month, "month_name": MONTHS_PL[month - 1],
        "sales": sales_rows, "purchases": purchase_rows,
        "vat_due": vat_due, "vat_deductible": vat_deductible,
        "balance": balance, "to_pay": max(balance, 0), "to_refund": max(-balance, 0),
    }


@router.get("/costs")
async def costs_report(year: int = None, user=Depends(get_current_user)):
    year = year or datetime.now().year
    expenses = await db.expenses.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    by_cat = {}
    by_month = [0.0] * 12
    for e in expenses:
        if _y(e.get("issue_date", "")) != str(year):
            continue
        net = (e.get("vat_summary") or {}).get("total_net") or 0.0
        cat = e.get("category", "Inne")
        by_cat[cat] = by_cat.get(cat, 0) + net
        mi = _m(e.get("issue_date", ""))
        if 1 <= mi <= 12:
            by_month[mi - 1] += net
    categories = sorted([{"category": k, "net": round(v, 2)} for k, v in by_cat.items()], key=lambda x: -x["net"])
    trend = [{"month": m + 1, "month_name": MONTHS_PL[m], "net": round(by_month[m], 2)} for m in range(12)]
    return {"year": year, "categories": categories, "trend": trend, "total": round(sum(by_cat.values()), 2)}


@router.get("/ledger")
async def ledger_report(year: int = None, month: int = None, user=Depends(get_current_user)):
    invoices = await db.invoices.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)

    def match(d):
        if year and _y(d) != str(year):
            return False
        if month and _m(d) != month:
            return False
        return True

    sales = [{
        "number": i.get("number"), "date": i.get("issue_date"), "client": (i.get("buyer") or {}).get("name", ""),
        "net": (i.get("vat_summary") or {}).get("total_net") or 0.0, "vat": (i.get("vat_summary") or {}).get("total_vat") or 0.0,
        "gross": (i.get("vat_summary") or {}).get("total_gross") or 0.0, "status": i.get("status"),
    } for i in invoices if i.get("status") not in NON_REVENUE and match(i.get("issue_date", ""))]

    costs = [{
        "number": e.get("supplier_number"), "date": e.get("issue_date"), "supplier": (e.get("supplier") or {}).get("name", ""),
        "category": e.get("category"), "net": (e.get("vat_summary") or {}).get("total_net") or 0.0,
        "vat": (e.get("vat_summary") or {}).get("total_vat") or 0.0, "gross": (e.get("vat_summary") or {}).get("total_gross") or 0.0,
    } for e in expenses if match(e.get("issue_date", ""))]

    return {"year": year, "month": month, "sales": sales, "costs": costs}


@router.get("/export")
async def export_all(user=Depends(get_current_user)):
    """Full data export for the user (JSON backup)."""
    data = {}
    for coll in ("companies", "clients", "invoices", "expenses", "templates", "settings"):
        data[coll] = await db[coll].find({"user_id": user["user_id"]}, {"_id": 0}).to_list(10000)
    return data
