# 💍 Wedding Manager

A tiny, self-hosted wedding RSVP system built on **Google Sheets + Google Apps
Script + the official WhatsApp Cloud API**. Hebrew / RTL first. No servers, no
deployment pipeline, no monthly fees — the Sheet is your database *and* your
admin dashboard, and Apps Script's built-in scheduler handles reminders.

> Built for a real wedding. The whole thing is ~9 small script files you can
> read in one sitting and actually debug.

---

## Why this stack

| Need | How it's met |
|---|---|
| No deployment headaches | Apps Script runs inside Google — nothing to host |
| A real scheduler for reminders | Apps Script **time-based triggers** (true cron) |
| Hebrew / RTL | RTL Sheet + `dir="rtl"` form + Hebrew WhatsApp templates |
| Cheap | Free infra; WhatsApp ≈ **$6–$40 total** for 250–300 guests |
| Debuggable | Plain JS, one concern per file, no framework |

WhatsApp is used **only to push a personalized link** — the actual RSVP happens
on a small web form. That keeps us in cheap/free template territory and avoids
parsing inbound chat messages.

## How it works

```
                 ┌──────────────────────────┐
                 │   Google Sheet (Guests)  │  ← your DB + admin view
                 └────────────┬─────────────┘
                              │  Apps Script
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                       ▼
  sendInvites()        sendReminders()           doGet / submitRsvp()
  (menu, manual)     (daily time trigger)        (RSVP web app)
        │                     │                       ▲
        ▼                     ▼                       │ personal link
   WhatsApp Cloud API  ──────────────►  guest's phone ─┘
   (approved Hebrew templates)
```

A guest gets a WhatsApp message → taps their personal link → fills the RTL form
→ the Sheet updates to `CONFIRMED` / `DECLINED` with a headcount. Non-responders
get up to N automatic reminders. Done.

## Features (current)

- ✅ Guest list as the single source of truth (one row per household)
- ✅ Personal RSVP link per guest (token-based, no logins)
- ✅ WhatsApp invites via official Cloud API (Hebrew templates)
- ✅ Automatic daily reminders to non-responders (capped)
- ✅ RTL Hebrew RSVP web form (attendance + dietary notes)
- ✅ Live headcount summary from the menu
- ✅ Optional minimal budget tab + totals

## Repo structure

```
wedding-manager/
├── README.md
├── LICENSE                 (MIT)
├── .clasp.json.example     (copy → .clasp.json, add your Script ID)
├── .gitignore
├── docs/
│   ├── SETUP.md            (step-by-step: Sheet, Meta, deploy, go-live)
│   ├── SHEET_SCHEMA.md     (column-by-column data model)
│   └── TEMPLATES.md        (the 3 Hebrew WhatsApp templates to submit)
└── src/
    ├── appsscript.json     (manifest: timezone, web-app access)
    ├── Config.gs           (⚙️ all your settings live here)
    ├── Setup.gs            (one-time: secrets, sheets, triggers)
    ├── Guests.gs           (schema + helpers)
    ├── WhatsApp.gs         (Cloud API sender)
    ├── Invites.gs          (send invites to PENDING)
    ├── Reminders.gs        (daily reminder logic)
    ├── Rsvp.gs             (RSVP web app: serve form + record)
    ├── RsvpForm.html       (RTL Hebrew form)
    ├── Menu.gs             (the 💍 menu + summary)
    └── Budget.gs           (optional budget totals)
```

## Quick start

Full version in **[docs/SETUP.md](docs/SETUP.md)**. The short version:

1. New Google Sheet → **Extensions → Apps Script** → add the `src/` files
   (via `clasp push`, or copy-paste).
2. Run `createSheets()`, then fill in `Config.gs`.
3. Set up a Meta WhatsApp app, submit the 3 Hebrew templates, run `setSecrets()`.
4. **Deploy → Web app**, paste the URL into `Config.gs` → `RSVP_BASE_URL`.
5. Paste guests → **מילוי מזהים חסרים** → **שליחת הזמנות**.

## Cost (Israel, 2026)

Per-message pricing. Rough totals for ~250 guests (invite + a couple reminders):

| Scenario | Approx total |
|---|---|
| All utility-category | ~$6 |
| Realistic mix | ~$14 |
| Worst case (all marketing) | ~$40 |

Message fees are negligible; the real "cost" is template approval time.

---

## 🗺️ Roadmap

### Phase 0 — Skeleton ✅ (this repo)
Guest schema, WhatsApp sender, invites, reminders, RSVP form, summary, budget.

### Phase 1 — Make it real (you, week 1)
- [ ] Fill in `Config.gs` (couple, date, venue, map link)
- [ ] Stand up the Meta app + get the 3 templates approved
- [ ] Wire secrets, deploy the web app, paste the `/exec` URL
- [ ] End-to-end dry run with your own number

### Phase 2 — Polish the guest experience
- [ ] Confirmation message after RSVP (utility template, free in 24h window)
- [ ] "Add to calendar" link + venue map on the form's success screen
- [ ] Handle households where the responder picks fewer than `max_guests`
- [ ] Per-guest "already responded" view (re-open link shows their answer)

### Phase 3 — Admin niceties
- [ ] One-click CSV export for the caterer (headcount + dietary)
- [ ] Filter views: who hasn't replied / declined / dietary flags
- [ ] Conditional formatting (green=confirmed, grey=pending)
- [ ] Pause/limit reminders per guest from the Sheet

### Phase 4 — Day-of
- [ ] `wedding_day_before` reminder (time + venue + map), scheduled trigger
- [ ] Optional QR check-in (scan → mark arrived)
- [ ] Final headcount + seating export

### Maybe / later
- [ ] Inbound replies (guest answers "1" in WhatsApp instead of the form)
- [ ] Multi-event support (henna / ceremony / reception as separate RSVPs)
- [ ] Gift/registry link, photo-upload link post-wedding

### Known limits / gotchas
- 250 business-initiated msgs / 24h until Meta business verification.
- Apps Script: 6-min per-run limit + ~20k UrlFetch calls/day (plenty here).
- Test number messages only reach 5 pre-registered recipients.
- Meta may classify the invite as Marketing regardless of wording.

---

MIT licensed. Built to be forked — swap in your own wedding and go.
