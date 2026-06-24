/**
 * Menu.gs — adds the "💍 חתונה" menu to the spreadsheet and the summary view.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💍 חתונה')
    .addItem('שליחת הזמנות (PENDING)', 'sendInvites')
    .addItem('שליחת תזכורות עכשיו', 'sendReminders')
    .addSeparator()
    .addItem('מילוי מזהים חסרים', 'backfillIds')
    .addItem('סיכום אישורים', 'showSummary')
    .addItem('סיכום תקציב', 'budgetTotals')
    .addToUi();
}

/** Headcount summary popup. */
function showSummary() {
  var confirmed = 0, declined = 0, sent = 0, pending = 0, heads = 0;
  getGuests_().forEach(function (g) {
    if (g.status === STATUS.CONFIRMED) { confirmed++; heads += Number(g.attending_count || 0); }
    else if (g.status === STATUS.DECLINED) declined++;
    else if (g.status === STATUS.SENT) sent++;
    else pending++;
  });
  SpreadsheetApp.getUi().alert(
    'סיכום אישורים\n\n' +
    'מגיעים (משקי בית): ' + confirmed + '\n' +
    'סה"כ אורחים: ' + heads + '\n' +
    'לא מגיעים: ' + declined + '\n' +
    'ממתינים לתשובה: ' + sent + '\n' +
    'טרם הוזמנו: ' + pending);
}
