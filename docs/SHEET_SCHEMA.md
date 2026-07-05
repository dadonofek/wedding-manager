# Sheet schema

Your Google Sheet is both the **database** and the **admin view**. Two tabs.

## `Guests` tab

One row per **household** (a couple or family that gets one invite and one RSVP link).

| Column | Filled by | Meaning |
|---|---|---|
| `id` | auto (`backfillIds`) | unique token used in the RSVP link — don't edit |
| `name` | you | display name, e.g. `משפחת כהן` or `דנה ויוסי` |
| `phone` | you | `05X-XXXXXXX` or `9725XXXXXXXX` — both accepted |
| `side` | you (optional) | grouping, e.g. `חתן` / `כלה` / `עבודה` |
| `max_guests` | you (optional) | informational only — guests pick their own count (0–10) in the form |
| `status` | auto (log import) | `PENDING` → `SENT` → `CONFIRMED` / `DECLINED` |
| `attending_count` | auto (RSVP) | how many are actually coming |
| `dietary` | auto (RSVP) | free-text notes from the guest |
| `reminder_count` | auto (log import) | how many reminders were sent |
| `sent_at` | auto (log import) | when the invite went out (from `sent_log.csv`) |
| `rsvp_at` | auto (RSVP) | when they responded |
| `notes` | you | scratch column |

**Workflow:** paste names + phones → run **מילוי מזהים חסרים**
(`backfillIds`) to generate `id`s and set everyone to `PENDING` → export,
send from your Mac, import the log (see [SENDING.md](SENDING.md)).

You only ever type into `name`, `phone`, `side`, `notes`
(and `max_guests` if you want it for your own bookkeeping).
Everything else fills itself in:

- `status`, `sent_at`, `reminder_count` update when you **import
  `sent_log.csv`** (menu → ייבוא לוג שליחה). The import is idempotent —
  pasting the same log twice changes nothing.
- `attending_count`, `dietary`, `rsvp_at` update the moment a guest submits
  the RSVP form.

## CSV contracts (Sheet ⇄ sender)

Export (Sheet → `wedding-sender`): `id,name,phone,link,kind` where `kind` is
`invite` or `reminder_1` / `reminder_2` (the round number).

Sent log (`wedding-sender` → Sheet): `id,phone,kind,sent_at`, appended one
row per real send.

## `Budget` tab (optional)

| Column | Meaning |
|---|---|
| `item` | what it is (`אולם`, `צלם`, ...) |
| `vendor` | supplier name |
| `estimated` | quote / estimate |
| `actual` | agreed price |
| `paid` | `TRUE` / `כן` once paid |
| `due_date` | when payment is due |
| `notes` | anything |

Menu → **סיכום תקציב** pops up estimated / actual / paid / remaining.
