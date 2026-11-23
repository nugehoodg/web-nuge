// Styleframe source captures (2x) of the live site. No mouse movement, so the
// site's own toy cursor stays hidden; the styleframes draw the hand themselves.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
const to = async (id, wait = 2500) => {
  await page.evaluate((id) => scrollTo(0, document.getElementById(id).offsetTop), id);
  await sleep(wait);
};

await sleep(5000);
await page.screenshot({ path: path.join(OUT, 'landing@2x.png') });

await to('graphic');
await page.evaluate(() => { document.getElementById('gallery').scrollLeft = 1400; });
await sleep(4000);
await page.screenshot({ path: path.join(OUT, 'gallery@2x.png') });
await page.evaluate(() => document.getElementById('destroyBtn').click());
await sleep(5000);
await page.screenshot({ path: path.join(OUT, 'destroy@2x.png') });
await page.evaluate(() => document.getElementById('destroyBtn').click());

await to('video', 4000);
await page.screenshot({ path: path.join(OUT, 'video@2x.png') });

await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
await sleep(2000);
await page.screenshot({ path: path.join(OUT, 'box@2x.png') });

await browser.close();
console.log(fs.readdirSync(OUT));
