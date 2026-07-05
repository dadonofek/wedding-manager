"""wedding-sender CLI.

    wedding-sender invite   --csv invites.csv            # dry run (default)
    wedding-sender invite   --csv invites.csv --live     # actually send
    wedding-sender reminder --csv reminders.csv --live

Dry run is the default on purpose — always inspect the plan before --live.
Every real send is appended to sent_log.csv; rerunning skips those rows, and
the same file is pasted back into the Google Sheet (menu: ייבוא לוג שליחה).
"""

from __future__ import annotations

import argparse
import random
import re
import subprocess
import sys
import time
from pathlib import Path

from .desktop import FocusLostError, send_via_whatsapp_desktop
from .guests import Guest, load_guests
from .sentlog import SentLog
from .templates import (
    TemplateError,
    default_template_path,
    load_template,
    render_message,
)

_KIND_RE = {
    "invite": re.compile(r"^invite$"),
    "reminder": re.compile(r"^reminder_\d+$"),
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="wedding-sender",
        description="Send wedding WhatsApp messages via WhatsApp Desktop (macOS).",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    for kind, help_text in (
        ("invite", "send the initial invitation"),
        ("reminder", "send an RSVP reminder"),
    ):
        p = sub.add_parser(kind, help=help_text)
        p.add_argument("--csv", type=Path, required=True,
                       help="CSV exported from the Google Sheet (id,name,phone,link,kind)")
        p.add_argument("--template", type=Path, default=None,
                       help="message template file (default: built-in Hebrew template)")
        p.add_argument("--sent-log", type=Path, default=Path("sent_log.csv"),
                       help="sent log for resume + Sheet import (default: ./sent_log.csv)")
        p.add_argument("--live", action="store_true",
                       help="actually send (without this flag: dry run)")
        p.add_argument("--image", type=Path, default=None,
                       help="attach this image (.png/.jpg); the message becomes its caption")
        p.add_argument("--attach-delay", type=float, default=1.5,
                       help="seconds to let the media preview open after pasting the image")
        p.add_argument("--limit", type=int, default=None,
                       help="send at most N messages (pilot batches)")
        p.add_argument("--min-delay", type=float, default=20.0,
                       help="min seconds between sends (default 20)")
        p.add_argument("--max-delay", type=float, default=45.0,
                       help="max seconds between sends (default 45)")
        p.add_argument("--chat-load-delay", type=float, default=2.5,
                       help="seconds to let the chat open before pressing Return")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    kind = args.command

    try:
        template = load_template(args.template or default_template_path(kind))
    except (TemplateError, OSError) as e:
        print(f"Template error: {e}", file=sys.stderr)
        return 2

    if args.image is not None:
        if not args.image.is_file():
            print(f"Image error: {args.image} does not exist", file=sys.stderr)
            return 2
        if args.image.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            print(f"Image error: unsupported extension {args.image.suffix!r} "
                  "(use .png/.jpg/.jpeg)", file=sys.stderr)
            return 2

    try:
        guests, warnings = load_guests(args.csv)
    except (OSError, ValueError) as e:
        print(f"CSV error: {e}", file=sys.stderr)
        return 2
    for w in warnings:
        print(f"  ! {w}")

    kind_re = _KIND_RE[kind]
    matched = []
    for g in guests:
        if kind_re.match(g.kind):
            matched.append(g)
        else:
            print(f"  ! {g.name or g.id}: kind {g.kind!r} does not match "
                  f"'{kind}' — skipped (wrong export file?)")

    log = SentLog(args.sent_log)
    pending = [g for g in matched if not log.is_sent(g)]
    already = len(matched) - len(pending)
    if args.limit is not None:
        pending = pending[: max(args.limit, 0)]

    print(f"Loaded {len(guests)} guests: {len(matched)} {kind} rows, "
          f"{already} already sent, {len(pending)} to send.")
    if not pending:
        print("Nothing to send.")
        return 0

    attach_note = f" with image {args.image.name}" if args.image else ""
    if not args.live:
        print("--- DRY RUN (no messages will be sent; use --live to send) ---")
        if args.image:
            print(f"--- image attachment: {args.image} (message sent as its caption)")
        print("--- first message preview " + "-" * 34)
        print(render_message(template, pending[0]))
        print("-" * 60)
        for i, g in enumerate(pending, 1):
            print(f"[{i}/{len(pending)}] {g.name or '?'} → {g.phone} ({g.kind}) "
                  f"→ would send{attach_note}")
        return 0

    if sys.platform != "darwin":
        print("--live only works on macOS with WhatsApp Desktop installed.",
              file=sys.stderr)
        return 2

    failures: list[Guest] = []
    aborted = False
    for i, g in enumerate(pending, 1):
        print(f"[{i}/{len(pending)}] {g.name or '?'} → {g.phone}", end=" ", flush=True)
        try:
            send_via_whatsapp_desktop(
                g.phone, render_message(template, g),
                chat_load_delay=args.chat_load_delay,
                image=args.image, attach_delay=args.attach_delay,
            )
            log.mark(g)
            print("✓ sent")
        except FocusLostError as e:
            print(f"✗ focus lost: {e}")
            print("Stopping so keystrokes don't land in the wrong app. "
                  "Fix and rerun — sent rows are skipped automatically.")
            aborted = True
            break
        except subprocess.CalledProcessError as e:
            print(f"✗ failed: {(e.stderr or '').strip() or e}")
            failures.append(g)

        if i < len(pending):
            pause = random.uniform(args.min_delay, args.max_delay)
            print(f"    sleeping {pause:.0f}s")
            time.sleep(pause)

    print("\nDone." if not aborted else "\nAborted.")
    if failures:
        print(f"Failed ({len(failures)}):")
        for g in failures:
            print(f"  {g.name or '?'} {g.phone}")
    if aborted or failures:
        return 1
    print(f"Now import {args.sent_log} back into the Sheet "
          "(menu: ייבוא לוג שליחה) to update statuses.")
    return 0



if __name__ == "__main__":
    sys.exit(main())
