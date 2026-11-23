import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, clamp01, mix } from '../lib/motion';
import { DISPLAY } from '../lib/fonts';
import { SHOTS, localBeat } from '../timeline';
import { ToyHand, handPose } from '../components/ToyHand';
import { BlurSlideLine } from '../components/BlurSlide';

// Shot 9 · riso-print-hits · misregistration-hit + blur-slide.
// Kept from the card: 8f in-cubic slam that splits the plates ON the hit frame; offset envelope
// A·cos(2πt/18)·exp(−t/60) with A = (20, 8)px, plates in opposite directions, mostly x with some y;
// registration is a HARD snap to zero (not an ease) when the residual is ~11px; the snap frame gets
// a 4f 1.03→1 pulse; the hit frame gets a 1.2% whole-frame jolt for 10f (impact #2); only the stamp
// splits, never the background; ≥40f true stillness after.
// The two plates are the stamp's own inks: orange and black, multiplied on white.

const SHOT = SHOTS.s9_stamp;
const HIT = localBeat(SHOT, 152); // 15
const SNAP = localBeat(SHOT, 154); // ~44: residual 20·e^(−29/60) ≈ 12px
const URL_AT = SNAP + 4;
const RULE_AT = localBeat(SHOT, 155);
const SIZE = 300;
const C = { x: 960, y: 420 };

export const S9Stamp: React.FC = () => {
  const f = useCurrentFrame();
  const slam = EASE.linear(clamp01((f - (HIT - 8)) / 8));
  const inCubic = slam * slam * slam;
  const scale = f < HIT ? mix(1.5, 1, inCubic) : 1;
  const visible = f >= HIT - 8;
  const t = f - HIT;
  const split = t >= 0 && f < SNAP;
  const env = split ? Math.cos((2 * Math.PI * t) / 18) * Math.exp(-t / 60) : 0;
  const ox = 26 * env, oy = 10 * env; // review: raised from (20, 8) so the split reads at 300px
  const pulse = f >= SNAP && f < SNAP + 4 ? mix(1.03, 1, (f - SNAP) / 4) : 1;
  const jolt = t >= 0 && t < 10 ? 1 + 0.012 * (1 - t / 10) : 1;
  const ruleP = EASE.out(clamp01((f - RULE_AT) / 18));
  const pose = handPose(f, [
    // already in frame on the cut, so the ending never opens on empty white
    { f: 0, x: 1480, y: 900 },
    { f: HIT, x: C.x + SIZE * 0.44, y: C.y + SIZE * 0.44 },
    { f: HIT + 10, x: C.x + SIZE * 0.44, y: C.y + SIZE * 0.44 },
    { f: HIT + 30, x: 2150, y: 1400 },
  ], [HIT]);
  const plate = (src: string, dx: number, dy: number) => (
    <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'multiply',
      transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)` }} />
  );
  return (
    <AbsoluteFill style={{ background: '#fff', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${jolt.toFixed(4)})` }}>
        {visible && (
          <div style={{ position: 'absolute', left: C.x - SIZE / 2, top: C.y - SIZE / 2, width: SIZE, height: SIZE, isolation: 'isolate',
            transform: `scale(${(scale * pulse).toFixed(4)})`, opacity: f < HIT ? clamp01((f - (HIT - 8)) / 3) : 1 }}>
            {plate('ui/stamp-plate-orange.png', ox, oy)}
            {plate('ui/stamp-plate-black.png', -ox, -oy)}
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, right: 0, top: C.y + SIZE / 2 + 40, display: 'flex', justifyContent: 'center' }}>
          <BlurSlideLine frame={f} start={URL_AT} text="anugerah. vercel. app" fontFamily={DISPLAY} fontWeight={200} fontSize={76} stagger={4} win={22}
            style={{ gap: 0 }} />
        </div>
        <div style={{ position: 'absolute', left: 73, bottom: 150, height: 2, width: 1774 * ruleP, background: '#0a0a0a' }} />
        <div style={{ position: 'absolute', left: 73, bottom: 66 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <BlurSlideLine frame={f} start={RULE_AT + 6} text="Anugerah" fontFamily={DISPLAY} fontWeight={300} fontSize={44} rise={18} blur={6} />
            <BlurSlideLine frame={f} start={RULE_AT + 10} text="Creative Designer" fontFamily={DISPLAY} fontWeight={200} fontSize={44} rise={18} blur={6} stagger={3} />
          </div>
        </div>
      </AbsoluteFill>
      <ToyHand pose={pose} ripples={[{ x: C.x + SIZE * 0.44, y: C.y + SIZE * 0.44, t: (f - HIT) / 18 }]} />
    </AbsoluteFill>
  );
};
