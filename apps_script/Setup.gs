/**
 * Setup.gs — one-time setup helpers. Run once from the Apps Script editor
 * (select the function in the toolbar, press Run).
 */

/**
 * Create the Guests + Budget tabs with headers (if missing).
 */
function createSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let g = ss.getSheetByName(CONFIG.SHEETS.GUESTS) || ss.insertSheet(CONFIG.SHEETS.GUESTS);
  if (g.getLastRow() === 0) {
    g.appendRow(GUEST_HEADERS);
    g.setFrozenRows(1);
    g.setRightToLeft(true);
  }

  let b = ss.getSheetByName(CONFIG.SHEETS.BUDGET) || ss.insertSheet(CONFIG.SHEETS.BUDGET);
  if (b.getLastRow() === 0) {
    b.appendRow(BUDGET_HEADERS);
    b.setFrozenRows(1);
    b.setRightToLeft(true);
  }

  SpreadsheetApp.getUi().alert('Sheets ready ✔');
}
