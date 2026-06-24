/**
 * Reminders.gs — remind guests who were invited but haven't replied.
 * Runs automatically via the daily trigger (Setup.gs > createTriggers),
 * and can also be run on demand from the menu.
 */
function sendReminders() {
  // Stop once the wedding day has passed.
  if (new Date() > new Date(CONFIG.WEDDING.DATE_ISO + 'T23:59:59')) {
    Logger.log('Wedding date passed — no reminders.');
    return;
  }

  const sh = guestsSheet_();
  var sent = 0;

  getGuests_().forEach(function (g) {
    if (!g.phone) return;
    if (g.status !== STATUS.SENT) return;   // only those awaiting a reply
    if (g.rsvp_at) return;                  // already responded
    const count = Number(g.reminder_count || 0);
    if (count >= CONFIG.REMINDERS.MAX_PER_GUEST) return;

    const res = sendTemplate_(g.phone, CONFIG.WHATSAPP.TEMPLATES.REMINDER,
      [String(g.name), rsvpLink_(g)]);

    if (res.ok) {
      sh.getRange(g._row, COL.reminder_count).setValue(count + 1);
      sent++;
    } else {
      sh.getRange(g._row, COL.notes).setValue('Reminder failed: ' + res.body);
    }
    Utilities.sleep(300);
  });

  Logger.log('Reminders sent: ' + sent);
}
