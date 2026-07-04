# Setup guide

Two halves: the **Google side** (Sheet + RSVP form, one-time) and the
**Mac side** (the WhatsApp sender — see [SENDING.md](SENDING.md)).

## A. Google Sheet + Apps Script

You can deploy the code two ways. **Option 1 (clasp)** keeps this repo as the
source of truth. **Option 2 (copy-paste)** is zero-install.

### Option 1 — clasp (recommended, version-controlled)
```bash
npm install -g @google/clasp
clasp login

# create a new Google Sheet, then Extensions > Apps Script,
# copy the Script ID (Project Settings > IDs) and:
cp .clasp.json.example .clasp.json
#   edit .clasp.json -> paste your Script ID
clasp push
```

### Option 2 — copy-paste
1. Create a new Google Sheet.
2. **Extensions → Apps Script.**
3. Recreate each file from `apps_script/` (same names): `Config.gs`,
   `Setup.gs`, `Guests.gs`, `Export.gs`, `Rsvp.gs`, `Menu.gs`, `Budget.gs`,
   and the HTML files `RsvpForm.html`, `ExportDialog.html`,
   `ImportDialog.html`.

### Then, in the Apps Script editor (either option)
1. Run `createSheets()` → creates the `Guests` + `Budget` tabs.
2. Edit `Config.gs` → fill in `WEDDING` details.
3. Reload the Sheet → you'll see the **💍 חתונה** menu.

## B. Deploy the RSVP form

1. Apps Script → **Deploy → New deployment → Web app.**
2. *Execute as:* **Me**. *Who has access:* **Anyone.**
3. Copy the `/exec` URL → paste into `Config.gs` → `RSVP_BASE_URL`.
4. `clasp push` again (or paste) so exported links use the right URL.

## C. Load the guest list

1. Paste names + phones + `max_guests` into the `Guests` tab
   (see [SHEET_SCHEMA.md](SHEET_SCHEMA.md)).
2. Menu → **מילוי מזהים חסרים** — generates each household's secret token and
   sets everyone to `PENDING`.

## D. Dry run (strongly recommended)

1. Add 1–2 test rows with **your own phone number**.
2. Menu → **ייצוא הזמנות לשליחה** → download `invites.csv`.
3. On your Mac ([SENDING.md](SENDING.md)):
   `wedding-sender invite --csv invites.csv` — inspect the dry-run output,
   then rerun with `--live --limit 1` and watch the message reach your phone.
4. Tap the link → submit the form → confirm the Sheet row flips to
   `CONFIRMED`.
5. Menu → **ייבוא לוג שליחה** → paste the generated `sent_log.csv` → your test
   row's status/`sent_at` update.

## E. Go live

1. **ייצוא הזמנות לשליחה** → send with `--live` (batch guidance in
   SENDING.md).
2. **ייבוא לוג שליחה** after each sending session.
3. Watch responses land; **סיכום אישורים** for a live headcount.
4. A few days later: **ייצוא תזכורות לשליחה** →
   `wedding-sender reminder --csv reminders.csv --live` → import the log
   again. Guests are reminded at most `REMINDERS.MAX_PER_GUEST` times
   (Config.gs), and never after they've answered.
