"""Dashboard aggregations (KPIs, charts, lists)."""
from datetime import datetime, timezone, date, timedelta

from fastapi import APIRouter, Depends

from auth import get_current_user
from db import db
from helpers import effective_status

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

NON_REVENUE = {"Anulowana", "Szkic"}


def _month_key(d: str):
    return str(d)[:7]


@router.get("/summary")
async def dashboard_summary(user=Depends(get_current_user)):
    invoices = await db.invoices.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    clients = await db.clients.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(2000)
    client_map = {c["id"]: c["name"] for c in clients}

    today = datetime.now(timezone.utc).date()
    cur_month = today.strftime("%Y-%m")

    # KPIs current month
    revenue_month = sum((i.get("vat_summary") or {}).get("total_net", 0) for i in invoices
                        if i.get("status") not in NON_REVENUE and _month_key(i.get("issue_date", "")) == cur_month)
    vat_sales_month = sum((i.get("vat_summary") or {}).get("total_vat", 0) for i in invoices
                          if i.get("status") not in NON_REVENUE and _month_key(i.get("issue_date", "")) == cur_month)
    expenses_month = sum((e.get("vat_summary") or {}).get("total_net", 0) for e in expenses
                         if _month_key(e.get("issue_date", "")) == cur_month)
    vat_expense_month = sum((e.get("vat_summary") or {}).get("total_vat", 0) * (e.get("vat_deduction", 100) / 100.0)
                            for e in expenses if _month_key(e.get("issue_date", "")) == cur_month)

    kpis = {
        "revenue_month": round(revenue_month, 2),
        "expenses_month": round(expenses_month, 2),
        "vat_to_pay": round(vat_sales_month - vat_expense_month, 2),
        "net_profit": round(revenue_month - expenses_month, 2),
    }

    # Bars: last 6 months
    bars = []
    base = today.replace(day=1)
    for k in range(5, -1, -1):
        y = base.year
        m = base.month - k
        while m <= 0:
            m += 12
            y -= 1
        mk = f"{y}-{m:02d}"
        rev = sum((i.get("vat_summary") or {}).get("total_net", 0) for i in invoices
                  if i.get("status") not in NON_REVENUE and _month_key(i.get("issue_date", "")) == mk)
        exp = sum((e.get("vat_summary") or {}).get("total_net", 0) for e in expenses
                  if _month_key(e.get("issue_date", "")) == mk)
        bars.append({"month": mk, "label": f"{m:02d}/{str(y)[2:]}", "revenue": round(rev, 2), "expenses": round(exp, 2)})

    # Revenue pie by client
    rev_by_client = {}
    for i in invoices:
        if i.get("status") in NON_REVENUE:
            continue
        cid = (i.get("buyer") or {}).get("client_id")
        name = client_map.get(cid) or (i.get("buyer") or {}).get("name", "Inny")
        rev_by_client[name] = rev_by_client.get(name, 0) + (i.get("vat_summary") or {}).get("total_net", 0)
    revenue_pie = sorted([{"label": k, "value": round(v, 2)} for k, v in rev_by_client.items()], key=lambda x: -x["value"])[:6]

    # Expense pie by category
    exp_by_cat = {}
    for e in expenses:
        cat = e.get("category", "Inne")
        exp_by_cat[cat] = exp_by_cat.get(cat, 0) + (e.get("vat_summary") or {}).get("total_net", 0)
    expense_pie = sorted([{"label": k, "value": round(v, 2)} for k, v in exp_by_cat.items()], key=lambda x: -x["value"])

    # Recent invoices (5)
    recent = sorted(invoices, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    recent_invoices = [{
        "id": i["id"], "number": i.get("number"), "client": (i.get("buyer") or {}).get("name", ""),
        "gross": (i.get("vat_summary") or {}).get("total_gross", 0), "status": effective_status(i),
        "currency": i.get("currency", "PLN"),
    } for i in recent]

    # Top 3 clients by revenue
    top_clients = sorted([{"name": k, "revenue": round(v, 2)} for k, v in rev_by_client.items()], key=lambda x: -x["revenue"])[:3]

    # Overdue invoices
    overdue = []
    upcoming = []
    for i in invoices:
        es = effective_status(i)
        due = i.get("due_date")
        entry = {"id": i["id"], "number": i.get("number"), "client": (i.get("buyer") or {}).get("name", ""),
                 "gross": (i.get("vat_summary") or {}).get("total_gross", 0), "due_date": due, "currency": i.get("currency", "PLN")}
        if es == "Przeterminowana":
            overdue.append(entry)
        elif es in ("Wystawiona", "Wys\u0142ana") and due:
            try:
                dd = datetime.strptime(str(due)[:10], "%Y-%m-%d").date()
                if today <= dd <= today + timedelta(days=7):
                    upcoming.append(entry)
            except Exception:
                pass

    # Financial health: revenue vs expenses ratio (0-100 score)
    total_rev = sum((i.get("vat_summary") or {}).get("total_net", 0) for i in invoices if i.get("status") not in NON_REVENUE)
    total_exp = sum((e.get("vat_summary") or {}).get("total_net", 0) for e in expenses)
    if total_rev + total_exp == 0:
        score = 50
    else:
        score = round(100 * total_rev / (total_rev + total_exp))
    health = {"score": score, "total_revenue": round(total_rev, 2), "total_expenses": round(total_exp, 2)}

    return {
        "kpis": kpis, "bars": bars, "revenue_pie": revenue_pie, "expense_pie": expense_pie,
        "recent_invoices": recent_invoices, "top_clients": top_clients,
        "overdue_invoices": overdue, "upcoming_payments": upcoming, "health": health,
    }
