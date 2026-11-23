import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../layout.json';
import { EASE, clamp01, mix } from '../lib/motion';
import { DISPLAY } from '../lib/fonts';
import { SHOTS, localBeat } from '../timeline';
import { OrbitRing } from './S1Orbit';
import { BlurSlideLine } from '../components/BlurSlide';
import { ToyHand, handPose } from '../components/ToyHand';
import { G, GraphicChrome, ROAD_Y, Road } from './graphic';

// Shot 2 · line-carry-transition. The site's divider is the existing graphic the line grows
// from (card rule: never start a line from nothing). The toy hand's fingertip is the pen head.
// Kept from the card: pen drawn at the same speed as the camera during the travel (the 命门:
// drawn = base + cam, pen pinned on screen), zero-speed hand-offs, right-angle corner, content
// inside the closed shape only after closure (rows enter on shot 3), ≤1 use per film.
// Adapted: the travel is vertical (the site stacks its screens), the line lands on the road.

const SHOT = SHOTS.s2_line;
const SEC = 1082; // world y of the Graphic Design section (landing 1080 + 2px divider)
const LINE_Y = 1080;
const X_RIGHT = 1847, X_LEFT = layout.graphic.road.x; // 73
const PEN_SCREEN_Y = 880;
const ROAD_LINE_Y = SEC + G.road.y + ROAD_Y; // world y of the dotted road line

const A_END = 24, B_START = 30, B_END = 74, C_END = 84; // local frames
const camAt = (f: number) => {
  if (f <= B_START) return mix(0, 200, EASE.smooth(clamp01(f / B_START)));
  return mix(200, SEC, EASE.smooth(clamp01((f - B_START) / (B_END - B_START))));
};
const penAt = (f: number) => {
  if (f <= A_END) return { x: mix(X_RIGHT, X_LEFT, EASE.out(clamp01(f / A_END))), y: LINE_Y };
  if (f <= B_START) return { x: X_LEFT, y: LINE_Y };
  if (f <= B_END) return { x: X_LEFT, y: camAt(f) + PEN_SCREEN_Y }; // grows exactly with the camera
  return { x: X_LEFT, y: mix(SEC + PEN_SCREEN_Y, ROAD_LINE_Y, EASE.out(clamp01((f - B_END) / (C_END - B_END)))) };
};

export const S2Line: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const vcam = camAt(f + 0.5) - camAt(f - 0.5);
  const blurY = Math.min(16, Math.abs(vcam) * 0.35);
  const pen = penAt(f);
  const T = layout.landing;
  // polyline from the right end of the divider to the pen
  const pts = [[X_RIGHT, LINE_Y]];
  if (f > A_END) pts.push([X_LEFT, LINE_Y]);
  pts.push([pen.x, pen.y]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${(p[1] - cam).toFixed(1)}`).join(' ');
  // road closes left→right after the pen lands; car pops in just before the drop
  const roadReveal = EASE.out(clamp01((f - (C_END - 6)) / 12));
  const carPop = clamp01((f - (localBeat(SHOT, 112) - 6)) / 6);
  const handPoseNow = handPose(f, [
    { f: 0, x: 2100, y: 1300 },
    { f: 1, x: X_RIGHT, y: LINE_Y - cam },
  ], [1]);
  // the fingertip IS the pen head from frame 1 on
  const pose = f >= 1 ? { ...handPoseNow, x: pen.x, y: pen.y - cam } : handPoseNow;
  return (
    <AbsoluteFill style={{ background: '#fff', overflow: 'hidden' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id="vblur"><feGaussianBlur stdDeviation={`0 ${blurY.toFixed(2)}`} /></filter>
      </svg>
      <div style={{ position: 'absolute', inset: 0, filter: blurY > 0.4 ? 'url(#vblur)' : undefined }}>
        {/* landing, scrolling up */}
        <div style={{ position: 'absolute', left: 0, top: -cam, width: 1920, height: 1080 }}>
          <OrbitRing f={SHOT.from + f} bloom={1} />
          <Img src={staticFile('textures/landing-nav.png')} style={{ position: 'absolute', left: T.nav.x, top: T.nav.y, width: T.nav.w, height: T.nav.h }} />
          <div style={{ position: 'absolute', left: T.h1.x, top: T.h1.y }}>
            <BlurSlideLine frame={999} start={0} text="Anugerah" fontFamily={DISPLAY} fontWeight={300} fontSize={92.16} />
          </div>
          <div style={{ position: 'absolute', left: T.sub.x, top: T.sub.y }}>
            <BlurSlideLine frame={999} start={0} text="Creative Designer" fontFamily={DISPLAY} fontWeight={200} fontSize={61.44} letterSpacing="-0.02em" />
          </div>
        </div>
        {/* graphic design screen coming up from below */}
        <div style={{ position: 'absolute', left: 0, top: SEC - cam, width: 1920, height: 1080 }}>
          <GraphicChrome counterAlpha={clamp01((f - B_END) / 10)} />
          <Road carX={0} A={0} t={0} reveal={roadReveal} showCar={false} />
          <Img src={staticFile('ui/carbon--car.png')} style={{
            position: 'absolute', left: G.road.x, top: G.road.y + ROAD_Y - G.car.w + 4, width: G.car.w, height: G.car.w,
            transformOrigin: '50% 100%', transform: `scale(${mix(0.4, 1, EASE.overshoot(carPop)).toFixed(3)})`, opacity: carPop,
          }} />
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <path d={d} fill="none" stroke="#0a0a0a" strokeWidth={4} strokeLinecap="square" strokeLinejoin="miter"
          opacity={1 - clamp01((f - C_END + 4) / 6)} />
      </svg>
      <ToyHand pose={pose} />
    </AbsoluteFill>
  );
};
