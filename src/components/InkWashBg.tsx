import React from 'react';

interface InkWashBgProps {
  side?: 'front' | 'back';
  intensity?: 'subtle' | 'medium' | 'strong';
  animated?: boolean;
}

const INTENSITY_MAP = {
  subtle: { main: 0.03, secondary: 0.02 },
  medium: { main: 0.05, secondary: 0.03 },
  strong: { main: 0.08, secondary: 0.05 },
};

export default React.memo(function InkWashBg({ side = 'front', intensity = 'medium', animated = true }: InkWashBgProps) {
  const op = INTENSITY_MAP[intensity];
  const isFront = side === 'front';

  const warmColor = isFront
    ? `rgba(212,168,83,${op.main})`
    : `rgba(196,65,37,${op.main})`;
  const coolColor = isFront
    ? `rgba(123,139,181,${op.secondary})`
    : `rgba(212,122,40,${op.secondary})`;
  const deepColor = `rgba(60,50,40,${op.secondary})`;

  const driftAnimation = animated ? 'ink-drift 25s ease-in-out infinite' : 'none';
  const floatAnimation = animated ? 'ink-cloud-float 30s ease-in-out infinite' : 'none';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute',
        top: '10%', left: '20%',
        width: '60%', height: '50%',
        background: `radial-gradient(ellipse, ${warmColor}, transparent 70%)`,
        animation: driftAnimation,
        animationDelay: '0s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%', right: '10%',
        width: '50%', height: '45%',
        background: `radial-gradient(ellipse, ${coolColor}, transparent 65%)`,
        animation: floatAnimation,
        animationDelay: '-8s',
      }} />
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '40%', height: '40%',
        background: `radial-gradient(ellipse, ${deepColor}, transparent 60%)`,
        animation: driftAnimation,
        animationDelay: '-15s',
      }} />
    </div>
  );
});
