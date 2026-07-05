import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.out');
const FORM_URL = pathToFileURL(path.join(OUT, 'form.html')).href;
const RESPONDED_URL = pathToFileURL(path.join(OUT, 'form-responded.html')).href;
const INVALID_URL = pathToFileURL(path.join(OUT, 'form-invalid.html')).href;

test.describe('RSVP form — guest with a valid token', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FORM_URL);
  });

  test('renders RTL Hebrew with the guest name and wedding details', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1')).toContainText('משפחת ישראלי');
    await expect(page.locator('.sub')).toContainText('שרון ושגיא');
    await expect(page.locator('.sub')).toContainText('חוות אדמה ושמים');
  });

  test('attendance dropdown covers 0..10 with a decline label on 0', async ({ page }) => {
    const options = page.locator('#attending option');
    await expect(options).toHaveCount(12); // placeholder + 0..10
    await expect(options.nth(1)).toHaveText('0 — לא נגיע');
    await expect(options.nth(11)).toHaveText('10');
  });

  test('submitting without choosing shows an inline error and calls nothing', async ({ page }) => {
    await page.locator('#send').click();

    await expect(page.locator('#msg')).toBeVisible();
    await expect(page.locator('#msg')).toHaveClass(/err/);
    await expect(page.locator('#msg')).toContainText('אנא בחרו');
    expect(await page.evaluate(() => window.__rsvpCalls)).toHaveLength(0);
  });

  test('happy path: confirm 2 guests with a dietary note', async ({ page }) => {
    await page.locator('#attending').selectOption('2');
    await page.locator('#dietary').fill('צמחוני אחד, בלי גלוטן');
    await page.locator('#send').click();

    await expect(page.locator('#msg')).toHaveClass(/ok/);
    await expect(page.locator('#msg')).toContainText('נתראה בשמחה');

    const calls = await page.evaluate(() => window.__rsvpCalls);
    expect(calls).toEqual([
      { token: 'e2etoken99', attending: '2', dietary: 'צמחוני אחד, בלי גלוטן' },
    ]);
  });

  test('declining (0 guests) gets the decline thank-you', async ({ page }) => {
    await page.locator('#attending').selectOption('0');
    await page.locator('#send').click();

    await expect(page.locator('#msg')).toHaveClass(/ok/);
    await expect(page.locator('#msg')).toContainText('תודה על העדכון');
  });

  test('a server failure shows an error and re-enables the button', async ({ page }) => {
    await page.evaluate(() => { window.__shimMode = 'failure'; });
    await page.locator('#attending').selectOption('1');
    await page.locator('#send').click();

    await expect(page.locator('#msg')).toHaveClass(/err/);
    await expect(page.locator('#msg')).toContainText('אירעה שגיאה');
    await expect(page.locator('#send')).toBeEnabled();
    await expect(page.locator('#send')).toHaveText('שליחת אישור');
  });

  test('a server-side rejection also surfaces as an error', async ({ page }) => {
    await page.evaluate(() => { window.__shimMode = 'server-error'; });
    await page.locator('#attending').selectOption('1');
    await page.locator('#send').click();

    await expect(page.locator('#msg')).toHaveClass(/err/);
    await expect(page.locator('#send')).toBeEnabled();
  });
});

test.describe('RSVP form — guest who already responded', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(RESPONDED_URL);
  });

  test('opens pre-filled with the previous answer and an update note', async ({ page }) => {
    await expect(page.locator('.update-note')).toContainText('לעדכן');
    await expect(page.locator('#attending')).toHaveValue('2');
    await expect(page.locator('#dietary')).toHaveValue('צמחוני אחד, בלי גלוטן');
    await expect(page.locator('#send')).toHaveText('עדכון תשובה');
  });

  test('changing the answer submits the new values', async ({ page }) => {
    await page.locator('#attending').selectOption('4');
    await page.locator('#dietary').fill('');
    await page.locator('#send').click();

    await expect(page.locator('#msg')).toHaveClass(/ok/);
    const calls = await page.evaluate(() => window.__rsvpCalls);
    expect(calls).toEqual([{ token: 'e2etoken99', attending: '4', dietary: '' }]);
  });

  test('a first-time guest sees no update note and the regular button', async ({ page }) => {
    await page.goto(FORM_URL);
    await expect(page.locator('.update-note')).toHaveCount(0);
    await expect(page.locator('#attending')).toHaveValue('');
    await expect(page.locator('#send')).toHaveText('שליחת אישור');
  });
});

test.describe('RSVP form — invalid/expired token', () => {
  test('shows the not-found screen without a form', async ({ page }) => {
    await page.goto(INVALID_URL);

    await expect(page.locator('.notfound')).toContainText('הקישור אינו תקין');
    await expect(page.locator('#attending')).toHaveCount(0);
    await expect(page.locator('#send')).toHaveCount(0);
  });
});
