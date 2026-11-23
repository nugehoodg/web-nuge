// Central SFX table. Every entry is pinned so the sample's measured energy peak
// (public/audio/sfx/audio-manifest.json → analysis.energy_peak_seconds) lands on the action frame.
// Action frames derive from SHOTS / beatF only — never bare numbers.
import { AUDIO_CHAIN_DELAY_SEC, FPS, SHOTS, beatF } from './timeline';

export type Cue = { at: number; src: string; peak: number; volume: number; note: string; dur?: number };
const TAP = { src: 'audio/sfx/fs-670000.norm.mp3', peak: 0.035 }; // Lego click (short) — toy-hand tap
const TICK = { src: 'audio/sfx/fs-233653.norm.mp3', peak: 0.025 }; // LEGO click 5 — light ticks
const SWOOSH = { src: 'audio/sfx/fs-264591.norm.mp3', peak: 0.105 }; // belt swoosh — rod past the lens
const AIR = { src: 'audio/sfx/fs-878248.norm.mp3', peak: 0.035 }; // micro swish — ring opens / push-in
const MARKER = { src: 'audio/sfx/fs-321137.norm.mp3', peak: 0.215 }; // Sharpie drawing — the line
const CAR = { src: 'audio/sfx/fs-745182.norm.mp3', peak: 0.665 }; // toy car rolling
const BOING = { src: 'audio/sfx/fs-472478.norm.mp3', peak: 0.175 }; // battery spring boing — road hop
const FLAP = { src: 'audio/sfx/fs-676456.norm.mp3', peak: 0.235 }; // paper flapping — designs take off
const REWIND = { src: 'audio/sfx/fs-842582.norm.mp3', peak: 0.155 }; // vinyl rewind — time freezes
const REVERSE = { src: 'audio/sfx/fs-503813.norm.mp3', peak: 0.335 }; // reverse fx — swell into landing
const PILE = { src: 'audio/sfx/fs-416416.norm.mp3', peak: 0.085 }; // paper stack drop — landing
const RUSTLE = { src: 'audio/sfx/fs-334212.norm.mp3', peak: 0.095 }; // cardboard rustle — lift
const THUMP = { src: 'audio/sfx/fs-683031.norm.mp3', peak: 0.185 }; // thump — stamp hit

const s = SHOTS;
export const CUES: Cue[] = [
  { at: beatF(97), ...TAP, volume: 1.0, note: 's1 hand taps, ring blooms' },
  { at: beatF(97) + 3, ...AIR, volume: 0.9, note: 's1 ring opens' },
  { at: s.s2_line.from + 6, ...MARKER, volume: 1, note: 's2 divider drawn (pen scratch 1)' },
  { at: s.s2_line.from + 30, ...MARKER, volume: 1, note: 's2 line turns down (2)' },
  { at: s.s2_line.from + 54, ...MARKER, volume: 0.9, note: 's2 descent (3)' },
  { at: s.s2_line.from + 84, ...TICK, volume: 1.0, note: 's2 line closes onto the road (light knock)' },
  { at: s.s3_drive.from + 4, ...TAP, volume: 1.0, note: 's3 hand grabs the car' },
  { at: s.s3_drive.from + 40, ...CAR, volume: 0.9, note: 's3 car rolls', dur: 1.4 },
  { at: beatF(116), ...BOING, volume: 0.85, note: 's3 road hop 1' },
  { at: beatF(120), ...BOING, volume: 0.7, note: 's3 road hop 2 (quieter, anti machine-gun)' },
  { at: beatF(124), ...TAP, volume: 1.0, note: 's4 hand taps Destroy' },
  { at: beatF(124) + 4, ...FLAP, volume: 0.9, note: 's4 designs take off' },
  { at: beatF(126), ...REWIND, volume: 0.8, note: 's4 time freezes' },
  { at: beatF(132), ...REVERSE, volume: 0.6, note: 's4 swell peaks into the landing' },
  { at: beatF(132), ...PILE, volume: 0.75, note: 's4 designs land on the road (impact #1)' },
  { at: s.s5_cut.from + 7, ...SWOOSH, volume: 0.6, note: 's5 rod sweeps past the lens' },
  { at: s.s6_scrub.from + 1, ...TAP, volume: 1.0, note: 's6 hand grabs the playhead' },
  { at: beatF(137), ...TICK, volume: 1.0, note: 's6 clip 2' },
  { at: beatF(138), ...TICK, volume: 0.9, note: 's6 clip 3' },
  { at: beatF(139), ...TICK, volume: 0.8, note: 's6 clip 4' },
  { at: beatF(140), ...AIR, volume: 0.9, note: 's6 push into the preview' },
  { at: s.s7_cut.from + 7, ...SWOOSH, volume: 0.55, note: 's7 rod sweeps past the lens' },
  { at: beatF(144), ...TAP, volume: 1.0, note: 's8 poke camera' },
  { at: beatF(144) + 4, ...RUSTLE, volume: 1, note: 's8 camera lifts' },
  { at: beatF(146), ...TAP, volume: 0.9, note: 's8 poke controller' },
  { at: beatF(146) + 4, ...RUSTLE, volume: 0.9, note: 's8 controller lifts' },
  { at: beatF(148), ...TAP, volume: 0.95, note: 's8 poke photo' },
  { at: beatF(148) + 4, ...RUSTLE, volume: 1, note: 's8 photo lifts (About Me)' },
  { at: beatF(152), ...THUMP, volume: 0.9, note: 's9 stamp hits (impact #2)' },
];
// peak lands on the action frame, minus the measured audio-chain delay of the encoded output
export const cueFrom = (c: Cue) => Math.max(0, Math.round(c.at - (c.peak + AUDIO_CHAIN_DELAY_SEC) * FPS));
