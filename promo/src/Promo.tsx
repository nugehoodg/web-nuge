import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { AUDIO_START_SEC, FPS, SHOTS, TOTAL, beatF } from './timeline';
import { loadFonts } from './lib/fonts';
import { CUES, cueFrom } from './sfx';
import { S1Orbit } from './shots/S1Orbit';
import { S2Line } from './shots/S2Line';
import { S3Drive } from './shots/S3Drive';
import { S4Destroy } from './shots/S4Destroy';
import { S6Scrub } from './shots/S6Scrub';
import { RodCut } from './components/RodCut';
import { S8Box } from './shots/S8Box';
import { S9Stamp } from './shots/S9Stamp';

loadFonts();

export type PromoProps = { bgm: boolean };
// master gain: keeps the summed music + SFX under -1 dBFS (final review A1: v2 peaked at +0.2 dBFS)
export const MASTER = 0.75;
// music gain: lowered so taps, ticks and the car read over it (final review A6)
export const MUSIC = 0.36;

export const Promo: React.FC<PromoProps> = ({ bgm = true }) => {
  const seq = (k: keyof typeof SHOTS, el: React.ReactNode) => (
    <Sequence from={SHOTS[k].from} durationInFrames={SHOTS[k].to - SHOTS[k].from} name={k}>{el}</Sequence>
  );
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      {bgm && (
        <Audio src={staticFile('audio/house-vibez.mp3')} startFrom={Math.round(AUDIO_START_SEC * FPS)}
          volume={(f) => interpolate(f, [0, 4, beatF(158), TOTAL], [0, MUSIC * MASTER, MUSIC * MASTER, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      )}
      {CUES.map((c, i) => (
        <Sequence key={'sfx' + i} from={cueFrom(c)} durationInFrames={Math.round((c.dur ?? 1.2) * FPS)} name={'sfx: ' + c.note} layout="none">
          <Audio src={staticFile(c.src)} volume={c.volume * MASTER} />
        </Sequence>
      ))}
      {seq('s1_orbit', <S1Orbit />)}
      {seq('s2_line', <S2Line />)}
      {seq('s3_drive', <S3Drive />)}
      {seq('s4_destroy', <S4Destroy />)}
      {seq('s5_cut', <RodCut before={<S4Destroy />} beforeFrame={SHOTS.s4_destroy.to - SHOTS.s4_destroy.from - 1} after={<S6Scrub />} afterFrame={0} />)}
      {seq('s6_scrub', <S6Scrub />)}
      {seq('s7_cut', <RodCut before={<S6Scrub />} beforeFrame={SHOTS.s6_scrub.to - SHOTS.s6_scrub.from - 1} after={<S8Box />} afterFrame={0} />)}
      {seq('s8_box', <S8Box />)}
      {seq('s9_stamp', <S9Stamp />)}
    </AbsoluteFill>
  );
};
