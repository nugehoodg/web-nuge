import { continueRender, delayRender } from 'remotion';
import { LIGHT, TEXT as TEXT_DATA, XTHIN } from './fontData';

// Neue Haas Grotesk, exactly the files the site ships, embedded as data URLs (no network fetch).
// Uses only remotion core so the project also opens in the video-shotcraft workbench.
const FACES: [string, string, string][] = [
  ['NHG Display', XTHIN, '200'],
  ['NHG Display', LIGHT, '300'],
  ['NHG Text', TEXT_DATA, '400'],
];
let started = false;
export const loadFonts = () => {
  if (started || typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  started = true;
  const handle = delayRender('Neue Haas fonts');
  Promise.all(FACES.map(([family, src, weight]) => new FontFace(family, `url(${src})`, { weight }).load().then((f) => (document.fonts as FontFaceSet).add(f))))
    .catch((e) => console.error('font load failed', e))
    .finally(() => continueRender(handle));
};
export const DISPLAY = '"NHG Display", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const TEXT = '"NHG Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const INK = '#0a0a0a';
