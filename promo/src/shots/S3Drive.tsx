import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, bezier, clamp01, mix, ramp } from '../lib/motion';
import { DISPLAY, TEXT } from '../lib/fonts';
import { SHOTS, localBeat } from '../timeline';
import { ToyHand, handPose } from '../components/ToyHand';
import { CAR, DESIGNS, DesignCard, G, GraphicChrome, MAX_SCROLL, ROAD_W, ROAD_Y, Road, wobbleAmp } from './graphic';

// Shot 3 · depth-layer-moves · multiplane, on the real Graphic Design screen.
// Kept from MultiplaneReal: one drive multiplied per layer (here rows 1x = reading layer, far 0.5x
// ghosts with blur + desaturation + haze, near 2x tag chips with blur), drive has an END
// (asymmetric in-out bezier .45,0,.18,1), hero lifts ~8f after the drive settles (elevation 6→26,
// 1.035x), blur only on small elements, 0x chrome that never moves (title, road, toggle, counter).
// Site behaviour kept: dragging the car scrolls the wall; car x = scroll/maxScroll · (roadW − car).

const SHOT = SHOTS.s3_drive;
const DRIVE_EASE = bezier(0.45, 0, 0.18, 1);
const D0 = 6, DDUR = 106;

// hero = a top-row piece that lands near the centre after a ~1500px drive
export const HERO = (() => {
  const cands = DESIGNS.filter((d) => d.type === 'image' && d.y < 300 && d.w <= d.h * 1.1);
  let best = cands[0], bestErr = 1e9;
  for (const d of cands) {
    const drive = d.x + d.w / 2 - 960;
    const err = Math.abs(drive - 1500); // review V2: ~1500px keeps peak speed near the demo's range
    if (err < bestErr) { best = d; bestErr = err; }
  }
  return best;
})();
export const DRIVE_FINAL = HERO.x + HERO.w / 2 - 960;
export const driveAt = (f: number) => DRIVE_FINAL * ramp(f, D0, DDUR, DRIVE_EASE);
export const carXAt = (f: number) => (Math.max(0, driveAt(f)) / MAX_SCROLL) * (ROAD_W - CAR);

const TAGS = ['branding', 'poster', '3d', 'product', 'website', 'app'];
// near-layer pills: where each one ends when the drive settles (card: only two left, pressed on the
// lower frame edge); they start 2× the drive further right and sweep through
const PILL_END = [-2300, -1700, -1100, -520, 600, 1230]; // last two rest between the toggle and the hint
const PILL_Y = [455, 805, 455, 805, 1010, 1010];

export const S3Drive: React.FC = () => {
  const f = useCurrentFrame();
  const drive = driveAt(f);
  const carX = carXAt(f);
  const A = wobbleAmp(f, carXAt);
  const hopAt = (b: number) => {
    const s = localBeat(SHOT, b);
    const k = (f - s) / 10;
    return k > 0 && k < 1 ? Math.sin(k * Math.PI) * 10 : 0;
  };
  const hop = hopAt(116) + hopAt(120);
  const lift = ramp(f, D0 + DDUR + 8, 22, EASE.out);
  const v = driveAt(f + 0.5) - driveAt(f - 0.5);
  const vNear = -2 * v;
  const p = clamp01(drive / DRIVE_FINAL);
  // second row runs slightly behind mid-drive and realigns at the end (visible row parallax)
  const row2Lag = -0.1 * DRIVE_FINAL * Math.sin(Math.PI * p);
  const blurX = Math.min(9, Math.abs(v) * 0.22); // horizontal motion blur on the reading layer
  // grab point: top of the car (screen coords)
  const carTop = { x: G.road.x + carX + CAR * 0.55, y: G.road.y + ROAD_Y - CAR + 4 - hop + 18 };
  const grab = 4;
  const pose = handPose(f, [
    { f: 0, x: G.road.x, y: G.road.y + ROAD_Y },
    { f: grab, x: G.road.x + CAR * 0.55, y: G.road.y + ROAD_Y - CAR + 22 },
  ], [grab]);
  const flip = EASE.smooth(clamp01(f / 8));
  const handNow = { ...(f > grab ? { ...pose, x: carTop.x, y: carTop.y - 10 } : pose), rot: pose.rot - 120 * flip }; // finger down-left onto the car, rod rising up-right
  return (
    <AbsoluteFill style={{ background: '#fff', overflow: 'hidden' }}>
      {/* far 0.5x: ghosted, enlarged, blurred, desaturated copies behind the wall */}
      {DESIGNS.filter((_, i) => i % 5 === 2).map((d, i) => {
        const x = d.x * 1.25 - drive * 0.5 + 200;
        if (x > 2100 || x + d.w * 1.5 < -200) return null;
        return <DesignCard key={'far' + i} d={d} shadow="none" style={{
          left: x, top: 180 + (i % 2) * 340, transform: 'scale(1.5)', transformOrigin: '0 0',
          filter: 'blur(5px) saturate(0.7)', opacity: 0.3,
        }} />;
      })}
      <svg width={0} height={0} style={{ position: 'absolute' }}><filter id="hblur"><feGaussianBlur stdDeviation={`${blurX.toFixed(2)} 0`} /></filter></svg>
      {/* reading layer 1x: the real masonry wall, entering on the drop */}
      <div style={{ position: 'absolute', inset: 0, filter: blurX > 0.6 ? 'url(#hblur)' : undefined }}>
      {DESIGNS.map((d, i) => {
        const x = d.x - drive - (d.y > 400 ? row2Lag : 0);
        if (x > 2000 || x + d.w < -80) return null;
        const enter = EASE.out(clamp01((f - Math.max(0, d.x / 140)) / 14));
        const hero = d === HERO;
        const e = hero ? mix(6, 26, lift) : 6;
        return (
          <React.Fragment key={i}>
            <DesignCard d={d} shadow={`0 ${(e * 0.5).toFixed(1)}px ${(e * 1.6).toFixed(1)}px rgba(0,0,0,${hero ? 0.12 + 0.12 * lift : 0.1})`} style={{
              left: x, top: d.y, opacity: enter, zIndex: hero ? 3 : 1,
              transform: `translateY(${((1 - enter) * 24 - (hero ? 14 * lift : 0)).toFixed(2)}px) scale(${hero ? (1 + 0.035 * lift).toFixed(4) : 1})`,
            }} />
            {hero && lift > 0.01 && (
              <div style={{
                position: 'absolute', left: x, top: d.y + d.h - 14 * lift, width: d.w, zIndex: 4, opacity: lift,
                transform: `scale(${(1 + 0.035 * lift).toFixed(4)})`, transformOrigin: '50% 0',
              }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '22px 12px 10px', color: '#fff',
                  background: 'linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,0))', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 300, fontSize: 34 }}>{d.title}</span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
      </div>
      {/* 0x chrome */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
        <GraphicChrome />
        <Road carX={carX} A={A} t={f / 30} hop={hop} />
      </div>
      {/* near 2x: tag chips from the site's captions, blurred, sweeping past */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 6 }}>
        {TAGS.map((t, i) => {
          const x = PILL_END[i] + 2 * (DRIVE_FINAL - drive);
          if (x < -400 || x > 2300) return null;
          const smear = Math.min(14, Math.abs(vNear) * 0.25);
          return (
            <div key={t} style={{
              position: 'absolute', left: x, top: PILL_Y[i], padding: '18px 34px 22px', borderRadius: 999,
              background: '#f2f2f2', color: '#0a0a0a', border: '2px solid #0a0a0a', fontFamily: TEXT, fontSize: 34, letterSpacing: '.06em', textTransform: 'uppercase',
              filter: `blur(${(6 + smear * 0.4).toFixed(1)}px)`, opacity: 0.85, boxShadow: '0 40px 70px -10px rgba(0,0,0,.25)',
              transform: `scale(1.4) scaleX(${(1 + smear * 0.01).toFixed(3)})`,
            }}>{t}</div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 7 }}>
        <ToyHand pose={handNow} ripples={[{ x: G.road.x + CAR * 0.55, y: G.road.y + ROAD_Y - CAR + 22, t: (f - grab) / 18 }]} />
      </div>
    </AbsoluteFill>
  );
};
