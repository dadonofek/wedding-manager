# Setup guide

Rough order. Start the Meta parts **first** — template approval and (optional)
business verification are the slow steps; everything else is fast.

## A. Google Sheet + Apps Script

You can deploy the code two ways. **Option 1 (clasp)** keeps this repo as the
source of truth. **Option 2 (copy-paste)** is zero-install.

### Option 1 — clasp (recommended, version-controlled)
```bash
npm install -g @google/clasp
clasp login

# create the Sheet's bound script, or bind to an existing Sheet:
# easiest: create a new Google Sheet, Extensions > Apps Script, copy the Script ID
# (Project Settings > IDs) and:
cp .clasp.json.example .clasp.json
#   edit .clasp.json -> paste your Script ID
clasp push
```

### Option 2 — copy-paste
1. Create a new Google Sheet.
2. **Extensions → Apps Script.**
3. Recreate each file from `src/` (same names): `Config.gs`, `Setup.gs`,
   `Guests.gs`, `WhatsApp.gs`, `Invites.gs`, `Reminders.gs`, `Rsvp.gs`,
   `Menu.gs`, `Budget.gs`, and `RsvpForm.html`.

### Then, in the Apps Script editor (either option)
1. Run `createSheets()` → creates the `Guests` + `Budget` tabs.
2. Edit `Config.gs` → fill in `WEDDING` details.
3. Reload the Sheet → you'll see the **💍 חתונה** menu.

## B. WhatsApp Cloud API (Meta)

1. Go to **developers.facebook.com** → create an app → type **Business**.
2. Add the **WhatsApp** product. You get a free **test number** + a
   **Phone number ID** and a temporary token.
3. Create your 3 Hebrew templates (see `docs/TEMPLATES.md`) and submit them.
4. Generate a **permanent token** (System User token in Business Settings) so it
   doesn't expire after 24h.
5. In Apps Script: paste the token + Phone number ID into `setSecrets()`, run it
   once, then delete the values.

> While on the **test number** you can only message up to 5 pre-registered
> recipients — perfect for testing. Add a real number when you're ready.

## C. Deploy the RSVP form

1. Apps Script → **Deploy → New deployment → Web app.**
2. *Execute as:* **Me**. *Who has access:* **Anyone.**
3. Copy the `/exec` URL → paste into `Config.gs` → `RSVP_BASE_URL`.
4. `clasp push` again (or paste) so the links use the right URL.

## D. Dry run

1. Put 1–2 test rows in `Guests` (use your own phone), run **מילוי מזהים חסרים**.
2. Run `testSendFirstGuest()` (in `WhatsApp.gs`) → check your phone.
3. Tap the link → submit the form → confirm the row updates to `CONFIRMED`.
4. Run `createTriggers()` to start daily reminders.

## E. Go live

1. Paste the real guest list, run **מילוי מזהים חסרים**.
2. **שליחת הזמנות** from the menu.
3. Watch responses land; **סיכום אישורים** for a live headcount.

> **250-message/24h limit** applies until Meta business verification. For a big
> list, verify first, or send invites in batches across a couple of days.
