// Samples the car's idle animation in headless Chrome, with and without reduced motion.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
for (const reduce of [false, true]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }]);
  await page.goto('http://localhost:5173/?v=idletest', { waitUntil: 'load' });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.getElementById('graphic').offsetTop); });
  const r = await page.evaluate(async () => {
    const car = document.getElementById('car'), puffs = [...document.querySelectorAll('.car-puff')], label = document.querySelector('.car-drag-label');
    const s = []; const t0 = performance.now();
    while (performance.now() - t0 < 5000) {
      await new Promise((ok) => requestAnimationFrame(ok));
      const m = car.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) rotate\(([-\d.]+)deg/);
      s.push([+m[1], +m[2], +m[3], Math.max(...puffs.map((p) => +p.style.opacity || 0)), +label.style.opacity || 0]);
    }
    const col = (i) => s.map((x) => x[i]); const rg = (a) => [Math.min(...a), Math.max(...a)].map((v) => +v.toFixed(1));
    // touch the car: the animation must stop at once
    car.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 10, clientY: 10 }));
    await new Promise((ok) => setTimeout(ok, 300));
    const m = car.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
    car.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    return { frames: s.length, x: rg(col(0)), y: rg(col(1)), tilt: rg(col(2)), puff: +Math.max(...col(3)).toFixed(2), label: +Math.max(...col(4)).toFixed(2), afterTouch: [+m[1], +m[2]] };
  });
  console.log(reduce ? 'reduced motion' : 'normal        ', JSON.stringify(r));
  await page.close();
}
await browser.close();
