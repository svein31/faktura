"""Polish NIP (tax id) validation using the official checksum algorithm."""
import re

NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7]


def clean_nip(nip: str) -> str:
    """Strip everything except digits."""
    return re.sub(r"\D", "", str(nip or ""))


def validate_nip(nip: str) -> bool:
    """Return True if the given NIP is structurally valid (10 digits + checksum)."""
    digits = clean_nip(nip)
    if len(digits) != 10:
        return False
    if digits == digits[0] * 10:
        return False
    checksum = sum(int(digits[i]) * NIP_WEIGHTS[i] for i in range(9)) % 11
    if checksum == 10:
        return False
    return checksum == int(digits[9])


def format_nip(nip: str) -> str:
    """Format a 10-digit NIP as XXX-XXX-XX-XX (best effort)."""
    d = clean_nip(nip)
    if len(d) != 10:
        return nip
    return f"{d[0:3]}-{d[3:6]}-{d[6:8]}-{d[8:10]}"
