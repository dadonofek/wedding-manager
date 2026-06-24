/**
 * Guests.gs — guest list schema + helpers.
 *
 * The Guests tab is your database AND your admin view. One row per household.
 * Column order is defined by GUEST_HEADERS (don't reorder without updating it).
 */

const GUEST_HEADERS = [
  'id',              // unique token (auto-filled by backfillIds)
  'name',            // household / guest display name
  'phone',           // 05X... or 9725X... — both work
  'side',            // optional grouping: חתן / כלה / חברים ...
  'max_guests',      // how many people this invite covers (incl. plus-ones)
  'status',          // PENDING / SENT / CONFIRMED / DECLINED
  'attending_count', // how many actually coming (filled on RSVP)
  'dietary',         // free text (filled on RSVP)
  'reminder_count',  // how many reminders sent (auto)
  'sent_at',         // when the invite was sent (auto)
  'rsvp_at',         // when they responded (auto)
  'notes',           // anything, incl. error messages (auto)
];

// 1-based column index by logical key, e.g. COL.status
const COL = (function () {
  const m = {};
  GUEST_HEADERS.forEach(function (h, i) { m[h] = i + 1; });
  return m;
})();

function guestsSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.GUESTS);
}

/** All guest rows as objects, each tagged with its sheet row number (_row). */
function getGuests_() {
  const sh = guestsSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, GUEST_HEADERS.length).getValues();
  return values.map(function (row, i) {
    const obj = { _row: i + 2 };
    GUEST_HEADERS.forEach(function (h, c) { obj[h] = row[c]; });
    return obj;
  });
}

function getGuestById_(id) {
  const guests = getGuests_();
  for (var i = 0; i < guests.length; i++) {
    if (String(guests[i].id) === String(id)) return guests[i];
  }
  return null;
}

function makeToken_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

/**
 * Fill missing ids + default status for any guest rows. Run this after pasting
 * your guest list. Safe to run repeatedly.
 */
function backfillIds() {
  const sh = guestsSheet_();
  getGuests_().forEach(function (g) {
    if (!g.id) sh.getRange(g._row, COL.id).setValue(makeToken_());
    if (!g.status) sh.getRange(g._row, COL.status).setValue(STATUS.PENDING);
  });
  SpreadsheetApp.getUi().alert('IDs filled ✔');
}

/** Per-guest RSVP link. */
function rsvpLink_(guest) {
  return CONFIG.RSVP_BASE_URL + '?token=' + encodeURIComponent(guest.id);
}
