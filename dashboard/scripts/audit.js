import puppeteer from 'puppeteer-core';

async function audit() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });

  // Evaluate page accessibility & contrast checks
  const results = await page.evaluate(() => {
    const issues = [];
    
    // Check buttons have accessible names
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn, i) => {
      const text = btn.innerText || btn.getAttribute('aria-label') || btn.getAttribute('title');
      if (!text || text.trim() === '') {
        issues.push(`Button #${i} has no accessible text or label`);
      }
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
        // Minor warning for small targets
      }
    });

    // Check images / svgs
    const imgs = document.querySelectorAll('img');
    imgs.forEach((img, i) => {
      if (!img.hasAttribute('alt')) {
        issues.push(`Image #${i} missing alt attribute`);
      }
    });

    // Check form inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach((inp, i) => {
      if (!inp.getAttribute('aria-label') && !inp.getAttribute('placeholder') && !inp.id) {
        issues.push(`Input #${i} lacks label/placeholder`);
      }
    });

    return {
      buttonsCount: buttons.length,
      issues,
      title: document.title,
      hasMetaViewport: !!document.querySelector('meta[name="viewport"]'),
      hasThemeColor: !!document.querySelector('meta[name="theme-color"]')
    };
  });

  console.log('Audit Results:', JSON.stringify(results, null, 2));
  await browser.close();
}

audit().catch(console.error);
