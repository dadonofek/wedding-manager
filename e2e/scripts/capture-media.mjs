/**
 * Generates the "what a guest sees" media committed under docs/media/:
 *
 *   whatsapp-invite.png    the invite as it lands in WhatsApp (mock chat)
 *   rsvp-form.png          the RSVP page a guest opens from the link
 *   rsvp-form-filled.png   the form filled in
 *   rsvp-form-success.png  the thank-you state after submitting
 *   rsvp-form-invalid.png  what a broken/expired link shows
 *   rsvp-flow.gif          the full flow as a short animation
 *
 * Run `npm run media` (renders the form first). Requires the repo's
 * Playwright Chromium; ffmpeg is taken from Playwright's bundled build.
 */

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..');
const OUT = path.join(REPO, 'e2e', '.out');
const MEDIA = path.join(REPO, 'docs', 'media');

const FORM_URL = pathToFileURL(path.join(OUT, 'form.html')).href;
const INVALID_URL = pathToFileURL(path.join(OUT, 'form-invalid.html')).href;
const CHAT_URL = pathToFileURL(path.join(REPO, 'e2e', 'mocks', 'whatsapp-chat.html')).href;

const VIEWPORT = { width: 390, height: 844 }; // phone-sized

// The exact message the sender would send, from the real template.
const template = readFileSync(
  path.join(REPO, 'sender', 'wedding_sender', 'templates', 'invite.txt'), 'utf-8');
const INVITE_LINK = 'https://script.google.com/macros/s/XXXXXXXX/exec?token=e2etoken99';
const INVITE_TEXT = template
  .replace('{name}', 'משפחת ישראלי')
  .replace('{link}', INVITE_LINK)
  .trim();

async function openChat(page) {
  await page.goto(CHAT_URL);
  await page.evaluate(({ text, link }) => {
    const span = document.getElementById('message');
    const body = text.replace(link, '').trimEnd();
    span.textContent = body + '\n';
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = link;
    span.appendChild(a);
  }, { text: INVITE_TEXT, link: INVITE_LINK });
}

async function fillForm(page, { slowly = false } = {}) {
  const pause = (ms) => (slowly ? page.waitForTimeout(ms) : Promise.resolve());
  await pause(800);
  await page.locator('#attending').selectOption('2');
  await pause(700);
  await page.locator('#dietary').fill('צמחוני אחד, בלי גלוטן 🙏');
  await pause(700);
}

async function screenshots(browser) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });

  await openChat(page);
  await page.screenshot({ path: path.join(MEDIA, 'whatsapp-invite.png') });

  await page.goto(FORM_URL);
  await page.screenshot({ path: path.join(MEDIA, 'rsvp-form.png'), fullPage: true });

  await fillForm(page);
  await page.screenshot({ path: path.join(MEDIA, 'rsvp-form-filled.png'), fullPage: true });

  await page.locator('#send').click();
  await page.locator('#msg.ok').waitFor();
  await page.screenshot({ path: path.join(MEDIA, 'rsvp-form-success.png'), fullPage: true });

  await page.goto(INVALID_URL);
  await page.screenshot({ path: path.join(MEDIA, 'rsvp-form-invalid.png'), fullPage: true });

  await page.close();
  console.log('screenshots written to docs/media/');
}

async function video(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUT, size: VIEWPORT },
  });
  const page = await context.newPage();

  await openChat(page);              // guest receives the invite…
  await page.waitForTimeout(2200);
  await page.goto(FORM_URL);         // …taps the link…
  await fillForm(page, { slowly: true });
  await page.locator('#send').click();
  await page.locator('#msg.ok').waitFor();
  await page.waitForTimeout(2000);

  const webm = await page.video().path();
  await context.close();

  // Playwright's bundled ffmpeg has no GIF muxer, so: webm → PNG frames
  // (ffmpeg) → animated GIF (Pillow). `pip install pillow` once for this.
  const ffmpegDir = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const bundled = path.join(ffmpegDir, 'ffmpeg-1011', 'ffmpeg-linux');
  const framesDir = path.join(OUT, 'frames');
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  execFileSync(existsSync(bundled) ? bundled : 'ffmpeg', [
    '-y', '-i', webm,
    '-vf', 'scale=340:-1', '-r', '8',
    path.join(framesDir, '%04d.png'),
  ], { stdio: 'pipe' });

  const gif = path.join(MEDIA, 'rsvp-flow.gif');
  execFileSync('python3', ['-c', `
import glob, sys
from PIL import Image
frames = [Image.open(f).convert('P', palette=Image.ADAPTIVE, colors=128)
          for f in sorted(glob.glob(sys.argv[1] + '/*.png'))]
frames[0].save(sys.argv[2], save_all=True, append_images=frames[1:],
               duration=125, loop=0, optimize=True)
`, framesDir, gif], { stdio: 'pipe' });

  rmSync(framesDir, { recursive: true, force: true });
  rmSync(webm, { force: true });
  console.log('animation written to docs/media/rsvp-flow.gif');
}

mkdirSync(MEDIA, { recursive: true });
const browser = await chromium.launch();
try {
  await screenshots(browser);
  await video(browser);
} finally {
  await browser.close();
}
