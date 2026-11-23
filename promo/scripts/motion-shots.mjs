// Screenshots: bento tiles mid-reveal, and the page bottom with the back-to-top button.
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await page.goto('http://localhost:5173/?v=motionshots', { waitUntil: 'load' });
await sleep(1200);
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.getElementById('graphic').offsetTop); });
await sleep(420);
await page.screenshot({ path: 'out/motion-tiles-mid.png' });
await sleep(1800);
await page.screenshot({ path: 'out/motion-tiles-done.png' });
await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await sleep(1500);
await page.screenshot({ path: 'out/motion-bottom.png' });
await browser.close();
