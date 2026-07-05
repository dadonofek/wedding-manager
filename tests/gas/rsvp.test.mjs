import assert from 'node:assert';
import test from 'node:test';

import { createEnv } from './harness.mjs';

const GUESTS = [
  { id: 'aaa', name: 'משפחת כהן', phone: '0501234567', max_guests: 4, status: 'SENT' },
  { id: 'bbb', name: 'דוד', phone: '0527654321', max_guests: 1, status: 'SENT' },
];

test('submitRsvp with attending > 0 confirms and records everything', () => {
  const { api, cell } = createEnv(GUESTS);

  const res = api.submitRsvp({ token: 'aaa', attending: '3', dietary: 'צמחוני x2' });

  assert.deepEqual(res, { ok: true, status: 'CONFIRMED' });
  assert.equal(cell(0, 'status'), 'CONFIRMED');
  assert.equal(cell(0, 'attending_count'), 3);
  assert.equal(cell(0, 'dietary'), 'צמחוני x2');
  assert.ok(cell(0, 'rsvp_at') instanceof Date);
});

test('submitRsvp with attending 0 declines', () => {
  const { api, cell } = createEnv(GUESTS);

  const res = api.submitRsvp({ token: 'bbb', attending: '0', dietary: '' });

  assert.deepEqual(res, { ok: true, status: 'DECLINED' });
  assert.equal(cell(1, 'status'), 'DECLINED');
  assert.equal(cell(1, 'attending_count'), 0);
  assert.equal(cell(1, 'dietary'), '');
});

test('resubmitting overwrites the previous answer, including clearing dietary', () => {
  const { api, cell } = createEnv(GUESTS);

  api.submitRsvp({ token: 'aaa', attending: '3', dietary: 'צמחוני x2' });
  const res = api.submitRsvp({ token: 'aaa', attending: '0', dietary: '' });

  assert.deepEqual(res, { ok: true, status: 'DECLINED' });
  assert.equal(cell(0, 'status'), 'DECLINED');
  assert.equal(cell(0, 'attending_count'), 0);
  assert.equal(cell(0, 'dietary'), '');   // old note cleared
});

test('submitRsvp with an unknown token fails safely', () => {
  const { api, cell } = createEnv(GUESTS);

  const res = api.submitRsvp({ token: 'nope', attending: '2', dietary: '' });

  assert.deepEqual(res, { ok: false, error: 'not_found' });
  assert.equal(cell(0, 'status'), 'SENT'); // untouched
});

test('doGet passes the guest to the template, or null for a bad token', () => {
  const { api } = createEnv(GUESTS);

  const ok = api.doGet({ parameter: { token: 'aaa' } });
  assert.deepEqual(ok._template.guest, {
    id: 'aaa', name: 'משפחת כהן', responded: false, attending: -1, dietary: '',
  });
  assert.equal(ok._template.wedding, api.CONFIG.WEDDING);

  const bad = api.doGet({ parameter: { token: 'zzz' } });
  assert.equal(bad._template.guest, null);
});

test('doGet passes the previous answer for a guest who already responded', () => {
  const { api } = createEnv([
    { id: 'ccc', name: 'רועי', status: 'CONFIRMED', attending_count: 2, dietary: 'לא אוכל חלב' },
    { id: 'ddd', name: 'נועה', status: 'DECLINED', attending_count: 0 },
  ]);

  const confirmed = api.doGet({ parameter: { token: 'ccc' } });
  assert.deepEqual(confirmed._template.guest, {
    id: 'ccc', name: 'רועי', responded: true, attending: 2, dietary: 'לא אוכל חלב',
  });

  const declined = api.doGet({ parameter: { token: 'ddd' } });
  assert.deepEqual(declined._template.guest, {
    id: 'ddd', name: 'נועה', responded: true, attending: 0, dietary: '',
  });
});

test('showSummary counts households, heads and pending', () => {
  const { api, ui } = createEnv([
    { id: 'a', name: 'א', status: 'CONFIRMED', attending_count: 3 },
    { id: 'b', name: 'ב', status: 'CONFIRMED', attending_count: 2 },
    { id: 'c', name: 'ג', status: 'DECLINED' },
    { id: 'd', name: 'ד', status: 'SENT' },
    { id: 'e', name: 'ה', status: 'PENDING' },
  ]);

  api.showSummary();

  const alert = ui.alerts[0];
  assert.match(alert, /מגיעים \(משקי בית\): 2/);
  assert.match(alert, /סה"כ אורחים: 5/);
  assert.match(alert, /לא מגיעים: 1/);
  assert.match(alert, /ממתינים לתשובה: 1/);
  assert.match(alert, /טרם הוזמנו: 1/);
});

test('backfillIds fills missing ids and default status', () => {
  const { api, cell } = createEnv([
    { id: '', name: 'חדש', phone: '0501111111', status: '' },
    { id: 'keep', name: 'קיים', phone: '0502222222', status: 'SENT' },
  ]);

  api.backfillIds();

  assert.equal(String(cell(0, 'id')).length, 10);
  assert.equal(cell(0, 'status'), 'PENDING');
  assert.equal(cell(1, 'id'), 'keep');
  assert.equal(cell(1, 'status'), 'SENT');
});
