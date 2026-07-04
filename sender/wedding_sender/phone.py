"""Israeli phone-number normalization."""


def normalize_il_number(raw: str) -> str:
    """Return digits-only Israeli number in international format (972...).

    Accepts "050-1234567", "+972 50 123 4567", "9725...", or a bare
    "5X-XXXXXXX"; returns "" when there are no digits at all.
    """
    s = "".join(ch for ch in str(raw) if ch.isdigit())
    if not s:
        return ""
    if s.startswith("972"):
        return s
    if s.startswith("0"):
        return "972" + s[1:]
    return "972" + s


def is_valid_il(num: str) -> bool:
    """True for 972 followed by 8-9 digits (mobile numbers have 9)."""
    return num.startswith("972") and 11 <= len(num) <= 12 and num.isdigit()
