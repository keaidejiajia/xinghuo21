import { useState } from 'react';
import { INK } from '../data/theme';

export default function SidebarScene() {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgSrc, setImgSrc] = useState('sidebar-scene.webp');

  const handleImageError = () => {
    if (imgSrc.endsWith('.webp')) {
      setImgSrc('sidebar-scene.png');
      return;
    }
    setImgFailed(true);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}>
      {/* AI-generated background image — fallback: gradient above */}
      {!imgFailed && (
        <img
          src={imgSrc}
          alt=""
          onError={handleImageError}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            opacity: 0.6,
          }}
        />
      )}

      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(10,12,20,0.3) 0%, rgba(10,12,20,0.5) 50%, rgba(10,12,20,0.7) 100%)',
      }} />

      {/* CSS twinkling stars */}
      {Array.from({ length: 18 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            borderRadius: '50%',
            background: i % 5 === 0 ? INK.starGold : 'rgba(184,192,212,0.6)',
            top: `${5 + (i * 4.8) % 45}%`,
            left: `${10 + (i * 23) % 80}%`,
            animation: `star-twinkle ${3 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.7) % 5}s`,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}
