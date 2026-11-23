import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import layout from '../layout.json';
import { EASE, clamp01, mix, ramp } from '../lib/motion';
import { DISPLAY, TEXT } from '../lib/fonts';
import { SHOTS, localBeat } from '../timeline';
import { ToyHand, handPose } from '../components/ToyHand';
import { Counter } from './graphic';

// Shot 6 · timeline-travel on the Video Editing screen.
// Kept from the card: settle → accelerate → hard brake travel (slow start, fast middle, last ~12%
// braking), each "tick" reacts just as the travel reaches it, hard stop then push-in 1→1.28 in 10f
// (out cubic), then ≥30f stillness. Adapted: the travelling element is the playhead dragged by the
// toy hand; the ticks are clips 1–4; their reaction is the preview switching clip ON the beat.

const SHOT = SHOTS.s6_scrub;
const V = layout.video;
const CLIPS = V.clips.slice(0, 4);
const FILES = ['01', '02', '03', '04'];
const B = [136, 137, 138, 139, 140].map((b) => localBeat(SHOT, b)); // 0,15,30,44,59
const STOP = B[4];

// playhead x (screen), crossing each clip start exactly on its beat
const anchors = [
  { f: 2, x: CLIPS[0].x + 18 }, { f: B[1], x: CLIPS[1].x + 2 }, { f: B[2], x: CLIPS[2].x + 2 },
  { f: B[3], x: CLIPS[3].x + 2 }, { f: STOP, x: CLIPS[3].x + CLIPS[3].w * 0.42 },
];
export const playheadX = (f: number) => {
  if (f <= anchors[0].f) return anchors[0].x;
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1], b = anchors[i];
    if (f <= b.f) {
      const u = (f - a.f) / (b.f - a.f);
      // slow start on the first leg, constant through the middle, hard brake on the last
      const e = i === 1 ? u * u * (1.6 - 0.6 * u) : i === anchors.length - 1 ? EASE.snappy(u) : u;
      return mix(a.x, b.x, e);
    }
  }
  return anchors[anchors.length - 1].x;
};
const clipAt = (f: number) => (f < B[1] ? 0 : f < B[2] ? 1 : f < B[3] ? 2 : 3);

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60), fr = Math.floor((sec % 1) * 30);
  return [m, s, fr].map((n) => String(n).padStart(2, '0')).join(':');
};

export const S6Scrub: React.FC = () => {
  const f = useCurrentFrame();
  const ph = playheadX(f);
  const ci = clipAt(f);
  // camera: drifts in with the playhead during travel, then the push into the preview
  const travel = ramp(f, 0, 20, EASE.smooth) * (1 - ramp(f, STOP, 10, EASE.out));
  const push = ramp(f, STOP, 10, (t) => 1 - Math.pow(1 - t, 3));
  const P = V.preview;
  const focus = {
    x: mix(mix(960, ph, 0.18), P.x + P.w / 2, push),
    y: mix(mix(540, 640, 0.25 * travel), P.y + P.h / 2, push),
  };
  // review fix: a camera push cropped "Video Editing" / "04.webm" for the whole hold, so the camera
  // stays put and the push lands on the destination element itself (preview 1 → 1.2, out cubic 10f)
  void travel; void focus;
  const s = 1;
  const camT = 'none';
  const knob = { x: ph, y: V.scroll.y - 6 + 26 - 26 };
  const pose = handPose(f, [{ f: 0, x: knob.x, y: knob.y }], [1]);
  // world → screen through the camera so the fingertip stays on the knob
  const ox = 0, oy = 0;
  const knobS = { x: ox + knob.x * s, y: oy + knob.y * s };
  const handNow = { ...pose, x: knobS.x, y: knobS.y };
  const secs = [0, 7.4, 11.9, 16.3][ci] + (f - B[ci]) / 30; // timeline time, runs on
  return (
    <AbsoluteFill style={{ background: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: camT }}>
        <Img src={staticFile('textures/video-backplate.png')} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080 }} />
        {/* project name in the header */}
        <div style={{ position: 'absolute', left: V.project.x, top: V.project.y, width: V.project.w, height: V.project.h, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          fontFamily: DISPLAY, fontWeight: 200, fontSize: 64, letterSpacing: '-0.02em', color: '#fff' }}>
          {FILES[ci]}.webm
        </div>
        {/* preview: hard cut to each clip on its beat */}
        <div style={{ position: 'absolute', left: P.x, top: P.y, width: P.w, height: P.h, background: '#000', overflow: 'hidden', zIndex: 2,
          transformOrigin: '50% 60%', transform: `scale(${mix(1, 1.2, push).toFixed(4)})`, boxShadow: `0 ${(24 * push).toFixed(1)}px ${(60 * push).toFixed(1)}px rgba(0,0,0,${(0.25 * push).toFixed(3)})` }}>
          {FILES.map((name, i) => (
            <Sequence key={name} from={B[i]} durationInFrames={i < 3 ? B[i + 1] - B[i] : 200} layout="none">
              <OffthreadVideo src={staticFile(`videos-h264/${name}.mp4`)} muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </Sequence>
          ))}
          <div style={{ position: 'absolute', left: 8, bottom: 8, fontFamily: TEXT, fontSize: 15, color: '#fff', background: 'rgba(255,255,255,.14)', padding: '4px 8px', borderRadius: 2 }}>{fmt(secs)}</div>
        </div>
        {/* active clip outline, as on the site */}
        {(() => {
          const c = V.clipBodies[ci];
          return <div style={{ position: 'absolute', left: c.x - 5, top: c.y - 5, width: c.w + 10, height: c.h + 10, border: '2px solid #000' }} />;
        })()}
        {/* playhead */}
        <div style={{ position: 'absolute', left: ph - 1, top: V.scroll.y, width: 2, height: V.timeline.y + V.timeline.h - V.scroll.y, background: '#000' }} />
        <div style={{ position: 'absolute', left: ph - 7, top: V.scroll.y - 6, width: 14, height: 14, borderRadius: '50%', background: '#000' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${V.header.h - 30}px)` }}><Counter n={3} /></div>
      <ToyHand pose={handNow} ripples={[{ x: knobS.x, y: knobS.y, t: (f - 1) / 18 }]} />
    </AbsoluteFill>
  );
};
export const S6_CLAMP = clamp01;
