import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, clamp01, mix, ramp } from '../lib/motion';
import { mulberry32 } from '../lib/rand';
import { SHOTS, localBeat } from '../timeline';
import { ToyHand, handPose } from '../components/ToyHand';
import { CAR, DESIGNS, DesignCard, G, GraphicChrome, MAX_SCROLL, ROAD_W, ROAD_Y, Road } from './graphic';
import { DRIVE_FINAL } from './S3Drive';

// Shot 4 · tension-camera-moves · bullet-time-freeze-orbit, on the site's Destroy.
// Kept from BulletTimeFreezeOrbit: TWO CLOCKS (命门) — the designs run on a content clock with an
// 8f smooth speed ramp into a full freeze and an 8f ramp out; the camera runs on real frames:
// rotateY 0→−52° (26f smooth) → slow drift → back (22f swift), rotateX up 6°, dolly 160px,
// perspective 1800. Frozen pieces keep their in-flight pose. Hold after the action.
// Landing on b132 is full-frame impact #1: stop-shake 14px·e^(−t/1.8) (crash-zoom-punch envelope).

const SHOT = SHOTS.s4_destroy;
const TAP = localBeat(SHOT, 124);
const FREEZE = localBeat(SHOT, 126);
const RESUME = localBeat(SHOT, 131);
const LAND = localBeat(SHOT, 132);
const FLOOR = G.road.y + ROAD_Y; // the dotted road line is the floor, as on the site

const speedAt = (f: number) => {
  if (f < TAP) return 0;
  if (f < FREEZE - 8) return 1;
  if (f < FREEZE) return 1 - EASE.smooth((f - (FREEZE - 8)) / 8);
  if (f < RESUME - 8) return 0;
  if (f < RESUME) return EASE.smooth((f - (RESUME - 8)) / 8);
  return 1;
};
const effTable: number[] = [];
const effAt = (f: number) => {
  const k = Math.max(0, Math.floor(f));
  if (!effTable.length) {
    let e = 0;
    for (let i = 0; i <= 400; i++) { effTable.push(e); e += speedAt(i); }
  }
  return effTable[Math.min(k, effTable.length - 1)] + (f - k) * speedAt(k);
};
const E_LAND = effAt(LAND);

type Piece = { d: (typeof DESIGNS)[number]; x0: number; y0: number; xL: number; yL: number; aL: number; vy0: number; g: number; spin: number; z: number; tl: number };
const PIECES: Piece[] = (() => {
  const rnd = mulberry32(132);
  const vis = DESIGNS.filter((d) => d.x - DRIVE_FINAL < 1960 && d.x - DRIVE_FINAL + d.w > -40);
  const bins = new Array(64).fill(0); // pile height per 30px column
  return vis
    .map((d) => ({ d, cx: d.x - DRIVE_FINAL + d.w / 2 }))
    .sort((a, b) => a.cx - b.cx)
    .map(({ d }) => {
      const x0 = d.x - DRIVE_FINAL + d.w / 2, y0 = d.y + d.h / 2;
      const flat = rnd() < 0.62;
      const aL = (flat ? 0 : rnd() < 0.5 ? 90 : -90) + (rnd() - 0.5) * 18;
      const rad = (aL * Math.PI) / 180;
      const bw = Math.abs(d.w * Math.cos(rad)) + Math.abs(d.h * Math.sin(rad));
      const bh = Math.abs(d.w * Math.sin(rad)) + Math.abs(d.h * Math.cos(rad));
      const xL = Math.max(bw / 2 + 20, Math.min(1900 - bw / 2, x0 + (rnd() - 0.5) * 140));
      const c0 = Math.max(0, Math.floor((xL - bw / 2) / 30)), c1 = Math.min(63, Math.floor((xL + bw / 2) / 30));
      let base = 0;
      for (let c = c0; c <= c1; c++) base = Math.max(base, bins[c]);
      const yL = FLOOR - base - bh / 2;
      for (let c = c0; c <= c1; c++) bins[c] = Math.min(170, base + bh * 0.2); // pieces settle into each other, low pile
      const tl = E_LAND + Math.round((rnd() - 0.6) * 4); // landings bunch on the beat
      const vy0 = -(8 + rnd() * 5); // review B2: a visible pop before the slowdown
      const g = (2 * (yL - y0 - vy0 * tl)) / (tl * tl);
      return { d, x0, y0, xL, yL, aL, vy0, g, spin: (rnd() - 0.5) * 2, z: (rnd() - 0.5) * 320, tl };
    });
})();

const poseOf = (p: Piece, t: number) => {
  if (t <= 0) return { x: p.x0, y: p.y0, a: 0, z: 0 };
  if (t < p.tl) {
    const u = t / p.tl;
    return {
      x: mix(p.x0, p.xL, EASE.swift(u)), y: p.y0 + p.vy0 * t + 0.5 * p.g * t * t,
      a: p.aL * u + p.spin * 40 * Math.sin(u * Math.PI), z: p.z * Math.sin(u * Math.PI),
    };
  }
  const k = t - p.tl; // small settle bounce after landing
  return { x: p.xL, y: p.yL - 10 * Math.exp(-k / 3) * Math.abs(Math.sin(k * 0.9)), a: p.aL, z: 0 };
};

export const S4Destroy: React.FC = () => {
  const f = useCurrentFrame();
  const e = effAt(f) - effAt(TAP);
  const out = ramp(f, FREEZE + 2, 26, EASE.smooth);
  const back = ramp(f, RESUME - 24, 22, EASE.swift);
  const orbit = out - back;
  const drift = Math.sin(clamp01((f - FREEZE - 28) / 40) * Math.PI) * 3;
  // adaptation: a full-width page leaves the frame at 52°; 34° keeps the pile in shot
  const ry = -34 * orbit - drift;
  const rx = 6 * orbit;
  const dolly = 120 * orbit;
  const k = f - LAND;
  const shake = k >= 0 && k < 14 ? 14 * Math.exp(-k / 1.8) * (k % 2 ? -1 : 1) : 0;
  const carX = (DRIVE_FINAL / MAX_SCROLL) * (ROAD_W - CAR);
  // hand: from the car to the Destroy word, aim, tap on b124, then leave
  const W = G.destroyWord;
  const target = { x: W.x + W.w * 0.62, y: W.y + W.h * 0.62 };
  const pose = handPose(f, [
    { f: 0, x: G.road.x + carX + CAR * 0.55, y: G.road.y + ROAD_Y - CAR + 22 },
    { f: TAP - 8, x: target.x, y: target.y },
    { f: TAP + 12, x: target.x, y: target.y },
    { f: TAP + 30, x: 2150, y: 1400 },
  ], [TAP]);
  return (
    <AbsoluteFill style={{ background: '#fff', overflow: 'hidden' }}>
      <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: '50% 46%' }}>
        <div style={{
          position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transformOrigin: '50% 52%',
          transform: `translate(${shake.toFixed(2)}px, ${(shake * 0.6).toFixed(2)}px) translateZ(${dolly.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`,
        }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <GraphicChrome destroyed={f >= TAP} />
            <Road carX={carX} A={0} t={f / 30} />
          </div>
          {PIECES.map((p, i) => {
            const q = poseOf(p, e);
            return (
              <DesignCard key={i} d={p.d} shadow={`0 ${q.z > 20 ? 18 : 4}px ${q.z > 20 ? 36 : 12}px rgba(0,0,0,.16)`} style={{
                left: 0, top: 0,
                transform: `translate3d(${(q.x - p.d.w / 2).toFixed(2)}px, ${(q.y - p.d.h / 2).toFixed(2)}px, ${q.z.toFixed(1)}px) rotate(${q.a.toFixed(2)}deg)`,
              }} />
            );
          })}
        </div>
      </AbsoluteFill>
      <ToyHand pose={{ ...pose, rot: pose.rot - 120 * (1 - EASE.smooth(clamp01(f / (TAP - 8)))) }} ripples={[{ x: target.x, y: target.y, t: (f - TAP) / 18 }]} />
    </AbsoluteFill>
  );
};
