import { useState } from 'react';
import type { CardSide } from '../types';
import { D } from '../data/theme';

interface LevelIllustrationProps {
  side: CardSide;
  level: number;
  size?: number;
  style?: React.CSSProperties;
}

const LEVEL_NAMES: Record<string, string[]> = {
  front: ['北极星', '弦月', '薄云遮星', '流星', '雾中孤星', '深谷余烬'],
  back: ['冰封心火', '火光初燃', '烛火摇曳', '篝火渐旺', '熔炉之心', '不朽晨辉'],
};

export default function LevelIllustration({ side, level, size = 200, style }: LevelIllustrationProps) {
  const [failed, setFailed] = useState(false);
  const [ext, setExt] = useState<'webp' | 'png'>('webp');
  const idx = Math.min(Math.max(level - 1, 0), 5);
  const prefix = side === 'front' ? 'front' : 'back';
  const name = LEVEL_NAMES[side]?.[idx] ?? '';
  const src = `levels/${prefix}-${level}.${ext}`;

  const handleError = () => {
    if (ext === 'webp') {
      setExt('png');
      return;
    }
    setFailed(true);
  };

  if (failed) return null;

  return (
    <div
      role="img"
      aria-label={name}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: D.radiusSm,
        opacity: 0.85,
        ...style,
      }}
      onError={() => setFailed(true)}
    >
      {/* Hidden img to detect load failure — background-image has no onError */}
      <img
        src={src}
        alt=""
        style={{ display: 'none' }}
        onError={handleError}
      />
    </div>
  );
}
