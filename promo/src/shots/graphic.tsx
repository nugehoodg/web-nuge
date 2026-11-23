import React from 'react';
import { Img, Loop, OffthreadVideo, staticFile } from 'remotion';
import layout from '../layout.json';
import { clamp01 } from '../lib/motion';
import { DISPLAY } from '../lib/fonts';

// Shared pieces of the Graphic Design screen, positioned from layout.json (site coordinates).
export const G = layout.graphic;
export const CAR = G.car.w; // 73px
export const ROAD_H = G.road.h;
export const ROAD_Y = ROAD_H - 10; // dotted line inside the road box (same as main.js)
export const ROAD_W = G.road.w;
export const MAX_SCROLL = G.trackW - 1920;
export const DESIGNS = G.designs;
// durations of the gallery's video projects (ffprobe), for seamless loops
const LOOP_SEC: Record<string, number> = {
  'videos/oinko.webm': 4.16, 'videos/new_web.webm': 15.8, 'videos/taila.webm': 5.9,
  'videos/fishcannies.webm': 2.5, 'videos/milkies.webm': 5.83, 'videos/vending_01.webm': 12.35,
};
// Animated GIF tiles are played as H.264 loops (public/videos-h264/gif-*.mp4) so every render is
// frame-identical — a browser-played GIF runs on wall-clock time (final review A8).
const GIF_SEC: Record<string, number> = {
  'img/3d_01.gif': 1.066, 'img/breadshop.gif': 6.7, 'img/coffee_02.gif': 2.066,
  'img/Mockup_01.gif': 5.0, 'img/money_01.gif': 2.066, 'img/redrum.gif': 4.2,
};
const fill: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
/** Any project medium (still, GIF or video) filling its box, deterministic in every render. */
export const Media: React.FC<{ src: string }> = ({ src }) => {
  if (src.endsWith('.gif')) {
    const name = src.split('/').pop()!.replace('.gif', '');
    return (
      <Loop durationInFrames={Math.floor((GIF_SEC[src] ?? 2) * 30)}>
        <OffthreadVideo src={staticFile(`videos-h264/gif-${name}.mp4`)} muted style={fill} />
      </Loop>
    );
  }
  if (src.endsWith('.webm')) {
    return (
      <Loop durationInFrames={Math.floor((LOOP_SEC[src] ?? 4) * 30)}>
        <OffthreadVideo src={staticFile('videos-h264/' + src.split('/').pop()!.replace('.webm', '.mp4'))} muted style={fill} />
      </Loop>
    );
  }
  return <Img src={staticFile(src)} style={fill} />;
};

/** Road wobble identical to main.js: ripple from the car, amplitude driven by car speed. */
export const roadWave = (x: number, carX: number, A: number, t: number) => {
  const dx = Math.abs(x - (carX + CAR / 2));
  return A * Math.sin(dx * 0.045 - t * 9) * Math.exp(-dx / 380);
};

/** Deterministic replay of main.js's wobble amplitude for a car track carXAt(frame). */
export const wobbleAmp = (f: number, carXAt: (f: number) => number) => {
  let A = 0;
  for (let k = 0; k <= f; k++) {
    const v = carXAt(k) - carXAt(k - 1);
    A = Math.min(16, A * 0.93 + Math.abs(v) * 0.18);
  }
  return A;
};

export const Road: React.FC<{ carX: number; A: number; t: number; reveal?: number; hop?: number; facing?: number; showCar?: boolean }> = ({ carX, A, t, reveal = 1, hop = 0, facing = 1, showCar = true }) => {
  let d = '';
  const end = ROAD_W * clamp01(reveal);
  for (let x = 0; x <= end; x += 6) d += (x ? 'L' : 'M') + x.toFixed(1) + ' ' + (ROAD_Y + roadWave(x, carX, A, t)).toFixed(2);
  const cxm = carX + CAR / 2;
  const yL = roadWave(cxm - 16, carX, A, t), yR = roadWave(cxm + 16, carX, A, t), yC = roadWave(cxm, carX, A, t);
  const ang = (Math.atan2(yR - yL, 32) * 180) / Math.PI;
  return (
    <div style={{ position: 'absolute', left: G.road.x, top: G.road.y, width: ROAD_W, height: ROAD_H }}>
      <svg width={ROAD_W} height={ROAD_H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path d={d} fill="none" stroke="#0a0a0a" strokeWidth={2} strokeDasharray="1.5 4" strokeLinecap="round" />
      </svg>
      {showCar && (
        <Img src={staticFile('ui/carbon--car.png')} style={{
          position: 'absolute', left: 0, top: 0, width: CAR, height: CAR, transformOrigin: '50% 100%',
          transform: `translate(${carX.toFixed(2)}px, ${(ROAD_Y + yC - CAR + 4 - hop).toFixed(2)}px) rotate(${ang.toFixed(2)}deg) scaleX(${facing})`,
        }} />
      )}
    </div>
  );
};

/** Title, Destroy/Arrange toggle and the "0n / 04" counter (0x layer: never moves with the drive). */
export const GraphicChrome: React.FC<{ destroyed?: boolean; counter?: number; counterAlpha?: number }> = ({ destroyed = false, counter = 2, counterAlpha = 1 }) => (
  <>
    <Img src={staticFile('textures/graphic-title.png')} style={{ position: 'absolute', left: G.title.x, top: G.title.y, width: G.title.w, height: G.title.h }} />
    <Img src={staticFile(destroyed ? 'textures/graphic-bottom-destroyed.png' : 'textures/graphic-bottom.png')}
      style={{ position: 'absolute', left: G.bottom.x, top: G.bottom.y, width: G.bottom.w, height: G.bottom.h }} />
    <Counter n={counter} alpha={counterAlpha} />
  </>
);

export const Counter: React.FC<{ n: number; alpha?: number; dark?: boolean }> = ({ n, alpha = 1, dark = false }) => (
  <div style={{
    position: 'absolute', top: 48, right: 60, padding: '6px 16px 10px', borderRadius: 3, opacity: alpha,
    background: dark ? 'transparent' : '#fff', color: dark ? '#fff' : '#0a0a0a',
    fontFamily: DISPLAY, fontWeight: 200, fontSize: 44, letterSpacing: '-0.02em', zIndex: 5,
  }}>
    0{n} <span style={{ fontWeight: 300 }}>/</span> 04
  </div>
);

/** One design card, image or looping video (videos play from their start, deterministic). */
export const DesignCard: React.FC<{ d: (typeof DESIGNS)[number]; style?: React.CSSProperties; shadow?: string }> = ({ d, style, shadow }) => (
  <div style={{ position: 'absolute', width: d.w, height: d.h, background: '#111', borderRadius: 2, overflow: 'hidden', boxShadow: shadow ?? '0 2px 10px rgba(0,0,0,.1)', ...style }}>
    <Media src={d.src} />
  </div>
);
