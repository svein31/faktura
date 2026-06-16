"""Generate a KSeF FA(2)-flavoured XML document for an invoice.

This produces a schema-aligned structure (Naglowek / Podmiot1 / Podmiot2 / Fa)
so that swapping to the real KSeF API later only requires schema validation.
"""
import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime, timezone

NS = "http://crd.gov.pl/wzor/2023/06/29/12648/"


def _sub(parent, tag, text=None):
    el = ET.SubElement(parent, tag)
    if text is not None:
        el.text = str(text)
    return el


def _addr(parent, tag, data):
    adres = ET.SubElement(parent, tag)
    _sub(adres, "KodKraju", (data or {}).get("country_code", "PL"))
    line = " ".join(filter(None, [
        (data or {}).get("street", ""),
        (data or {}).get("building", ""),
    ]))
    _sub(adres, "AdresL1", line or (data or {}).get("street", ""))
    _sub(adres, "AdresL2", f"{(data or {}).get('postal_code','')} {(data or {}).get('city','')}".strip())
    return adres


def generate_fa_xml(invoice: dict, seller: dict, buyer: dict, vat_summary: dict) -> str:
    root = ET.Element("Faktura", {"xmlns": NS})

    # --- Naglowek ---
    nag = _sub(root, "Naglowek")
    kod = _sub(nag, "KodFormularza", "FA")
    kod.set("kodSystemowy", "FA (2)")
    kod.set("wersjaSchemy", "1-0E")
    _sub(nag, "WariantFormularza", "2")
    _sub(nag, "DataWytworzeniaFa", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    _sub(nag, "SystemInfo", "Faktura KSeF App")

    # --- Podmiot1 (Sprzedawca) ---
    p1 = _sub(root, "Podmiot1")
    di1 = _sub(p1, "DaneIdentyfikacyjne")
    _sub(di1, "NIP", (seller.get("nip", "") or "").replace("-", "").replace(" ", ""))
    _sub(di1, "Nazwa", seller.get("name", ""))
    _addr(p1, "Adres", seller.get("address", seller))

    # --- Podmiot2 (Nabywca) ---
    p2 = _sub(root, "Podmiot2")
    di2 = _sub(p2, "DaneIdentyfikacyjne")
    nip2 = (buyer.get("nip", "") or "").replace("-", "").replace(" ", "")
    if nip2:
        _sub(di2, "NIP", nip2)
    _sub(di2, "Nazwa", buyer.get("name", ""))
    _addr(p2, "Adres", buyer.get("address", buyer))

    # --- Fa ---
    fa = _sub(root, "Fa")
    _sub(fa, "KodWaluty", invoice.get("currency", "PLN"))
    _sub(fa, "P_1", invoice.get("issue_date", ""))
    _sub(fa, "P_2", invoice.get("number", ""))
    _sub(fa, "P_6", invoice.get("sale_date", invoice.get("issue_date", "")))

    # VAT summary fields per rate (P_13_x net, P_14_x vat)
    rate_field = {"23": "1", "8": "2", "5": "3", "0": "6_3"}
    for g in vat_summary.get("groups", []):
        suffix = rate_field.get(g["rate"])
        if suffix:
            _sub(fa, f"P_13_{suffix}", f"{g['net']:.2f}")
            if g["rate"] in ("23", "8", "5"):
                _sub(fa, f"P_14_{suffix}", f"{g['vat']:.2f}")
    _sub(fa, "P_15", f"{vat_summary.get('total_gross', 0):.2f}")

    adn = _sub(fa, "Adnotacje")
    _sub(adn, "P_16", "2")  # metoda kasowa: nie
    _sub(adn, "P_17", "2")  # samofakturowanie: nie
    _sub(adn, "P_18", "1" if vat_summary.get("mpp_required") else "2")  # MPP
    _sub(adn, "P_19", "2")

    _sub(fa, "RodzajFaktury", _rodzaj(invoice.get("invoice_type", "FV")))

    # Line items
    for idx, it in enumerate(invoice.get("items", []), start=1):
        w = _sub(fa, "FaWiersz")
        _sub(w, "NrWierszaFa", idx)
        _sub(w, "P_7", it.get("name", ""))
        _sub(w, "P_8A", it.get("unit", "szt."))
        _sub(w, "P_8B", str(it.get("quantity", 0)))
        _sub(w, "P_9A", f"{float(it.get('unit_price_net', 0)):.2f}")
        _sub(w, "P_11", f"{float(it.get('net', 0)):.2f}")
        _sub(w, "P_12", str(it.get("vat_rate", "23")))

    rough = ET.tostring(root, encoding="utf-8")
    pretty = minidom.parseString(rough).toprettyxml(indent="  ", encoding="utf-8")
    return pretty.decode("utf-8")


def _rodzaj(invoice_type: str) -> str:
    return {
        "FV": "VAT",
        "FVKOR": "KOR",
        "PRO": "VAT",
        "FZA": "ZAL",
    }.get(invoice_type, "VAT")
