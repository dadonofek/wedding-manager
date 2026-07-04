/**
 * Renders apps_script/RsvpForm.html — a Google Apps Script HtmlService
 * template — into plain HTML files for the Playwright tests and demo media.
 *
 * Supports the two scriptlet forms the form actually uses:
 *   <? code ?>      JS statements (if/for/braces)
 *   <?= expr ?>     HTML-escaped output
 * plus <?!= expr ?> (raw output) for completeness. Keep RsvpForm.html to
 * these simple forms — this is not a full HtmlService implementation.
 *
 * A <script> tag for the google.script.run shim is injected right after
 * <body> so the form's inline script finds `google` defined.
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const OUT = path.join(HERE, '.out');

// Fixture data mirroring what Rsvp.gs doGet() passes to the template.
export const FIXTURE_GUEST = { id: 'e2etoken99', name: 'משפחת ישראלי', maxGuests: 4 };
export const FIXTURE_WEDDING = {
  COUPLE: 'שרון ושגיא',
  DATE_ISO: '2026-08-20',
  TIME: '12:00',
  VENUE: 'חוות אדמה ושמים, יבניאל',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** Compile HtmlService-style scriptlets into a render function. */
export function compileTemplate(source) {
  const body = ['const __out = [];'];
  const re = /<\?(!?=)?([\s\S]*?)\?>/g;
  let last = 0;
  let match;
  while ((match = re.exec(source)) !== null) {
    body.push(`__out.push(${JSON.stringify(source.slice(last, match.index))});`);
    const [, form, code] = match;
    if (form === '=') body.push(`__out.push(__esc(${code}));`);
    else if (form === '!=') body.push(`__out.push(String(${code}));`);
    else body.push(code);
    last = re.lastIndex;
  }
  body.push(`__out.push(${JSON.stringify(source.slice(last))});`);
  body.push('return __out.join("");');
  const fn = new Function('guest', 'wedding', '__esc', body.join('\n'));
  return (data) => fn(data.guest, data.wedding, escapeHtml);
}

export function renderForm({ guest, wedding = FIXTURE_WEDDING }) {
  const source = readFileSync(path.join(REPO, 'apps_script', 'RsvpForm.html'), 'utf-8');
  const html = compileTemplate(source)({ guest, wedding });
  return html.replace(
    /<body>/,
    '<body>\n<script src="google-script-shim.js"></script>',
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'form.html'), renderForm({ guest: FIXTURE_GUEST }));
writeFileSync(path.join(OUT, 'form-invalid.html'), renderForm({ guest: null }));
copyFileSync(
  path.join(HERE, 'shim', 'google-script-shim.js'),
  path.join(OUT, 'google-script-shim.js'),
);
console.log(`rendered ${path.relative(REPO, OUT)}/form.html + form-invalid.html`);
