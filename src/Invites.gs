/**
 * Invites.gs — send the initial invite to every PENDING guest.
 * Run manually from the "💍 חתונה" menu once your templates are approved.
 */
function sendInvites() {
  const sh = guestsSheet_();
  var sent = 0, failed = 0, skipped = 0;

  getGuests_().forEach(function (g) {
    if (!g.phone || g.status !== STATUS.PENDING) { skipped++; return; }

    const res = sendTemplate_(g.phone, CONFIG.WHATSAPP.TEMPLATES.INVITE,
      [String(g.name), rsvpLink_(g)]);

    if (res.ok) {
      sh.getRange(g._row, COL.status).setValue(STATUS.SENT);
      sh.getRange(g._row, COL.sent_at).setValue(new Date());
      sent++;
    } else {
      sh.getRange(g._row, COL.notes).setValue('Invite failed: ' + res.body);
      failed++;
    }
    Utilities.sleep(300); // gentle pacing for rate limits
  });

  SpreadsheetApp.getUi().alert(
    'הזמנות נשלחו: ' + sent + '\nנכשלו: ' + failed + '\nדולגו: ' + skipped);
}
