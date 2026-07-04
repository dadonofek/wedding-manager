"""Load the guest CSV exported from the Google Sheet."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from .phone import is_valid_il, normalize_il_number

REQUIRED_COLUMNS = {"id", "name", "phone", "link", "kind"}


@dataclass(frozen=True)
class Guest:
    id: str
    name: str
    phone: str  # normalized, e.g. 972501234567
    link: str
    kind: str  # 'invite' or 'reminder_<n>'


def load_guests(path: Path | str) -> tuple[list[Guest], list[str]]:
    """Read the export CSV; return (guests, warnings).

    Rows with a missing id/phone/link, an invalid phone, or a phone already
    seen earlier in the file are skipped with a human-readable warning.
    utf-8-sig handles the BOM the Sheet export adds for Excel.
    """
    guests: list[Guest] = []
    warnings: list[str] = []
    seen_phones: set[str] = set()

    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        columns = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - columns
        if missing:
            raise ValueError(
                f"{path}: missing column(s) {sorted(missing)}; "
                f"expected header id,name,phone,link,kind"
            )

        for line_no, row in enumerate(reader, start=2):
            gid = (row.get("id") or "").strip()
            name = (row.get("name") or "").strip()
            raw_phone = (row.get("phone") or "").strip()
            link = (row.get("link") or "").strip()
            kind = (row.get("kind") or "").strip()

            if not gid or not raw_phone or not link:
                warnings.append(f"line {line_no}: missing id/phone/link — skipped")
                continue

            phone = normalize_il_number(raw_phone)
            if not is_valid_il(phone):
                warnings.append(f"line {line_no}: invalid phone {raw_phone!r} — skipped")
                continue
            if phone in seen_phones:
                warnings.append(f"line {line_no}: duplicate phone {phone} — skipped")
                continue

            seen_phones.add(phone)
            guests.append(Guest(id=gid, name=name, phone=phone, link=link, kind=kind))

    return guests, warnings
