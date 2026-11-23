import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await page.goto('http://localhost:5173/?v=idleshot', { waitUntil: 'load' });
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.getElementById('graphic').offsetTop); });
const r = await page.evaluate(() => { const b = document.getElementById('roadWrap').getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, height: b.height }; });
const clip = { x: Math.max(0, r.x - 10), y: r.y - 60, width: 260, height: r.height + 70 };
for (const [name, ms] of [['a', 1300], ['b', 1450], ['c', 2250]]) {
  await new Promise((ok) => setTimeout(ok, name === 'a' ? ms : ms - (name === 'b' ? 1300 : 1450)));
  await page.screenshot({ path: `out/idle-${name}.png`, clip });
}
await browser.close();
