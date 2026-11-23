// Screenshot each styleframe at 1920x1080 and build a contact sheet.
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--allow-file-access-from-files'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'index.html')).href, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
for (const id of ['f1', 'f2', 'f3']) {
  const el = await page.$('#' + id);
  await el.screenshot({ path: path.join(here, `hands-on-${id}.png`) });
}
await browser.close();
console.log('done');
