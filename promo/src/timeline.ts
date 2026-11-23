// Single source of truth for timing. All shot boundaries are beat numbers of House Vibez
// (analysis/beat_data.json): 122.002 BPM, T = 0.49180 s. The excerpt starts at beat 96 (55.15 s).
export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const BEAT_INT = 0.4918;
export const SOURCE_BEAT0 = 7.9356; // t0 of the grid, seconds into the mp3 (audit value, never edited)
export const START_BEAT = 96; // first beat of the excerpt
// Picture offset: the v1 render measured every beat anchor +1.72f late, all in the same direction
// (recorded in DESIGN-SPEC §5); shifting the picture by this constant brought all 18 anchors to
// |err| <= 0.51f (analysis/postcheck.json).
export const OUTPUT_AUDIO_OFFSET_SEC = 0.057;
// Audio-chain delay inside the encoded file: cross-correlation of the render's audio against the
// source excerpt = 23.3 ms (postcheck.json output_audio_offset_s). Applied to SFX start times only.
export const AUDIO_CHAIN_DELAY_SEC = 0.0233;
export const AUDIO_START_SEC = SOURCE_BEAT0 + START_BEAT * BEAT_INT; // where the excerpt begins in the mp3
export const beatT = (n: number) => (n - START_BEAT) * BEAT_INT + OUTPUT_AUDIO_OFFSET_SEC; // video seconds
export const beatF = (n: number) => Math.round(beatT(n) * FPS);

export const SHOTS = {
  s1_orbit: { from: 0, to: beatF(106) }, // film starts at frame 0 even with the picture offset
  s2_line: { from: beatF(106), to: beatF(112) },
  s3_drive: { from: beatF(112), to: beatF(122) },
  s4_destroy: { from: beatF(122), to: beatF(135) },
  s5_cut: { from: beatF(135), to: beatF(136) },
  s6_scrub: { from: beatF(136), to: beatF(143) },
  s7_cut: { from: beatF(143), to: beatF(144) },
  s8_box: { from: beatF(144), to: beatF(151) },
  s9_stamp: { from: beatF(151), to: beatF(162) },
} as const;
export const TOTAL = SHOTS.s9_stamp.to;
export type ShotKey = keyof typeof SHOTS;
// frames of beat n relative to a shot start
export const localBeat = (shot: { from: number }, n: number) => beatF(n) - shot.from;
