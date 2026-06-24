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
| `max_guests` | you | how many people this invite covers (incl. plus-ones) |
| `status` | auto | `PENDING` → `SENT` → `CONFIRMED` / `DECLINED` |
| `attending_count` | auto (RSVP) | how many are actually coming |
| `dietary` | auto (RSVP) | free-text notes from the guest |
| `reminder_count` | auto | how many reminders were sent |
| `sent_at` | auto | when the invite went out |
| `rsvp_at` | auto | when they responded |
| `notes` | auto / you | scratch column; also where send errors are logged |

**Workflow:** paste names + phones + `max_guests` → run **מילוי מזהים חסרים**
(`backfillIds`) to generate `id`s and set everyone to `PENDING` → send invites.

You only ever type into `name`, `phone`, `side`, `max_guests`. Everything else
fills itself in.

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
