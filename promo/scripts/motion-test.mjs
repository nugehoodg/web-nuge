// Checks scroll reveals and the back-to-top button in headless Chrome (motion allowed / reduced).
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
for (const reduce of [false, true]) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: 1366, height: 768 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }]);
  await page.goto('http://localhost:5173/?v=motiontest2', { waitUntil: 'load' });
  await sleep(1500);
  const count = () => page.evaluate(() => {
    const all = [...document.querySelectorAll('[data-reveal]')];
    const by = (sel) => { const e = [...document.querySelectorAll(sel)].filter((x) => x.dataset.reveal); return `${e.filter((x) => x.classList.contains('in')).length}/${e.length}`; };
    return { revealed: `${all.filter((e) => e.classList.contains('in')).length}/${all.length}`, nav: by('.top-nav > *'), hero: by('.hero-title > *'), tiles: by('.tile'), clips: by('.clip'), items: by('.item'),
      toTop: document.querySelector('.to-top').classList.contains('show') };
  });
  const atLoad = await count();
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  for (const id of ['graphic', 'video', 'about']) {
    await page.evaluate((id) => scrollTo(0, document.getElementById(id).offsetTop), id);
    await sleep(900);
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await sleep(1200);
  const atBottom = await count();
  // opacity of a tile after its transition
  const tileOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('.tile')).opacity);
  // click back to top
  const btn = await page.$('.to-top');
  await btn.click();
  await sleep(reduce ? 400 : 1800);
  const after = await page.evaluate(() => ({ scrollY: Math.round(scrollY), toTop: document.querySelector('.to-top').classList.contains('show') }));
  console.log(reduce ? 'REDUCED' : 'MOTION ', JSON.stringify({ atLoad, atBottom, tileOpacity, afterClick: after, errors }));
  await page.screenshot({ path: `out/motion-${reduce ? 'reduced' : 'motion'}-bottom.png` });
  await page.close();
}
await browser.close();
