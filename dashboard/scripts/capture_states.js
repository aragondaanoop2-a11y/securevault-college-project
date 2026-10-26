import puppeteer from 'puppeteer-core';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';

const outDir = path.join(os.tmpdir(), 'securevault-screenshots');

async function clickButtonWithText(page, text) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const t = await page.evaluate(el => el.textContent, b);
    if (t && t.includes(text)) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // 1. Open simulator
  await clickButtonWithText(page, 'Simulator');
  await new Promise(r => setTimeout(r, 600));

  // 2. Click "Tap Valid Tag"
  await clickButtonWithText(page, 'Tap Valid Tag');
  await new Promise(r => setTimeout(r, 500));

  // 3. Click "Submit PIN"
  await clickButtonWithText(page, 'Submit PIN');
  await new Promise(r => setTimeout(r, 600));

  // Screenshot showing OTP_PENDING with live OTP code and countdown ring
  await page.screenshot({ path: path.join(outDir, 'state_otp_pending.png') });
  console.log('Saved state_otp_pending.png');

  // 4. Click "Auto-Fill & Submit"
  await clickButtonWithText(page, 'Auto-Fill & Submit');
  await new Promise(r => setTimeout(r, 800));

  // Screenshot showing UNLOCKED state
  await page.screenshot({ path: path.join(outDir, 'state_unlocked.png') });
  console.log('Saved state_unlocked.png');

  // 5. Trigger Tamper to capture ALARM state
  await clickButtonWithText(page, 'Trigger Tamper');
  await new Promise(r => setTimeout(r, 600));

  // Screenshot showing ALARM state
  await page.screenshot({ path: path.join(outDir, 'state_alarm.png') });
  console.log('Saved state_alarm.png');

  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
