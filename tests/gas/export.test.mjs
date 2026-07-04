import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createEnv } from './harness.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SAMPLE_GUESTS = [
  { id: 'aaa', name: 'משפחת כהן', phone: '0501234567', status: 'PENDING' },
  { id: 'bbb', name: 'דנה, יוסי ובני', phone: '0527654321', status: 'PENDING' },
  { id: 'ccc', name: 'בלי טלפון', phone: '', status: 'PENDING' },
  { id: 'ddd', name: 'כבר נשלח', phone: '0530000001', status: 'SENT', reminder_count: 0 },
  { id: 'eee', name: 'תוזכר פעם', phone: '0530000002', status: 'SENT', reminder_count: 1 },
  { id: 'fff', name: 'מוצה', phone: '0530000003', status: 'SENT', reminder_count: 2 },
  { id: 'ggg', name: 'אישר', phone: '0530000004', status: 'CONFIRMED', attending_count: 2 },
];

test('exportRows_(invite) picks only PENDING guests with a phone', () => {
  const { api } = createEnv(SAMPLE_GUESTS);
  const rows = api.exportRows_('invite');

  assert.deepEqual(rows.map((r) => r.id), ['aaa', 'bbb']);
  assert.ok(rows.every((r) => r.kind === 'invite'));
  assert.equal(rows[0].link, api.CONFIG.RSVP_BASE_URL + '?token=aaa');
});

test('exportRows_(reminder) respects rsvp_at and MAX_PER_GUEST, numbers the round', () => {
  const { api } = createEnv(SAMPLE_GUESTS);
  const rows = api.exportRows_('reminder');

  assert.deepEqual(
    rows.map((r) => [r.id, r.kind]),
    [['ddd', 'reminder_1'], ['eee', 'reminder_2']],
  );
});

test('reminder export excludes guests who already responded', () => {
  const { api } = createEnv([
    { id: 'aaa', name: 'א', phone: '0501234567', status: 'SENT', rsvp_at: '2026-07-01' },
  ]);
  assert.deepEqual(api.exportRows_('reminder'), []);
});

test('buildCsv_ produces BOM + CRLF + RFC-4180 quoting', () => {
  const { api } = createEnv();
  const csv = api.buildCsv_([
    { id: 'aaa', name: 'דנה, יוסי ובני', phone: '0501234567', link: 'https://x?token=aaa', kind: 'invite' },
  ]);

  assert.ok(csv.startsWith('\uFEFF'));
  const lines = csv.replace('\uFEFF', '').split('\r\n');
  assert.equal(lines[0], 'id,name,phone,link,kind');
  assert.equal(lines[1], 'aaa,"דנה, יוסי ובני",0501234567,https://x?token=aaa,invite');
});

test('parseSentLog_ skips header, blanks and short lines; tolerates BOM', () => {
  const { api } = createEnv();
  const records = api.parseSentLog_(
    '\uFEFFid,phone,kind,sent_at\n' +
    'aaa,972501234567,invite,2026-07-04 18:32:11\n' +
    '\n' +
    'garbage\n' +
    'bbb,972527654321,reminder_1\n',
  );

  assert.deepEqual(records, [
    { id: 'aaa', phone: '972501234567', kind: 'invite', ts: '2026-07-04 18:32:11' },
    { id: 'bbb', phone: '972527654321', kind: 'reminder_1', ts: '' },
  ]);
});

test('importSentLog marks invites SENT with the log timestamp, idempotently', () => {
  const { api, cell } = createEnv(SAMPLE_GUESTS);
  const log = 'id,phone,kind,sent_at\n' +
    'aaa,972501234567,invite,2026-07-04 18:32:11\n' +
    'zzz,972500000000,invite,2026-07-04 18:33:00\n';

  const counts = api.importSentLog(log);
  assert.deepEqual(counts, { invites: 1, reminders: 0, skipped: 0, unknown: 1 });
  assert.equal(cell(0, 'status'), 'SENT');
  assert.equal(new Date(cell(0, 'sent_at')).getFullYear(), 2026);

  const again = api.importSentLog(log);
  assert.deepEqual(again, { invites: 0, reminders: 0, skipped: 1, unknown: 1 });
  assert.equal(cell(0, 'status'), 'SENT');
});

test('importSentLog raises reminder_count to the round, never twice', () => {
  const { api, cell } = createEnv(SAMPLE_GUESTS);

  let counts = api.importSentLog('ddd,972530000001,reminder_1,2026-07-05 09:00:00');
  assert.deepEqual(counts, { invites: 0, reminders: 1, skipped: 0, unknown: 0 });
  assert.equal(cell(3, 'reminder_count'), 1);

  // same round again (duplicate row in one paste) → skipped
  counts = api.importSentLog(
    'ddd,972530000001,reminder_1,2026-07-05 09:00:00\n' +
    'ddd,972530000001,reminder_1,2026-07-05 09:00:00',
  );
  assert.deepEqual(counts, { invites: 0, reminders: 0, skipped: 2, unknown: 0 });
  assert.equal(cell(3, 'reminder_count'), 1);

  // next round bumps to 2
  counts = api.importSentLog('ddd,972530000001,reminder_2,2026-07-12 09:00:00');
  assert.equal(counts.reminders, 1);
  assert.equal(cell(3, 'reminder_count'), 2);
});

test('round-trip: the Python sender log is understood by importSentLog', () => {
  // Have the real Python package send (mocked) everything in the committed
  // fixture and write its real sent_log.csv…
  const dir = mkdtempSync(path.join(tmpdir(), 'roundtrip-'));
  const logPath = path.join(dir, 'sent_log.csv');
  try {
    execFileSync('python3', ['-c', `
import sys
sys.path.insert(0, ${JSON.stringify(path.join(REPO, 'sender'))})
from wedding_sender.guests import load_guests
from wedding_sender.sentlog import SentLog

guests, warnings = load_guests(${JSON.stringify(path.join(REPO, 'tests', 'fixtures', 'export_sample.csv'))})
assert not warnings, warnings
log = SentLog(${JSON.stringify(logPath)})
for g in guests:
    log.mark(g)
`]);
    const logText = readFileSync(logPath, 'utf-8');

    // …then apply it to a Sheet holding the same guests.
    const { api, cell } = createEnv([
      { id: 'ab12cd34ef', name: 'משפחת כהן', phone: '0501234567', status: 'PENDING' },
      { id: 'cd34ef56ab', name: 'דנה ויוסי לוי', phone: '0527654321', status: 'PENDING' },
      { id: 'ef56ab78cd', name: 'סבתא רחל', phone: '0537654321', status: 'PENDING' },
    ]);
    const counts = api.importSentLog(logText);

    assert.deepEqual(counts, { invites: 3, reminders: 0, skipped: 0, unknown: 0 });
    for (const i of [0, 1, 2]) {
      assert.equal(cell(i, 'status'), 'SENT');
      assert.ok(cell(i, 'sent_at') instanceof Date);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
