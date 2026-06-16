"""Invoice number generation based on a configurable scheme.

Supported placeholders:
  {YYYY} -> 4-digit year, {YY} -> 2-digit year
  {MM}   -> 2-digit month, {M} -> month
  {N}, {NN}, {NNN}, {NNNN}, {NNNNN} -> zero padded counter (width = number of N)
  {TYPE} -> document type code (FV/FVKOR/PRO/FZA)
"""
import re


def generate_invoice_number(scheme: str, year: int, month: int, counter: int, doc_type: str = "FV") -> str:
    scheme = scheme or "FV/{YYYY}/{MM}/{NNN}"
    result = scheme
    result = result.replace("{YYYY}", str(year))
    result = result.replace("{YY}", str(year)[-2:])
    result = result.replace("{MM}", f"{int(month):02d}")
    result = result.replace("{M}", str(int(month)))
    result = result.replace("{TYPE}", doc_type)

    def repl(match):
        width = len(match.group(1))
        return str(counter).zfill(width)

    result = re.sub(r"\{(N+)\}", repl, result)
    return result


def preview_scheme(scheme: str) -> str:
    """Return an example invoice number for UI preview."""
    from datetime import date
    today = date.today()
    return generate_invoice_number(scheme, today.year, today.month, 1)
