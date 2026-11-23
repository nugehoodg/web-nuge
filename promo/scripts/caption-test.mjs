// Tile captions: hidden until hover on desktop, always visible on touch.
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const op = (page, i) => page.evaluate((i) => getComputedStyle(document.querySelectorAll('.tile .tile-info')[i]).opacity, i);
// desktop with a mouse
let page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: process.argv[2] || 'no-preference' }]);
await page.goto('http://localhost:5173/?v=cap2', { waitUntil: 'load' });
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.getElementById('graphic').offsetTop); });
await sleep(2500);
const before = [await op(page, 0), await op(page, 1)];
const box = await (await page.$('.tile')).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await sleep(600);
const hovered = [await op(page, 0), await op(page, 1)];
await page.screenshot({ path: 'out/caption-hover.png' });
console.log('desktop  before hover', before, ' hovering tile 1', hovered);
await page.close();
// phone (touch, no hover)
page = await browser.newPage();
await page.emulate({ viewport: { width: 375, height: 812, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
await page.goto('http://localhost:5173/?v=cap2', { waitUntil: 'load' });
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.getElementById('graphic').offsetTop); });
await sleep(2500);
console.log('phone    captions', [await op(page, 0), await op(page, 1)], 'hover media:', await page.evaluate(() => matchMedia('(hover: hover)').matches));
await browser.close();
