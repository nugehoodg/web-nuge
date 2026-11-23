// Final asset capture (video-shotcraft stage 4): 2x backplates, transparent cutouts,
// and src/layout.json with element bboxes, all from the live site at 1920x1080.
// Run with the site served at http://localhost:5173:  node scripts/capture.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'textures');
const BASE = 'http://localhost:5173/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 180000 });
await page.evaluate(() => document.fonts.ready);
// Hide the site's own toy cursor and orbit/confetti layers we rebuild ourselves.
await page.addStyleTag({ content: `#toyCursor,#confetti{display:none!important} html{scroll-behavior:auto!important}` });

const layout = {};
const rectOf = async (sel, rel = null) => page.evaluate((sel, rel) => {
  const els = [...document.querySelectorAll(sel)];
  const base = rel ? document.querySelector(rel).getBoundingClientRect() : { left: 0, top: 0 };
  return els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; });
}, sel, rel);
const toSection = async (id) => {
  await page.evaluate((id) => scrollTo(0, document.getElementById(id).offsetTop), id);
  await sleep(1500);
};
const shotEl = async (sel, file, transparent = true) => {
  const el = await page.$(sel);
  await el.screenshot({ path: path.join(OUT, file), omitBackground: transparent });
};
const shotView = async (file) => page.screenshot({ path: path.join(OUT, file) });

// ---------- 1. landing ----------
await toSection('landing');
await page.addStyleTag({ content: '#orbit{visibility:hidden}' });
await sleep(500);
layout.landing = {
  nav: (await rectOf('.top-nav', '#landing'))[0],
  h1: (await rectOf('.hero-title h1', '#landing'))[0],
  sub: (await rectOf('.hero-title p', '#landing'))[0],
};
await shotEl('.top-nav', 'landing-nav.png');
await shotEl('.hero-title', 'landing-title.png');
layout.landing.title = (await rectOf('.hero-title', '#landing'))[0];

// ---------- 2. graphic design ----------
await toSection('graphic');
await page.evaluate(() => { document.getElementById('gallery').scrollLeft = 0; });
await sleep(2500);
// make every design load so cutouts are complete
await page.evaluate(async () => {
  const sc = document.getElementById('gallery');
  for (let x = 0; x <= sc.scrollWidth; x += 800) { sc.scrollLeft = x; await new Promise((r) => setTimeout(r, 120)); }
  sc.scrollLeft = 0;
});
await sleep(4000);
layout.graphic = {
  section: (await rectOf('#graphic'))[0],
  title: (await rectOf('.section-title', '#graphic'))[0],
  road: (await rectOf('#roadWrap', '#graphic'))[0],
  car: (await rectOf('#car', '#graphic'))[0],
  toggle: (await rectOf('#destroyBtn', '#graphic'))[0],
  destroyWord: (await rectOf('#destroyBtn [data-mode="destroy"]', '#graphic'))[0],
  hint: (await rectOf('#gdHint', '#graphic'))[0],
  trackW: await page.evaluate(() => document.getElementById('track').scrollWidth),
  designs: await page.evaluate(() => {
    const items = window.PROJECTS || [];
    return [...document.querySelectorAll('.design')].map((el, i) => {
      const m = el.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
      return { i, src: items[i] && items[i].src, type: items[i] && items[i].type, title: items[i] && items[i].title,
        x: m ? +m[1] : 0, y: m ? +m[2] : 0, w: parseFloat(el.style.width), h: parseFloat(el.style.height) };
    });
  }),
};
await shotEl('.section-title', 'graphic-title.png');
await shotEl('.gd-bottom', 'graphic-bottom.png');
layout.graphic.bottom = (await rectOf('.gd-bottom', '#graphic'))[0];
// Destroy-pressed state of the toggle (Arrange active) for after the tap
await page.evaluate(() => document.getElementById('destroyBtn').setAttribute('aria-pressed', 'true'));
await page.evaluate(() => { document.getElementById('gdHint').textContent = 'Grab and throw the designs'; });
await sleep(300);
await shotEl('.gd-bottom', 'graphic-bottom-destroyed.png');
await page.evaluate(() => document.getElementById('destroyBtn').setAttribute('aria-pressed', 'false'));
await page.evaluate(() => { document.getElementById('gdHint').textContent = 'Drag the car'; });

// ---------- 3. video editing ----------
await toSection('video');
await sleep(1500);
await page.evaluate(() => { const v = document.getElementById('player'); v.pause(); v.removeAttribute('src'); v.load(); });
await page.addStyleTag({ content: '#playhead{visibility:hidden} .clip.active .body{outline:none!important}' });
// project name + timecode are animated in the video, so measure them first then blank them
const projRect = (await rectOf('#projectName', '#video'))[0];
const timeRect = (await rectOf('#veTime', '#video'))[0];
await page.addStyleTag({ content: '#projectName,#veTime{visibility:hidden}' });
await sleep(600);
layout.video = {
  section: (await rectOf('#video'))[0],
  header: (await rectOf('.ve-header', '#video'))[0],
  project: projRect,
  preview: (await rectOf('.ve-preview', '#video'))[0],
  timeline: (await rectOf('.ve-timeline', '#video'))[0],
  scroll: (await rectOf('#veScroll', '#video'))[0],
  lane: (await rectOf('#veLane', '#video'))[0],
  clips: await rectOf('.clip', '#video'),
  clipBodies: await rectOf('.clip .body', '#video'),
  time: timeRect,
};
await shotView('video-backplate.png');

// ---------- 4. box ----------
await page.evaluate(() => scrollTo(0, document.getElementById('about').offsetTop));
await sleep(1500);
layout.about = {
  section: (await rectOf('#about'))[0],
  box: (await rectOf('.box', '#about'))[0],
  items: Object.fromEntries(await Promise.all(['camera', 'paper', 'photo', 'controller'].map(async (k) => [k, (await rectOf('.item.' + k, '#about'))[0]]))),
};
// info cards: show each tooltip, screenshot it
await page.evaluate(() => { const t = document.getElementById('tip'); t.style.transition = 'none'; t.classList.add('show'); });
await sleep(400);
for (const k of ['paper', 'camera', 'controller', 'photo', 'paper']) {
  await page.evaluate((k) => {
    const item = document.querySelector('.item.' + k);
    const tip = document.getElementById('tip');
    tip.querySelector('strong').textContent = item.dataset.title;
    tip.querySelector('p').textContent = item.dataset.text.split('|').join('\n');
    tip.classList.toggle('multi', item.dataset.text.includes('|'));
    tip.classList.remove('docked');
    tip.style.left = '200px'; tip.style.top = '200px';
    tip.style.transition = 'none';
    tip.classList.add('show');
  }, k);
  await sleep(250);
  await shotEl('#tip', `tip-${k}.png`, true);
  layout.about['tip_' + k] = (await rectOf('#tip'))[0];
}
await page.evaluate(() => document.getElementById('tip').classList.remove('show'));
await page.addStyleTag({ content: '.item{visibility:hidden}' });
await sleep(400);
// clip is in document coordinates
const aboutTop = await page.evaluate(() => document.getElementById('about').offsetTop);
await page.screenshot({ path: path.join(OUT, 'about-backplate.png'), clip: { x: 0, y: aboutTop, width: 1920, height: 1080 }, captureBeyondViewport: true });
layout.about.viewportTop = await page.evaluate(() => document.getElementById('about').getBoundingClientRect().top);

fs.mkdirSync(path.join(ROOT, 'src'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src', 'layout.json'), JSON.stringify(layout, null, 1));
await browser.close();
console.log('textures:', fs.readdirSync(OUT).join(', '));
console.log('designs:', layout.graphic.designs.length, 'trackW', layout.graphic.trackW, 'clips', layout.video.clips.length);
