/**
 * Minimal Google Apps Script emulation: loads apps_script/*.gs into a Node
 * vm context with in-memory mocks for SpreadsheetApp / Utilities /
 * HtmlService, so the pure-ish sheet logic (export, import, RSVP) can be
 * unit-tested without Google.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const APPS_SCRIPT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps_script');

// Must match GUEST_HEADERS in apps_script/Guests.gs
export const HEADERS = [
  'id', 'name', 'phone', 'side', 'max_guests', 'status',
  'attending_count', 'dietary', 'reminder_count',
  'sent_at', 'rsvp_at', 'notes',
];

/** Build a sheet row (array) from a partial guest object. */
export function guestRow(guest) {
  return HEADERS.map((h) => (h in guest ? guest[h] : ''));
}

class FakeSheet {
  constructor(rows) {
    this.rows = rows; // rows[0] is the header row
  }

  getLastRow() { return this.rows.length; }

  getRange(row, col, numRows = 1, numCols = 1) {
    const sheet = this;
    return {
      getValues() {
        const out = [];
        for (let r = 0; r < numRows; r++) {
          const src = sheet.rows[row - 1 + r] || [];
          const line = [];
          for (let c = 0; c < numCols; c++) {
            line.push(src[col - 1 + c] !== undefined ? src[col - 1 + c] : '');
          }
          out.push(line);
        }
        return out;
      },
      setValue(v) {
        while (sheet.rows.length < row) sheet.rows.push([]);
        sheet.rows[row - 1][col - 1] = v;
      },
    };
  }

  appendRow(row) { this.rows.push(row.slice()); }
  setFrozenRows() {}
  setRightToLeft() {}
}

/**
 * Create a fresh GAS environment.
 * @param {Array<object>} guests partial guest objects (see guestRow)
 * @returns {{api: object, guestsSheet: FakeSheet, ui: object,
 *            cell(guestIndex: number, header: string): any}}
 */
export function createEnv(guests = []) {
  const guestsSheet = new FakeSheet([HEADERS.slice(), ...guests.map(guestRow)]);
  const sheets = { Guests: guestsSheet };

  const ui = {
    alerts: [],
    dialogs: [],
    alert(msg) { this.alerts.push(msg); },
    showModalDialog(html, title) { this.dialogs.push({ html, title }); },
    createMenu() {
      const menu = {
        addItem: () => menu, addSeparator: () => menu, addToUi: () => {},
      };
      return menu;
    },
  };

  let uuidCounter = 0;
  const sandbox = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (name) => sheets[name] || null,
        insertSheet: (name) => (sheets[name] = new FakeSheet([])),
      }),
      getUi: () => ui,
    },
    Utilities: {
      getUuid: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`,
      sleep: () => {},
    },
    HtmlService: {
      createTemplateFromFile: (name) => {
        const template = {
          _file: name,
          evaluate() {
            const output = {
              setTitle: () => output, addMetaTag: () => output,
              setWidth: () => output, setHeight: () => output,
              _template: template,
            };
            return output;
          },
        };
        return template;
      },
    },
    Logger: { log: () => {} },
    ScriptApp: {},
    PropertiesService: {},
    Date,
  };

  const ctx = vm.createContext(sandbox);
  const source = readdirSync(APPS_SCRIPT_DIR)
    .filter((f) => f.endsWith('.gs'))
    .sort()
    .map((f) => readFileSync(path.join(APPS_SCRIPT_DIR, f), 'utf-8'))
    .join('\n;\n');
  vm.runInContext(source, ctx, { filename: 'apps_script.gs' });

  const api = vm.runInContext(`({
    CONFIG, STATUS, COL,
    getGuests_, getGuestById_, makeToken_, backfillIds, rsvpLink_,
    exportInvites, exportReminders, exportRows_, buildCsv_, csvField_,
    parseSentLog_, applySentRecord_, importSentLog,
    doGet, submitRsvp, showSummary,
  })`, ctx);

  const cell = (guestIndex, header) =>
    guestsSheet.rows[guestIndex + 1][HEADERS.indexOf(header)];

  return { api, guestsSheet, ui, cell };
}
