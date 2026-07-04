/**
 * Export.gs — the bridge between the Sheet and the Python sender.
 *
 * Outbound: exportInvites()/exportReminders() build a CSV of guests to
 * message (id,name,phone,link,kind) and show it in a dialog with a
 * download button. Feed that file to `wedding-sender` on your Mac.
 *
 * Inbound: showImportDialog() lets you paste the sender's sent_log.csv
 * back; importSentLog() marks invites SENT and bumps reminder counters.
 *
 * The `kind` column is the idempotency key: 'invite' for the first
 * message, 'reminder_1' / 'reminder_2' ... for reminder rounds. Importing
 * the same log twice changes nothing.
 */

function exportInvites() {
  const rows = exportRows_('invite');
  if (!rows.length) {
    SpreadsheetApp.getUi().alert('אין אורחים בסטטוס PENDING עם טלפון.');
    return;
  }
  showExportDialog_(buildCsv_(rows), 'invites.csv',
    'ייצוא הזמנות — ' + rows.length + ' אורחים');
}

function exportReminders() {
  const rows = exportRows_('reminder');
  if (!rows.length) {
    SpreadsheetApp.getUi().alert('אין אורחים שממתינים לתזכורת.');
    return;
  }
  showExportDialog_(buildCsv_(rows), 'reminders.csv',
    'ייצוא תזכורות — ' + rows.length + ' אורחים');
}

/**
 * Rows to export for a sending round.
 * kind='invite'   → status PENDING and a phone number.
 * kind='reminder' → status SENT, no RSVP yet, fewer than MAX_PER_GUEST
 *                   reminders; each row's kind is 'reminder_<round>'.
 * @return {Array<{id:string,name:string,phone:string,link:string,kind:string}>}
 */
function exportRows_(kind) {
  const rows = [];
  getGuests_().forEach(function (g) {
    if (!g.phone || !g.id) return;

    var rowKind;
    if (kind === 'invite') {
      if (g.status !== STATUS.PENDING) return;
      rowKind = 'invite';
    } else {
      if (g.status !== STATUS.SENT) return;
      if (g.rsvp_at) return;
      const count = Number(g.reminder_count || 0);
      if (count >= CONFIG.REMINDERS.MAX_PER_GUEST) return;
      rowKind = 'reminder_' + (count + 1);
    }

    rows.push({
      id: String(g.id),
      name: String(g.name || ''),
      phone: String(g.phone),
      link: rsvpLink_(g),
      kind: rowKind,
    });
  });
  return rows;
}

/** RFC-4180 CSV with a UTF-8 BOM so Excel opens Hebrew correctly. */
function buildCsv_(rows) {
  const header = ['id', 'name', 'phone', 'link', 'kind'];
  const lines = [header.join(',')];
  rows.forEach(function (r) {
    lines.push(header.map(function (h) { return csvField_(r[h]); }).join(','));
  });
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

function csvField_(value) {
  const s = String(value == null ? '' : value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function showExportDialog_(csv, filename, title) {
  const t = HtmlService.createTemplateFromFile('ExportDialog');
  t.csv = csv;
  t.filename = filename;
  SpreadsheetApp.getUi().showModalDialog(
    t.evaluate().setWidth(520).setHeight(420), title);
}

function showImportDialog() {
  const t = HtmlService.createTemplateFromFile('ImportDialog');
  SpreadsheetApp.getUi().showModalDialog(
    t.evaluate().setWidth(520).setHeight(420), 'ייבוא לוג שליחה');
}

/**
 * Parse the Python sender's sent_log.csv.
 * Format: header 'id,phone,kind,sent_at' then one row per sent message.
 * Pure function (no Sheet access) so it is unit-testable.
 * @return {Array<{id:string, phone:string, kind:string, ts:string}>}
 */
function parseSentLog_(csvText) {
  const records = [];
  String(csvText || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach(function (line) {
    line = line.trim();
    if (!line) return;
    const parts = line.split(',');
    if (parts.length < 3) return;
    const id = parts[0].trim();
    if (!id || id.toLowerCase() === 'id') return; // header
    records.push({
      id: id,
      phone: parts[1].trim(),
      kind: parts[2].trim(),
      ts: (parts[3] || '').trim(),
    });
  });
  return records;
}

/**
 * Apply one sent record to a guest row. Idempotent:
 *  - invite: only PENDING guests move to SENT (+ sent_at from the log).
 *  - reminder_N: reminder_count only ever raised to N, never re-added.
 * @return {'invite'|'reminder'|'skipped'}
 */
function applySentRecord_(sh, guest, kind, ts) {
  if (kind === 'invite') {
    if (guest.status !== STATUS.PENDING) return 'skipped';
    const when = ts ? new Date(ts) : new Date();
    sh.getRange(guest._row, COL.status).setValue(STATUS.SENT);
    sh.getRange(guest._row, COL.sent_at).setValue(isNaN(when.getTime()) ? new Date() : when);
    guest.status = STATUS.SENT;
    return 'invite';
  }
  const m = /^reminder_(\d+)$/.exec(kind);
  if (m) {
    const round = Number(m[1]);
    const current = Number(guest.reminder_count || 0);
    if (round <= current) return 'skipped';
    sh.getRange(guest._row, COL.reminder_count).setValue(round);
    guest.reminder_count = round;
    return 'reminder';
  }
  return 'skipped';
}

/**
 * Called from ImportDialog via google.script.run with the pasted
 * sent_log.csv text.
 * @return {{invites:number, reminders:number, skipped:number, unknown:number}}
 */
function importSentLog(csvText) {
  const sh = guestsSheet_();
  const byId = {};
  getGuests_().forEach(function (g) { byId[String(g.id)] = g; });

  const counts = { invites: 0, reminders: 0, skipped: 0, unknown: 0 };
  const seen = {};
  parseSentLog_(csvText).forEach(function (rec) {
    const key = rec.id + '|' + rec.kind;
    if (seen[key]) { counts.skipped++; return; }
    seen[key] = true;

    const guest = byId[rec.id];
    if (!guest) { counts.unknown++; return; }

    const result = applySentRecord_(sh, guest, rec.kind, rec.ts);
    if (result === 'invite') counts.invites++;
    else if (result === 'reminder') counts.reminders++;
    else counts.skipped++;
  });
  return counts;
}
