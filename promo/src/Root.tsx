import React from 'react';
import { Composition } from 'remotion';
import { Promo } from './Promo';
import { TOTAL, FPS, W, H } from './timeline';

export const Root: React.FC = () => (
  <Composition id="Promo" component={Promo} defaultProps={{ bgm: true }} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
