import puppeteer from 'puppeteer-core';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';

const outDir = path.join(os.tmpdir(), 'securevault-screenshots');

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Desktop 1440x960
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
  console.log('Navigating to http://127.0.0.1:5173 ...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const desktopPath = path.join(outDir, 'desktop_1440.png');
  await page.screenshot({ path: desktopPath });
  console.log('Saved desktop screenshot to', desktopPath);

  // 2. Mobile 390x844
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 800));
  const mobilePath = path.join(outDir, 'mobile_390.png');
  await page.screenshot({ path: mobilePath });
  console.log('Saved mobile screenshot to', mobilePath);

  // 3. Desktop with Simulator Drawer Open
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 500));
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Simulator')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 800));
  const simPath = path.join(outDir, 'simulator_open.png');
  await page.screenshot({ path: simPath });
  console.log('Saved simulator drawer screenshot to', simPath);

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
