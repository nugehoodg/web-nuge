import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';
import { bezier, clamp01, mix } from '../lib/motion';

// transition-hidden-cut · invisible-cut. A defocused foreground occluder sweeps right→left in
// 14f (bezier .3,0,.7,1); a soft near-shadow runs ahead of it; the hard cut sits on the frame
// where the solid core covers the whole 1920 width. Adapted: the occluder is the toy hand's rod
// passing right in front of the lens (light grey tube, ink rim instead of the demo's terracotta).
const SWEEP = bezier(0.3, 0, 0.7, 1);
const CORE = 2600, SOFT = 340;
export const ROD_CUT_FRAMES = 15;

export const RodCut: React.FC<{ before: React.ReactNode; beforeFrame: number; after: React.ReactNode; afterFrame: number }> = ({ before, beforeFrame, after, afterFrame }) => {
  const f = useCurrentFrame();
  const p = SWEEP(clamp01(f / 14));
  const total = CORE + 2 * SOFT;
  // leading edge enters at the right edge, trailing edge leaves at the left
  const left = mix(1920 + 640, -total - 200, p);
  const coverStart = left + SOFT, coverEnd = left + SOFT + CORE;
  const covered = coverStart <= 0 && coverEnd >= 1920;
  // cut on the first fully covered frame
  let cutAt = 7;
  for (let k = 0; k <= 14; k++) {
    const l = mix(1920 + 640, -total - 200, SWEEP(clamp01(k / 14)));
    if (l + SOFT <= 0 && l + SOFT + CORE >= 1920) { cutAt = k; break; }
  }
  const showAfter = f >= cutAt;
  void covered;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#fff' }}>
      {showAfter ? <Freeze frame={afterFrame}>{after}</Freeze> : <Freeze frame={beforeFrame}>{before}</Freeze>}
      {/* near shadow running ahead */}
      <div style={{
        position: 'absolute', top: -400, height: 1880, left: left - 640, width: 640,
        background: 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,.16))', transform: 'rotate(-14deg)', transformOrigin: '100% 50%',
      }} />
      {/* the rod, out of focus, tilted like the hand's rod */}
      <div style={{
        position: 'absolute', top: -500, height: 2080, left, width: total, transform: 'rotate(-14deg)', transformOrigin: '50% 50%',
        filter: 'blur(26px)',
        background: `linear-gradient(to right,
          rgba(243,243,243,0) 0px, rgba(243,243,243,1) ${SOFT}px,
          #ffffff ${SOFT + CORE * 0.35}px, #f3f3f3 ${SOFT + CORE * 0.6}px, #d9d9d9 ${SOFT + CORE}px,
          rgba(217,217,217,0) ${total}px)`,
      }} />
      {/* ink rim on the leading edge */}
      <div style={{
        position: 'absolute', top: -500, height: 2080, left: left + SOFT - 30, width: 46, transform: 'rotate(-14deg)',
        background: '#0a0a0a', filter: 'blur(14px)', opacity: 0.55,
      }} />
    </AbsoluteFill>
  );
};
