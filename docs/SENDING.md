# Sending guide (macOS + WhatsApp Desktop)

The sender is a small Python CLI that drives the **WhatsApp Desktop app on
your Mac**: it opens each guest's chat with the message prefilled
(`whatsapp://` URL scheme) and presses Return for you — after verifying that
WhatsApp really is the frontmost app, so a stray keystroke can never land in
another window. No WhatsApp Business API, no fees.

## One-time setup

1. **WhatsApp Desktop** installed and logged in (from the App Store).
2. **Accessibility permission** for your terminal:
   System Settings → Privacy & Security → Accessibility → enable
   Terminal (or iTerm2). This is what allows the scripted Return keypress.
3. Install the sender (Python ≥ 3.10):
   ```bash
   pip install ./sender          # from the repo root
   # or: pipx install ./sender
   ```

## The sending loop

```bash
# 1. In the Sheet: menu 💍 חתונה → "ייצוא הזמנות לשליחה" → download invites.csv

# 2. ALWAYS dry-run first — prints the exact message and the send plan:
wedding-sender invite --csv invites.csv

# 3. Pilot with your closest 2-3 guests:
wedding-sender invite --csv invites.csv --live --limit 3

# 4. The real thing (don't touch the Mac while it runs):
wedding-sender invite --csv invites.csv --live

# 5. Back in the Sheet: menu → "ייבוא לוג שליחה" → paste sent_log.csv
#    → rows flip to SENT so they're excluded from the next export.
```

Reminders are the same loop with **ייצוא תזכורות לשליחה** and
`wedding-sender reminder --csv reminders.csv --live`. The Sheet only exports
guests who haven't answered and haven't hit the reminder cap.

## Resume & safety

- Every successful send is appended to `sent_log.csv` immediately. If the run
  crashes, your Mac sleeps, or you Ctrl-C — just rerun the same command;
  already-sent guests are skipped.
- If another app steals focus mid-run, the sender **aborts** instead of
  typing into the wrong window. Rerun when ready.
- Exit codes: `0` all sent · `1` some sends failed (listed) · `2` bad
  input/environment (e.g. `--live` off-macOS).

## Options

| Flag | Default | Meaning |
|---|---|---|
| `--live` | off (dry run) | actually send |
| `--limit N` | ∞ | cap the batch (pilots) |
| `--sent-log PATH` | `./sent_log.csv` | resume + import file |
| `--template PATH` | built-in Hebrew | custom message (see TEMPLATES.md) |
| `--min-delay` / `--max-delay` | 20 / 45 s | random pause between sends |
| `--chat-load-delay` | 2.5 s | wait for the chat to open before Return |

## Anti-spam guidance (important)

You're sending from a **personal** WhatsApp account; bulk behaviour can
trigger temporary blocks:

- Keep the randomized 20–45 s delays (defaults). Faster is not worth it.
- Send **≤ ~100 messages/day**; split a big list across 2–3 days.
- Prefer sending to people who have your number saved (wedding guests
  usually do) — that's the biggest trust signal.
- Pilot with `--limit 3` and check delivery before the full run.

## Limitations

- **Text only.** The `whatsapp://` scheme cannot attach an image or video, so
  the invitation graphic can't be auto-sent. Workarounds:
  - put the invite image at the top of the RSVP page (edit
    `apps_script/RsvpForm.html` — add an `<img>` above the title), and/or
  - send the image manually once to a broadcast list, then run the
    personalized text+link blast with this tool.
- **Numbers not on WhatsApp** make the Desktop app show an error dialog; the
  keypress lands harmlessly, but the row is still logged as sent. Watch for
  the dialog, fix the number in the Sheet, delete that row from
  `sent_log.csv`, rerun.
- Newer WhatsApp Desktop builds occasionally need a longer
  `--chat-load-delay` (try `4`) if messages stay unsent in the input box.
- macOS only — that's where the `whatsapp://` + osascript trick works. The
  rest of the project (Sheet, RSVP form, tests) is platform-independent.
