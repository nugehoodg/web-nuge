import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../layout.json';
import { EASE, clamp01, mix, ramp } from '../lib/motion';
import { mulberry32 } from '../lib/rand';
import { DISPLAY } from '../lib/fonts';
import { ToyHand, handPose } from '../components/ToyHand';
import { BlurSlideLine } from '../components/BlurSlide';
import { BEAT_INT, FPS, SHOTS, localBeat } from '../timeline';
import { Media } from './graphic';

// Shot 1 · carousel-3d re-skinned to the site's landing orbit.
// Kept from the card: ring = rotateY(i·θ) translateZ(R) per card, the RING spins (cards never
// rotate on X/Z themselves), double-faced cards with backface hidden, perspective 2200, fixed
// camera, 50 % uniform + 50 % stepped spin. Adapted: 16 cards, white air-perspective + DOF
// blur and the site's diagonal tilt (rotateZ 24°, rotateX −13°), and a bloom-in on the hand tap.

const SHOT = SHOTS.s1_orbit;
const N = 16;
const R = 900;
const CW = 236;
const BEATF = BEAT_INT * FPS * 2; // one step every 2 beats ≈ 29.5f
const DWELL = 9;

type Card = { src: string; ratio: number };
const CARDS: Card[] = (() => {
  const rnd = mulberry32(20261119);
  const pool = layout.graphic.designs.filter((d) => d.type === 'image' && d.h / d.w > 0.95);
  const picked: Card[] = [];
  const copy = pool.slice();
  while (picked.length < N && copy.length) {
    const j = Math.floor(rnd() * copy.length);
    const d = copy.splice(j, 1)[0];
    picked.push({ src: d.src, ratio: Math.min(1.45, d.h / d.w) });
  }
  return picked;
})();

const stepPart = (f: number) => {
  const k = Math.floor(f / BEATF);
  const local = f - k * BEATF;
  return k + EASE.smooth(clamp01((local - DWELL) / (BEATF - DWELL)));
};
// degrees: half uniform, half stepped; one card (22.5°) per step
export const orbitSpin = (f: number) => (360 / N) * (0.5 * (f / BEATF) + 0.5 * stepPart(f));

export const ORBIT_CENTER = { x: 880, y: 470 };

/** The ring itself; reused by shot 2 (it keeps turning behind the line). */
export const OrbitRing: React.FC<{ f: number; bloom: number; alpha?: number }> = ({ f, bloom, alpha = 1 }) => {
  const spin = orbitSpin(f) + 30;
  const radius = R * mix(0.08, 1, bloom);
  return (
    <AbsoluteFill style={{ perspective: '2200px', perspectiveOrigin: `${ORBIT_CENTER.x}px ${ORBIT_CENTER.y}px`, opacity: alpha }}>
      <div style={{
        position: 'absolute', left: ORBIT_CENTER.x, top: ORBIT_CENTER.y, width: 0, height: 0,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${-radius}px) rotateZ(24deg) rotateX(-13deg) rotateY(${-spin}deg)`,
      }}>
        {CARDS.map((c, i) => {
          const az = ((((i * 360) / N - spin) % 360) + 540) % 360 - 180;
          const depth = (1 - Math.cos((az * Math.PI) / 180)) / 2; // 0 front, 1 back
          const blur = Math.max(0, depth - 0.42) * 20;
          const ch = CW * c.ratio;
          const appear = clamp01(bloom * 1.6 - (i % 4) * 0.06);
          const face = (back: boolean) => (
            <div style={{
              position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: back ? 'rotateY(180deg)' : undefined, background: '#e9e9e9',
              boxShadow: '0 6px 18px rgba(0,0,0,.18)', overflow: 'hidden',
            }}>
              <Media src={c.src} />
              {/* white air perspective (card pitfall: on white, blend toward the background) */}
              <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: depth * 0.55 }} />
            </div>
          );
          return (
            <div key={i} style={{
              position: 'absolute', left: -CW / 2, top: -ch / 2, width: CW, height: ch,
              transformStyle: 'preserve-3d',
              // adaptation: like the site, cards yaw partly back toward the camera (Y only, never X/Z)
              transform: `rotateY(${(i * 360) / N}deg) translateZ(${radius}px) rotateY(${(-az * 0.55).toFixed(2)}deg) scale(${mix(0.2, 1, appear).toFixed(3)})`,
              opacity: appear,
              filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
            }}>
              {face(false)}
              {face(true)}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const S1Orbit: React.FC = () => {
  const f = useCurrentFrame();
  const tap = localBeat(SHOT, 97); // the hand's tap lands on beat 97
  const titleAt = localBeat(SHOT, 100);
  const bloom = EASE.snappy(clamp01((f - tap) / 40));
  const T = layout.landing;
  const pose = handPose(f, [
    { f: 0, x: 2150, y: 1400 },
    { f: tap - 2, x: ORBIT_CENTER.x + 40, y: ORBIT_CENTER.y + 40 },
    { f: tap + 14, x: ORBIT_CENTER.x + 40, y: ORBIT_CENTER.y + 40 },
    { f: tap + 34, x: 2150, y: 1400 },
  ], [tap]);
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      <OrbitRing f={f} bloom={bloom} />
      <Img src={staticFile('textures/landing-nav.png')} style={{ position: 'absolute', left: T.nav.x, top: T.nav.y, width: T.nav.w, height: T.nav.h }} />
      <div style={{ position: 'absolute', left: T.h1.x, top: T.h1.y }}>
        <BlurSlideLine frame={f} start={titleAt} text="Anugerah" fontFamily={DISPLAY} fontWeight={300} fontSize={92.16} win={30} />
      </div>
      <div style={{ position: 'absolute', left: T.sub.x, top: T.sub.y }}>
        <BlurSlideLine frame={f} start={titleAt + 14} text="Creative Designer" fontFamily={DISPLAY} fontWeight={200} fontSize={61.44} letterSpacing="-0.02em" stagger={3} win={22} rise={26} blur={9} />
      </div>
      <ToyHand pose={pose} ripples={[{ x: ORBIT_CENTER.x + 40, y: ORBIT_CENTER.y + 40, t: (f - tap) / 18 }]} />
    </AbsoluteFill>
  );
};
export const S1_RAMP = ramp; // keep import used
