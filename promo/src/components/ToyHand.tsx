import React from 'react';
import { EASE, clamp01, mix } from '../lib/motion';

// The toy hand from the site's cursor.js, drawn at video scale. (x, y) is the fingertip.
// Motion rules follow the cursor-flyover card: the hand travels first on a slight arc
// (swift, ≤16f), aims for a beat, presses (3f squash to 0.84, overshoot back), and every
// press leaves an 18f ring ripple (scale 0.3 → 1.5, fading).

export type HandKey = { f: number; x: number; y: number };
export type Pose = { x: number; y: number; rot: number; squash: number; visible: boolean };

const HAND_PATH = (
  <>
    <rect x="-5" y="53" width="27" height="11" rx="3.5" fill="url(#thCuff)" />
    <circle cx="10.5" cy="27.5" r="6.6" fill="url(#thSkin)" />
    <circle cx="18" cy="28.6" r="6.2" fill="url(#thSkin)" />
    <circle cx="24.4" cy="31" r="5.6" fill="url(#thSkin)" />
    <rect x="-9" y="25" width="35" height="31" rx="11" fill="url(#thSkin)" />
    <rect x="-6.5" y="0" width="13" height="38" rx="6.5" fill="url(#thSkin)" />
    <path d="M-8 44 C -2 38, 9 37, 15 40" fill="none" stroke="#c97708" strokeWidth={2.2} strokeLinecap="round" opacity={0.55} />
    <path d="M7 31.5 v6 M14.5 32.5 v5.5 M21 34 v5" stroke="#c97708" strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />
    <rect x="-3.6" y="4" width="3.4" height="17" rx="1.7" fill="#fff" opacity={0.6} />
    <ellipse cx="-2" cy="31.5" rx="4" ry="2.4" fill="#fff" opacity={0.45} />
  </>
);

const Rod: React.FC<{ len: number }> = ({ len }) => {
  const ax = 8.5, ay = 63, seg = [0, len * 0.29, len * 0.58, len], w = [4.8, 6.8, 9];
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <line key={'o' + i} x1={ax} y1={ay + seg[i]} x2={ax} y2={ay + seg[i + 1]} stroke="#0a0a0a" strokeWidth={w[i] + 2.6} strokeLinecap="round" />
      ))}
      {[0, 1, 2].map((i) => (
        <line key={'f' + i} x1={ax} y1={ay + seg[i]} x2={ax} y2={ay + seg[i + 1]} stroke="#f3f3f3" strokeWidth={w[i]} strokeLinecap="round" />
      ))}
      <line x1={ax - 1.6} y1={ay + 2} x2={ax - 2.4} y2={ay + len - 6} stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={ax} cy={ay + len} r={6.5} fill="#2a2a2a" stroke="#0a0a0a" strokeWidth={1.4} />
    </g>
  );
};

export const HandDefs: React.FC = () => (
  <defs>
    <linearGradient id="thSkin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#f6b24a" />
      <stop offset="1" stopColor="#c97708" />
    </linearGradient>
    <linearGradient id="thCuff" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="1" stopColor="#d9d9d9" />
    </linearGradient>
    <filter id="thOutline" x="-30%" y="-30%" width="160%" height="160%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="1.3" result="grow" />
      <feFlood floodColor="#0a0a0a" />
      <feComposite in2="grow" operator="in" result="edge" />
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
      <feOffset in="blur" dx="2" dy="5" result="drop" />
      <feComponentTransfer in="drop" result="shadow"><feFuncA type="linear" slope=".22" /></feComponentTransfer>
      <feMerge><feMergeNode in="shadow" /><feMergeNode in="edge" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
);

/** Screen-space overlay with the hand and its ripples. */
export const ToyHand: React.FC<{
  pose: Pose; scale?: number; rod?: number; ripples?: { x: number; y: number; t: number }[];
}> = ({ pose, scale = 2.6, rod = 170, ripples = [] }) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
    <HandDefs />
    {ripples.map((r, i) => {
      const t = clamp01(r.t);
      if (t <= 0 || t >= 1) return null;
      const k = mix(0.3, 1.5, EASE.out(t));
      return <circle key={i} cx={r.x} cy={r.y} r={40 * k * (scale / 2.6)} fill="none" stroke="#0a0a0a" strokeWidth={2.5} opacity={0.75 * (1 - t)} />;
    })}
    {pose.visible && (
      <g transform={`translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) rotate(${pose.rot.toFixed(2)}) scale(${(scale * (2 - pose.squash)).toFixed(4)} ${(scale * pose.squash).toFixed(4)})`}>
        <Rod len={rod} />
        <g filter="url(#thOutline)">{HAND_PATH}</g>
      </g>
    )}
  </svg>
);

const OFF = { x: 2200, y: 1500 }; // off-screen bottom-right, where the hand comes from

/**
 * Hand track: a list of stops. Between stops the hand travels on a slight arc with EASE.swift,
 * taking min(16, gap) frames and arriving at the stop's frame. presses: frames of taps.
 * The rod angle sways against horizontal travel, then settles to the resting -30°.
 */
export const handPose = (f: number, keys: HandKey[], presses: number[] = [], restRot = -30): Pose => {
  if (!keys.length) return { ...OFF, rot: restRot, squash: 1, visible: false };
  const posAt = (t: number) => {
    if (t <= keys[0].f) return { x: keys[0].x, y: keys[0].y };
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t <= b.f) {
        const dur = Math.min(16, b.f - a.f);
        const p = EASE.swift(clamp01((t - (b.f - dur)) / dur));
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        const arc = Math.sin(p * Math.PI) * Math.min(60, len * 0.08); // perpendicular bow, zero at both ends
        return { x: mix(a.x, b.x, p) + (-dy / len) * arc, y: mix(a.y, b.y, p) + (dx / len) * arc };
      }
    }
    const z = keys[keys.length - 1];
    return { x: z.x, y: z.y };
  };
  const p = posAt(f);
  const vx = posAt(f + 0.5).x - posAt(f - 0.5).x;
  // springy sway: integrate a damped response to horizontal velocity over the last frames
  let sway = 0;
  for (let k = 1; k <= 14; k++) {
    const v = posAt(f - k + 0.5).x - posAt(f - k - 0.5).x;
    sway += -v * 0.09 * Math.exp(-k / 4) * Math.cos(k * 0.55);
  }
  let squash = 1;
  for (const pf of presses) {
    if (f >= pf && f < pf + 3) squash = mix(1, 0.84, (f - pf) / 3);
    else if (f >= pf + 3 && f < pf + 14) squash = mix(0.84, 1, EASE.overshoot((f - pf - 3) / 11));
  }
  void vx;
  return { x: p.x, y: p.y, rot: restRot + Math.max(-28, Math.min(28, sway)), squash, visible: true };
};

export const OFFSCREEN = OFF;
