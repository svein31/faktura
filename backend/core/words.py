"""Convert a PLN amount to Polish words (kwota slownie).

Example: 1234.56 -> \"jeden tysiac dwiescie trzydziesci cztery zlote 56/100\"
"""
from decimal import Decimal, ROUND_HALF_UP

_JEDNOSCI = [
    "", "jeden", "dwa", "trzy", "cztery", "pi\u0119\u0107", "sze\u015b\u0107",
    "siedem", "osiem", "dziewi\u0119\u0107", "dziesi\u0119\u0107", "jedena\u015bcie",
    "dwana\u015bcie", "trzyna\u015bcie", "czterna\u015bcie", "pi\u0119tna\u015bcie",
    "szesna\u015bcie", "siedemna\u015bcie", "osiemna\u015bcie", "dziewi\u0119tna\u015bcie",
]
_DZIESIATKI = [
    "", "", "dwadzie\u015bcia", "trzydzie\u015bci", "czterdzie\u015bci",
    "pi\u0119\u0107dziesi\u0105t", "sze\u015b\u0107dziesi\u0105t", "siedemdziesi\u0105t",
    "osiemdziesi\u0105t", "dziewi\u0119\u0107dziesi\u0105t",
]
_SETKI = [
    "", "sto", "dwie\u015bcie", "trzysta", "czterysta", "pi\u0119\u0107set",
    "sze\u015b\u0107set", "siedemset", "osiemset", "dziewi\u0119\u0107set",
]
# group names: (mianownik 1, l.mnoga 2-4, dopelniacz 5+)
_GRUPY = [
    ("", "", ""),
    ("tysi\u0105c", "tysi\u0105ce", "tysi\u0119cy"),
    ("milion", "miliony", "milion\u00f3w"),
    ("miliard", "miliardy", "miliard\u00f3w"),
    ("bilion", "biliony", "bilion\u00f3w"),
]


def _forma(n: int, formy):
    if n == 1:
        return formy[0]
    j = n % 10
    d = (n % 100) // 10
    if d != 1 and j in (2, 3, 4):
        return formy[1]
    return formy[2]


def _trzycyfrowe(n: int) -> str:
    words = []
    s = n // 100
    d = (n % 100) // 10
    j = n % 10
    if s:
        words.append(_SETKI[s])
    if d == 1:
        words.append(_JEDNOSCI[10 + j])
    else:
        if d:
            words.append(_DZIESIATKI[d])
        if j:
            words.append(_JEDNOSCI[j])
    return " ".join(w for w in words if w)


def _liczba_slownie(n: int) -> str:
    if n == 0:
        return "zero"
    grupy = []
    while n > 0:
        grupy.append(n % 1000)
        n //= 1000
    parts = []
    for idx in range(len(grupy) - 1, -1, -1):
        g = grupy[idx]
        if g == 0:
            continue
        if idx == 0:
            parts.append(_trzycyfrowe(g))
        else:
            parts.append(_trzycyfrowe(g) + " " + _forma(g, _GRUPY[idx]))
    return " ".join(p for p in parts if p).strip()


def _forma_zl(n: int) -> str:
    if n == 1:
        return "z\u0142oty"
    j = n % 10
    d = (n % 100) // 10
    if d != 1 and j in (2, 3, 4):
        return "z\u0142ote"
    return "z\u0142otych"


def _forma_gr(n: int) -> str:
    if n == 1:
        return "grosz"
    j = n % 10
    d = (n % 100) // 10
    if d != 1 and j in (2, 3, 4):
        return "grosze"
    return "groszy"


def amount_in_words_pl(amount, with_grosze_word: bool = False) -> str:
    """Convert amount to Polish words.

    Default format matches the spec: \"... zlote 56/100\".
    If with_grosze_word=True, appends the grosz word: \"... 56/100 groszy\".
    """
    amt = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    zlote = int(amt)
    grosze = int((amt - Decimal(zlote)) * 100)
    slownie = _liczba_slownie(zlote)
    base = f"{slownie} {_forma_zl(zlote)} {grosze:02d}/100"
    if with_grosze_word:
        base += f" {_forma_gr(grosze)}"
    return base
