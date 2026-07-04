/**
 * Budget.gs — optional, deliberately minimal budget tracking.
 *
 * The Budget tab does the real work; you just type rows. This adds a quick
 * totals popup. Columns: item | vendor | estimated | actual | paid | due_date | notes
 * (set "paid" to TRUE / כן when something is paid.)
 */
const BUDGET_HEADERS = ['item', 'vendor', 'estimated', 'actual', 'paid', 'due_date', 'notes'];

function budgetTotals() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.BUDGET);
  const last = sh ? sh.getLastRow() : 0;
  if (last < 2) { SpreadsheetApp.getUi().alert('אין נתונים בגיליון התקציב.'); return; }

  const rows = sh.getRange(2, 1, last - 1, BUDGET_HEADERS.length).getValues();
  var est = 0, act = 0, paid = 0;
  rows.forEach(function (r) {
    est += Number(r[2] || 0);
    act += Number(r[3] || 0);
    var isPaid = (r[4] === true || String(r[4]).toLowerCase() === 'true' || r[4] === 'כן');
    if (isPaid) paid += Number(r[3] || 0);
  });

  SpreadsheetApp.getUi().alert(
    'תקציב\n\n' +
    'משוער: ' + est + '\n' +
    'בפועל: ' + act + '\n' +
    'שולם: ' + paid + '\n' +
    'נותר לשלם: ' + (act - paid));
}
