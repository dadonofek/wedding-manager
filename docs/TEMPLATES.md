# Message templates (Hebrew)

Messages are plain text sent from your own WhatsApp — **no Meta approval, no
template categories, no fees**. The built-in templates live in
`sender/wedding_sender/templates/` and support exactly two placeholders:

- `{name}` — the guest/household display name from the Sheet
- `{link}` — their personal RSVP link (**required** — the whole point)

Use your own file with `--template my_invite.txt`. Anything else in `{...}`
is rejected at startup so a typo can't reach a guest.

---

## 1. `invite.txt` — first message

```
שלום {name}, הוזמנתם לחתונה של שרון ושגיא! 🎉
📅 20.08.2026 · 12:00
📍 חוות אדמה ושמים, יבניאל
נשמח לאישור הגעה בקישור הבא:
{link}
```

## 2. `reminder.txt` — nudge for non-responders

```
שלום {name}, רצינו להזכיר שטרם קיבלנו את אישור ההגעה שלכם לחתונה של שרון ושגיא 💍
נשמח אם תוכלו לאשר כאן:
{link}
```

---

### RTL tips

- Keep links/numbers on **their own line** (as above) so Hebrew + Latin don't
  render in a jumbled order. The built-in templates already do this, and the
  test suite asserts the link stays on its own last line.
- Dates read better as `20.08.2026` than ISO inside Hebrew text.
- Test on your own number (`--live --limit 1`) before the real blast.
