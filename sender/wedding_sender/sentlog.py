"""Append-only log of sent messages — powers resume and the Sheet import.

Format (the Apps Script import dialog understands this exactly):
    id,phone,kind,sent_at
    ab12cd34ef,972501234567,invite,2026-07-04 18:32:11
"""

from __future__ import annotations

import csv
import time
from pathlib import Path

from .guests import Guest

HEADER = ["id", "phone", "kind", "sent_at"]


class SentLog:
    def __init__(self, path: Path | str):
        self.path = Path(path)
        self._sent: set[tuple[str, str]] = set()
        if self.path.exists():
            with open(self.path, newline="", encoding="utf-8-sig") as f:
                for row in csv.reader(f):
                    if len(row) >= 3 and row[0] and row[0] != "id":
                        self._sent.add((row[0], row[2]))

    def is_sent(self, guest: Guest) -> bool:
        """Was this exact message (same guest, same kind/round) already sent?"""
        return (guest.id, guest.kind) in self._sent

    def mark(self, guest: Guest) -> None:
        """Record a send; flushed per row so a crash never loses progress."""
        new_file = not self.path.exists()
        with open(self.path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if new_file:
                writer.writerow(HEADER)
            writer.writerow(
                [guest.id, guest.phone, guest.kind, time.strftime("%Y-%m-%d %H:%M:%S")]
            )
            f.flush()
        self._sent.add((guest.id, guest.kind))
