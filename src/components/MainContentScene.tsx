import React, { useState } from 'react';
import { INK } from '../data/theme';

interface Props {
  bgShift?: number;
}

export default React.memo(function MainContentScene({ bgShift = 0 }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* Wider background layer — shifted with translateX for visible movement */}
      <div style={{
        position: 'absolute',
        left: '-20%',
        top: '-5%',
        width: '140%',
        height: '110%',
        backgroundImage: imgFailed
          ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'
          : 'url(main-bg.png)',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        opacity: imgFailed ? 1 : 0.35,
        transform: `translateX(${bgShift}px)`,
        transition: 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
        willChange: 'transform',
      }}>
        {/* Hidden img to detect load failure */}
        {!imgFailed && (
          <img
            src="main-bg.png"
            alt=""
            style={{ display: 'none' }}
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      {/* Fallback gradient if image failed */}
      {imgFailed && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        }} />
      )}

      {/* Overlay — keeps text readable */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(10,12,20,0.55) 0%, rgba(10,12,20,0.45) 50%, rgba(10,12,20,0.6) 100%)',
      }} />

      {/* CSS twinkling stars */}
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            borderRadius: '50%',
            background: i % 4 === 0 ? INK.starGold : 'rgba(184,192,212,0.5)',
            top: `${5 + (i * 7.3) % 85}%`,
            left: `${5 + (i * 29) % 90}%`,
            animation: `star-twinkle ${3 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${(i * 1.1) % 5}s`,
            opacity: 0.4,
          }}
        />
      ))}
    </div>
  );
});
