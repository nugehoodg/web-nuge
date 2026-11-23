import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?v=probe', { waitUntil: 'load' });
console.log(await page.evaluate(() => ({ hover: matchMedia('(hover: hover)').matches, fine: matchMedia('(pointer: fine)').matches, anyHover: matchMedia('(any-hover: hover)').matches })));
await browser.close();
