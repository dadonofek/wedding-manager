/**
 * Setup.gs — one-time setup helpers. Run each ONCE from the Apps Script editor
 * (select the function in the toolbar, press Run).
 */

/**
 * STEP 1 — store your WhatsApp Cloud API credentials securely.
 * 1. Paste your two values below.
 * 2. Run setSecrets() once.
 * 3. Delete the values again so they're never committed.
 */
function setSecrets() {
  PropertiesService.getScriptProperties().setProperties({
    WHATSAPP_TOKEN: 'PASTE_YOUR_PERMANENT_TOKEN_HERE',
    WHATSAPP_PHONE_NUMBER_ID: 'PASTE_YOUR_PHONE_NUMBER_ID_HERE',
  });
  Logger.log('Secrets saved. Now delete the values from setSecrets().');
}

/**
 * STEP 2 — create the Guests + Budget tabs with headers (if missing).
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

/**
 * STEP 3 — install the daily reminder trigger. Safe to re-run (replaces old one).
 */
function createTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendReminders')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.REMINDERS.SEND_HOUR)
    .create();
  Logger.log('Daily reminder trigger installed at hour ' + CONFIG.REMINDERS.SEND_HOUR);
}
