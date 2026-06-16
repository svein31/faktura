"""VAT computation and grouping by rate (KSeF requires grouping)."""
from decimal import Decimal, ROUND_HALF_UP

NUMERIC_RATES = {
    "23": Decimal("0.23"),
    "8": Decimal("0.08"),
    "5": Decimal("0.05"),
    "0": Decimal("0"),
}
# Special rates -> VAT is always 0
SPECIAL_RATES = {"ZW", "NP", "OO"}
_ORDER = ["23", "8", "5", "0", "ZW", "NP", "OO"]


def _d(x):
    return Decimal(str(x if x not in (None, "") else 0))


def _r(x):
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def normalize_rate(rate) -> str:
    r = str(rate).upper().replace("%", "").strip()
    return r


def enrich_items(items):
    """Return items with computed net/vat/gross values per line."""
    out = []
    for it in items:
        qty = _d(it.get("quantity", 0))
        price = _d(it.get("unit_price_net", 0))
        rate = normalize_rate(it.get("vat_rate", "23"))
        net = _r(qty * price)
        if rate in NUMERIC_RATES:
            vat = _r(net * NUMERIC_RATES[rate])
        else:
            vat = Decimal("0.00")
        gross = _r(net + vat)
        enriched = dict(it)
        enriched.update({
            "vat_rate": rate,
            "net": float(net),
            "vat": float(vat),
            "gross": float(gross),
        })
        out.append(enriched)
    return out


def calculate_vat_groups(items):
    """Group items by VAT rate and compute totals.

    Returns dict with 'groups', totals, and 'mpp_required'.
    """
    group_net = {}
    for it in items:
        qty = _d(it.get("quantity", 0))
        price = _d(it.get("unit_price_net", 0))
        rate = normalize_rate(it.get("vat_rate", "23"))
        net = _r(qty * price)
        group_net.setdefault(rate, Decimal("0"))
        group_net[rate] += net

    groups = []
    total_net = total_vat = total_gross = Decimal("0")
    for rate in sorted(group_net.keys(), key=lambda r: _ORDER.index(r) if r in _ORDER else 99):
        net = _r(group_net[rate])
        if rate in NUMERIC_RATES:
            vat = _r(net * NUMERIC_RATES[rate])
        else:
            vat = Decimal("0.00")
        gross = _r(net + vat)
        groups.append({
            "rate": rate,
            "net": float(net),
            "vat": float(vat),
            "gross": float(gross),
        })
        total_net += net
        total_vat += vat
        total_gross += gross

    return {
        "groups": groups,
        "total_net": float(_r(total_net)),
        "total_vat": float(_r(total_vat)),
        "total_gross": float(_r(total_gross)),
        "mpp_required": float(_r(total_gross)) > 15000.0,
    }
