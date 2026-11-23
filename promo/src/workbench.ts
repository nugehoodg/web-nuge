// Workbench manifest (video-shotcraft references/workbench.md §2). Same-source rule: every table
// is imported from timeline.ts / sfx.ts; nothing here is a second copy of the timing.
import React from 'react';
import { AUDIO_START_SEC, FPS, H, SHOTS, TOTAL, W, beatF } from './timeline';
import { CUES, cueFrom } from './sfx';
import { Promo } from './Promo';
import { S1Orbit } from './shots/S1Orbit';
import { S2Line } from './shots/S2Line';
import { S3Drive } from './shots/S3Drive';
import { S4Destroy } from './shots/S4Destroy';
import { S6Scrub } from './shots/S6Scrub';
import { S8Box } from './shots/S8Box';
import { S9Stamp } from './shots/S9Stamp';
import { RodCut } from './components/RodCut';

const len = (k: keyof typeof SHOTS) => SHOTS[k].to - SHOTS[k].from;
export const CutDestroyToScrub: React.FC = () =>
  React.createElement(RodCut, { before: React.createElement(S4Destroy), beforeFrame: len('s4_destroy') - 1, after: React.createElement(S6Scrub), afterFrame: 0 });
export const CutScrubToBox: React.FC = () =>
  React.createElement(RodCut, { before: React.createElement(S6Scrub), beforeFrame: len('s6_scrub') - 1, after: React.createElement(S8Box), afterFrame: 0 });

const shot = (id: keyof typeof SHOTS, label: string, component: React.FC) => ({ id, label, from: SHOTS[id].from, duration: len(id), component });

export const WORKBENCH = {
  name: 'Anugerah · portfolio promo (Hands-on)',
  fps: FPS, width: W, height: H,
  total: TOTAL,
  background: '#ffffff',
  shots: [
    shot('s1_orbit', 'S1 Orbit (carousel-3d)', S1Orbit),
    shot('s2_line', 'S2 Divider line (line-carry)', S2Line),
    shot('s3_drive', 'S3 Car drive (multiplane)', S3Drive),
    shot('s4_destroy', 'S4 Destroy (bullet-time)', S4Destroy),
    shot('s6_scrub', 'S6 Scrub (timeline-travel)', S6Scrub),
    shot('s8_box', 'S8 Box (contact-shadow-lift)', S8Box),
    shot('s9_stamp', 'S9 Stamp (misregistration-hit)', S9Stamp),
  ],
  transitions: [
    { id: 'cut1', label: 'Rod cut 1 (invisible-cut)', from: SHOTS.s5_cut.from, duration: len('s5_cut'), component: CutDestroyToScrub },
    { id: 'cut2', label: 'Rod cut 2 (invisible-cut)', from: SHOTS.s7_cut.from, duration: len('s7_cut'), component: CutScrubToBox, cardId: 'cut1' },
  ],
  captions: [],
  overlays: [],
  sfx: CUES.map((c) => ({ from: cueFrom(c), duration: Math.round((c.dur ?? 1.2) * FPS), src: c.src, volume: c.volume, label: c.note })),
  bgm: [{ from: 0, duration: TOTAL, src: 'audio/house-vibez.mp3', volume: 0.8, startFrom: Math.round(AUDIO_START_SEC * FPS), fadeOutFrom: beatF(158) }],
  original: Promo,
};
