# WhatsApp templates (Hebrew)

Every business-initiated WhatsApp message must be a **pre-approved template**.
Create these in **WhatsApp Manager → Account tools → Message templates**, in
language **Hebrew (`he`)**. Approval is usually minutes, sometimes up to 24h.

The `{{1}}`, `{{2}}` … are variables filled in by the code (in order).

> **Categories & cost:** put reminders/day-before under **Utility** (cheap,
> ~$0.006). The invite may be classed **Marketing** (~$0.039) by Meta no matter
> how you word it — keep it factual to improve your odds. See the main report.

---

## 1. `wedding_invite`  — category: Utility (may be reclassified Marketing)

**Body:**
```
שלום {{1}}, הוזמנתם לחתונה שלנו! 🎉
נשמח לאישור הגעה בקישור הבא:
{{2}}
```
- `{{1}}` = guest name
- `{{2}}` = personal RSVP link

## 2. `wedding_reminder` — category: Utility

**Body:**
```
שלום {{1}}, רצינו להזכיר שטרם קיבלנו את אישור ההגעה שלכם.
נשמח אם תוכלו לאשר כאן:
{{2}}
```
- `{{1}}` = guest name
- `{{2}}` = personal RSVP link

## 3. `wedding_day_before` — category: Utility (optional, Phase 4)

**Body:**
```
שלום {{1}}! מזכירים שהחתונה מחר בשעה {{2}} ב{{3}}.
מיקום: {{4}}
מחכים לראותכם! 💍
```
- `{{1}}` = guest name
- `{{2}}` = time · `{{3}}` = venue · `{{4}}` = map link

---

### RTL tips
- Keep links/numbers on **their own line** (as above) so Hebrew + Latin don't
  render in a jumbled order.
- Test each template by sending to your own number before the real blast.
- The template **name** must be lowercase with underscores; the **body** is the
  Hebrew text above.
