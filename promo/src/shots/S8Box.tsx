import React from 'react';
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame } from 'remotion';
import layout from '../layout.json';
import { EASE, clamp01, mix, ramp } from '../lib/motion';
import { SHOTS, localBeat } from '../timeline';
import { ToyHand, handPose } from '../components/ToyHand';
import { Counter } from './graphic';

// Shot 8 · element-body-moves · contact-shadow-lift (2D top-down variant).
// Kept from the demo: scan lift (out-cubic 10f up, hover, in-cubic 8f down, 2f 0.99 seat), final
// pick on a spring (damping 16, stiffness 120) with breathing; lift −28px + scale 1.08 (card
// floor: never below 12px); the SHADOW stays on the table as its own layers — contact core
// α .32→.14 blur 3→25, ambient α .09→.22 blur 14→54, drifting right-down. Items carry no own shadow.
// Shadows are silhouettes of the item PNG (shape-true), not boxes.

const SHOT = SHOTS.s8_box;
const A = layout.about;
const LIFT_PX = 28, LIFT_S = 1.08;
const TIP_SCALE = 1.45; // review Q11: the site's 14px card text is too small at video scale
const outCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const inCubic = (t: number) => Math.pow(clamp01(t), 3);

const scanMotion = (t: number) => {
  if (t < 0 || t >= 34) return { lift: 0, s: 1, tip: 0 };
  const lift = outCubic(t / 10) - inCubic((t - 24) / 8);
  let s = 1 + (LIFT_S - 1) * lift;
  if (t >= 32) s = 0.99 + 0.01 * outCubic((t - 32) / 2);
  else if (t >= 31) s = 0.99;
  const hover = t >= 10 && t < 24 ? Math.sin(((t - 10) / 14) * Math.PI) : 0;
  const tip = clamp01((t - 6) / 6) * (1 - clamp01((t - 24) / 5));
  return { lift: lift + 0.05 * hover, s, tip };
};

type ItemKey = 'camera' | 'paper' | 'photo' | 'controller';
const ITEMS: { k: ItemKey; src: string; rot: number }[] = [
  { k: 'paper', src: 'ui/resume-paper.png', rot: 3 },
  { k: 'camera', src: 'ui/camera.png', rot: -9 },
  { k: 'photo', src: 'ui/polaroid.png', rot: 4 },
  { k: 'controller', src: 'ui/controller.png', rot: -4 },
];

export const S8Box: React.FC = () => {
  const f = useCurrentFrame();
  const fps = 30;
  const P = { camera: localBeat(SHOT, 144), controller: localBeat(SHOT, 146), photo: localBeat(SHOT, 148) };
  const motionOf = (k: ItemKey) => {
    if (k === 'camera') return scanMotion(f - P.camera - 2);
    if (k === 'controller') return scanMotion(f - P.controller - 2);
    if (k === 'photo') {
      if (f < P.photo) return { lift: 0, s: 1, tip: 0 };
      const sp = spring({ frame: f - P.photo, fps, config: { damping: 16, stiffness: 120 } });
      const breathe = f > P.photo + 16 ? 0.04 * Math.sin(((f - P.photo - 16) / 40) * Math.PI * 2) * ramp(f, P.photo + 16, 20, EASE.smooth) : 0;
      return { lift: 1.15 * sp + breathe, s: 1 + (LIFT_S - 1) * Math.min(1.2, sp), tip: clamp01((f - P.photo - 5) / 6) };
    }
    return { lift: 0, s: 1, tip: 0 };
  };
  const center = (k: ItemKey) => ({ x: A.items[k].x + A.items[k].w / 2, y: A.items[k].y + A.items[k].h / 2 });
  const pokeAt = (k: ItemKey) => {
    const c = center(k);
    return { x: c.x + A.items[k].w * 0.08, y: c.y + A.items[k].h * 0.12 };
  };
  const pc = pokeAt('camera'), pk = pokeAt('controller'), pp = pokeAt('photo');
  const pose = handPose(f, [
    { f: 0, x: pc.x, y: pc.y },
    { f: P.controller - 2, x: pk.x, y: pk.y },
    { f: P.photo - 2, x: pp.x, y: pp.y },
    { f: P.photo + 14, x: pp.x, y: pp.y },
    { f: P.photo + 34, x: 2150, y: 1400 },
  ], [P.camera, P.controller, P.photo]);
  const tips: Record<string, { src: string; x: number; y: number; w: number; h: number }> = {
    camera: { src: 'textures/tip-camera.png', x: A.items.camera.x - A.tip_camera.w + 40, y: A.items.camera.y + 10, w: A.tip_camera.w, h: A.tip_camera.h },
    controller: { src: 'textures/tip-controller.png', x: A.items.controller.x + A.items.controller.w - 30, y: A.items.controller.y + 30, w: A.tip_controller.w, h: A.tip_controller.h },
    photo: { src: 'textures/tip-photo.png', x: A.items.photo.x + A.items.photo.w - 10, y: A.items.photo.y - 40, w: A.tip_photo.w, h: A.tip_photo.h },
  };
  return (
    <AbsoluteFill style={{ background: '#fff', overflow: 'hidden' }}>
      <Img src={staticFile('textures/about-backplate.png')} style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }} />
      {ITEMS.map(({ k, src, rot }) => {
        const r = A.items[k];
        const m = motionOf(k);
        const l = Math.max(0, m.lift);
        const base: React.CSSProperties = { position: 'absolute', left: r.x, top: r.y, width: r.w, transform: `rotate(${rot}deg)` };
        return (
          <React.Fragment key={k}>
            {/* ambient shadow: big, soft, drifting right-down, stays on the table */}
            <Img src={staticFile(src)} style={{ ...base, filter: `brightness(0) blur(${(14 + 40 * l).toFixed(1)}px)`, opacity: 0.09 + 0.13 * l,
              transform: `translate(${(8 + 22 * l).toFixed(1)}px, ${(10 + 30 * l).toFixed(1)}px) rotate(${rot}deg) scale(${(1 + 0.04 * l).toFixed(3)})` }} />
            {/* contact core */}
            <Img src={staticFile(src)} style={{ ...base, filter: `brightness(0) blur(${(3 + 22 * l).toFixed(1)}px)`, opacity: 0.32 - 0.18 * l,
              transform: `translate(${(2 + 10 * l).toFixed(1)}px, ${(3 + 14 * l).toFixed(1)}px) rotate(${rot}deg)` }} />
            <Img src={staticFile(src)} style={{ ...base, transform: `translateY(${(-LIFT_PX * l).toFixed(2)}px) rotate(${rot}deg) scale(${m.s.toFixed(4)})` }} />
          </React.Fragment>
        );
      })}
      {(['camera', 'controller', 'photo'] as const).map((k) => {
        const t = motionOf(k).tip;
        if (t <= 0.01) return null;
        const c = tips[k];
        const p = EASE.overshoot(t);
        return <Img key={k} src={staticFile(c.src)} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
          opacity: clamp01(t * 1.5), transform: `translateY(${((1 - p) * 6).toFixed(2)}px) scale(${(mix(0.94, 1, p) * TIP_SCALE).toFixed(3)})`, transformOrigin: k === 'camera' ? '100% 0' : '0 0' }} />;
      })}
      <Counter n={4} />
      <ToyHand pose={pose} ripples={[
        { x: pc.x, y: pc.y, t: (f - P.camera) / 18 }, { x: pk.x, y: pk.y, t: (f - P.controller) / 18 }, { x: pp.x, y: pp.y, t: (f - P.photo) / 18 },
      ]} />
    </AbsoluteFill>
  );
};
