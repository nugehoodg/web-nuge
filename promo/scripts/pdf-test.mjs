// Test: build the site's brand-guideline PDF in headless Chrome, save it, and screenshot each page.
// node scripts/pdf-test.mjs <out.pdf> [projectIndex|all] [screenshotDir]
import puppeteer from 'puppeteer-core';
const [out, which = 'all', shots] = process.argv.slice(2);
const log = (m) => console.log(new Date().toISOString().slice(11, 19), m);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 600000 });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 });
await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 120000 });
log('loaded');
await page.evaluate((which) => { window.print = () => {}; which === 'all' ? window.ProjectView.printAll() : window.ProjectView.print([+which]); }, which);
await page.waitForFunction(() => document.documentElement.classList.contains('print-ready'), { timeout: 240000, polling: 500 });
log('doc built, images loaded');
await page.emulateMediaType('print');
if (shots) {
  const pages = await page.$$('#printDoc .pdf-page');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${shots}/p${String(i + 1).padStart(2, '0')}.png` });
  log('page screenshots ' + pages.length);
}
await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, timeout: 600000 });
log('pdf written');
await browser.close();
