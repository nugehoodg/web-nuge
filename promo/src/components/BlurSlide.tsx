import React from 'react';
import { EASE, clamp01 } from '../lib/motion';

// blur-slide card: each word rises (y ≈ 0.38em main / smaller for sub), un-blurs and fades in,
// all three channels driven by the SAME p (card pitfall: never split the easing per channel).
export const BlurSlideLine: React.FC<{
  frame: number; start: number; text: string; fontFamily: string; fontWeight: number; fontSize: number;
  color?: string; stagger?: number; win?: number; rise?: number; blur?: number; letterSpacing?: string;
  style?: React.CSSProperties;
}> = ({ frame, start, text, fontFamily, fontWeight, fontSize, color = '#0a0a0a', stagger = 4, win = 22, rise, blur = 18, letterSpacing = '-0.03em', style }) => {
  const words = text.split(' ');
  const dy = rise ?? fontSize * 0.38;
  // card pitfall: blur above ~12% of the font size smears into a block
  const maxBlur = Math.min(blur, fontSize * 0.12);
  return (
    <div style={{ display: 'flex', gap: `${(fontSize * 0.26).toFixed(1)}px`, fontFamily, fontWeight, fontSize, lineHeight: 0.95, color, letterSpacing, whiteSpace: 'nowrap', ...style }}>
      {words.map((w, i) => {
        const p = EASE.out(clamp01((frame - start - i * stagger) / win));
        return (
          <span key={i} style={{
            display: 'inline-block', opacity: p,
            transform: `translateY(${((1 - p) * dy).toFixed(2)}px)`,
            filter: p >= 0.999 ? undefined : `blur(${((1 - p) * maxBlur).toFixed(2)}px)`,
          }}>{w}</span>
        );
      })}
    </div>
  );
};
