import React from 'react';
import { D, INK } from '../data/theme';

// ===== Level Visual Icons — 12 Distinctive SVGs =====

interface LevelIconProps {
  side: 'front' | 'back';
  level: number;
  size?: number;
}

// --- Front Side SVGs: Stars & Night Sky ---

const FrontLevel1SVG = ({ color }: { color: string }) => (
  // 北极星 — bright four-pointed star with radiating light beams
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Light beams */}
    <line x1="24" y1="2" x2="24" y2="14" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <line x1="24" y1="34" x2="24" y2="46" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <line x1="2" y1="24" x2="14" y2="24" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <line x1="34" y1="24" x2="46" y2="24" stroke={color} strokeWidth="1.2" opacity="0.5" />
    {/* Diagonal beams */}
    <line x1="9" y1="9" x2="16" y2="16" stroke={color} strokeWidth="0.8" opacity="0.3" />
    <line x1="32" y1="32" x2="39" y2="39" stroke={color} strokeWidth="0.8" opacity="0.3" />
    <line x1="39" y1="9" x2="32" y2="16" stroke={color} strokeWidth="0.8" opacity="0.3" />
    <line x1="16" y1="32" x2="9" y2="39" stroke={color} strokeWidth="0.8" opacity="0.3" />
    {/* Four-pointed star body */}
    <path d="M24 6L27 20L42 24L27 28L24 42L21 28L6 24L21 20Z" fill={color} opacity="0.9" />
    {/* Bright center */}
    <circle cx="24" cy="24" r="3" fill="#fff" opacity="0.8" />
    <circle cx="24" cy="24" r="6" fill={color} opacity="0.3" />
  </svg>
);

const FrontLevel2SVG = ({ color }: { color: string }) => (
  // 弦月 — crescent moon with a single star
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Moon glow */}
    <circle cx="20" cy="24" r="16" fill={color} opacity="0.08" />
    {/* Crescent moon */}
    <path d="M26 8C16 10 10 18 10 28C10 34 14 40 22 42C14 38 10 32 10 24C10 16 16 10 26 8Z" fill={color} opacity="0.8" />
    {/* Moon arc highlight */}
    <path d="M24 9C17 11 12 17 12 25" stroke={color} strokeWidth="1" opacity="0.4" fill="none" />
    {/* Companion star */}
    <circle cx="35" cy="12" r="2" fill={color} opacity="0.7" />
    <line x1="35" y1="8" x2="35" y2="16" stroke={color} strokeWidth="0.6" opacity="0.4" />
    <line x1="31" y1="12" x2="39" y2="12" stroke={color} strokeWidth="0.6" opacity="0.4" />
    {/* Small stars */}
    <circle cx="32" cy="20" r="1" fill={color} opacity="0.4" />
    <circle cx="38" cy="24" r="0.8" fill={color} opacity="0.3" />
  </svg>
);

const FrontLevel3SVG = ({ color }: { color: string }) => (
  // 薄云遮星 — star partially hidden behind wispy clouds
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Star behind clouds */}
    <path d="M20 10L22 18L30 20L22 22L20 30L18 22L10 20L18 18Z" fill={color} opacity="0.5" />
    {/* Upper cloud veil */}
    <path d="M8 14C8 14 14 10 22 12C30 14 32 11 38 13C40 14 42 16 40 18C38 20 34 18 30 19C26 20 22 17 18 18C14 19 10 16 8 14Z" fill={color} opacity="0.2" />
    {/* Lower cloud */}
    <path d="M12 24C12 24 18 21 26 23C34 25 36 22 42 24C44 25 44 27 42 28C38 30 34 28 30 29C26 30 22 28 18 28C14 28 12 26 12 24Z" fill={color} opacity="0.25" />
    {/* Star still peeking through */}
    <circle cx="20" cy="17" r="2.5" fill={color} opacity="0.7" />
  </svg>
);

const FrontLevel4SVG = ({ color }: { color: string }) => (
  // 流星 — shooting star with trail
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Trail */}
    <path d="M44 4C44 4 36 12 30 18C24 24 20 28 14 34" stroke={color} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
    <path d="M42 6C42 6 34 14 28 20C22 26 18 30 12 36" stroke={color} strokeWidth="0.8" opacity="0.2" strokeLinecap="round" />
    {/* Bright trail particles */}
    <circle cx="36" cy="12" r="1" fill={color} opacity="0.4" />
    <circle cx="30" cy="18" r="0.8" fill={color} opacity="0.3" />
    <circle cx="24" cy="24" r="0.6" fill={color} opacity="0.2" />
    {/* Star head */}
    <path d="M8 38L10 34L14 36L12 40Z" fill={color} opacity="0.8" />
    <circle cx="10" cy="37" r="2.5" fill={color} opacity="0.9" />
    <circle cx="10" cy="37" r="1.2" fill="#fff" opacity="0.6" />
  </svg>
);

const FrontLevel5SVG = ({ color }: { color: string }) => (
  // 雾中孤星 — lone star dimly visible in fog rings
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Outer fog ring */}
    <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="0.5" opacity="0.1" strokeDasharray="3 5" />
    {/* Middle fog ring */}
    <circle cx="24" cy="24" r="15" stroke={color} strokeWidth="0.8" opacity="0.15" strokeDasharray="2 4" />
    {/* Inner fog ring */}
    <circle cx="24" cy="24" r="10" stroke={color} strokeWidth="1" opacity="0.2" strokeDasharray="2 3" />
    {/* Dim star at center */}
    <path d="M24 16L25.5 22L32 24L25.5 26L24 32L22.5 26L16 24L22.5 22Z" fill={color} opacity="0.4" />
    <circle cx="24" cy="24" r="1.5" fill={color} opacity="0.5" />
    {/* Fog wisps */}
    <path d="M8 30C12 28 18 32 24 30C30 28 36 32 40 30" stroke={color} strokeWidth="1" opacity="0.08" fill="none" />
    <path d="M6 36C10 34 16 38 22 36C28 34 34 38 42 36" stroke={color} strokeWidth="0.8" opacity="0.06" fill="none" />
  </svg>
);

const FrontLevel6SVG = ({ color }: { color: string }) => (
  // 深谷余烬 — barely visible ember in a deep valley chasm
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Valley walls */}
    <path d="M4 4L16 20L16 28L4 44" stroke={color} strokeWidth="1" opacity="0.15" fill="none" />
    <path d="M44 4L32 20L32 28L44 44" stroke={color} strokeWidth="1" opacity="0.15" fill="none" />
    {/* Valley floor shadow */}
    <path d="M16 28L24 32L32 28" stroke={color} strokeWidth="0.8" opacity="0.1" fill="none" />
    {/* Faint ember glow */}
    <circle cx="24" cy="30" r="6" fill={color} opacity="0.06" />
    <circle cx="24" cy="30" r="3" fill={color} opacity="0.1" />
    {/* Tiny ember dot */}
    <circle cx="24" cy="30" r="1.5" fill={INK.flameEmber} opacity="0.5" />
    {/* Almost extinguished spark */}
    <circle cx="23" cy="28" r="0.5" fill={INK.flameGold} opacity="0.3" />
  </svg>
);

// --- Back Side SVGs: Fire & Transformation ---

const BackLevel1SVG = ({ color }: { color: string }) => (
  // 冰封心火 — ice crystals enclosing a small flame
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Ice crystal hexagon */}
    <path d="M24 6L38 14L38 34L24 42L10 34L10 14Z" stroke={color} strokeWidth="1" opacity="0.3" fill="none" />
    {/* Ice facets */}
    <line x1="24" y1="6" x2="24" y2="42" stroke={color} strokeWidth="0.5" opacity="0.15" />
    <line x1="10" y1="14" x2="38" y2="34" stroke={color} strokeWidth="0.5" opacity="0.15" />
    <line x1="38" y1="14" x2="10" y2="34" stroke={color} strokeWidth="0.5" opacity="0.15" />
    {/* Small flame inside */}
    <path d="M24 18C24 18 20 24 20 28C20 30.5 21.8 32 24 32C26.2 32 28 30.5 28 28C28 24 24 18 24 18Z" fill={INK.flameEmber} opacity="0.5" />
    <path d="M24 22C24 22 22 26 22 28C22 29.2 22.9 30 24 30C25.1 30 26 29.2 26 28C26 26 24 22 24 22Z" fill={INK.flameGold} opacity="0.6" />
    {/* Ice frost on edges */}
    <circle cx="14" cy="15" r="1" fill={color} opacity="0.3" />
    <circle cx="34" cy="15" r="1" fill={color} opacity="0.3" />
    <circle cx="14" cy="33" r="1" fill={color} opacity="0.2" />
    <circle cx="34" cy="33" r="1" fill={color} opacity="0.2" />
  </svg>
);

const BackLevel2SVG = ({ color }: { color: string }) => (
  // 火光初燃 — small flame just lit, with sparks
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Ground line */}
    <line x1="14" y1="40" x2="34" y2="40" stroke={color} strokeWidth="1" opacity="0.2" />
    {/* Small flame */}
    <path d="M24 12C24 12 18 22 18 30C18 34 20.5 38 24 38C27.5 38 30 34 30 30C30 22 24 12 24 12Z" fill={color} opacity="0.6" />
    <path d="M24 18C24 18 21 26 21 30C21 32.5 22.5 34 24 34C25.5 34 27 32.5 27 30C27 26 24 18 24 18Z" fill={INK.flameGold} opacity="0.7" />
    {/* Bright core */}
    <path d="M24 24C24 24 22.5 28 22.5 30C22.5 31.2 23.2 32 24 32C24.8 32 25.5 31.2 25.5 30C25.5 28 24 24 24 24Z" fill="#fff" opacity="0.4" />
    {/* Rising sparks */}
    <circle cx="22" cy="10" r="1" fill={INK.flameGold} opacity="0.5" />
    <circle cx="27" cy="7" r="0.8" fill={color} opacity="0.4" />
    <circle cx="20" cy="6" r="0.6" fill={INK.flameGold} opacity="0.3" />
  </svg>
);

const BackLevel3SVG = ({ color }: { color: string }) => (
  // 烛火摇曳 — candle with flickering flame and glow halo
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Glow halo */}
    <circle cx="24" cy="18" r="14" fill={color} opacity="0.06" />
    <circle cx="24" cy="18" r="8" fill={color} opacity="0.08" />
    {/* Candle body */}
    <rect x="21" y="28" width="6" height="14" rx="1" fill={color} opacity="0.2" />
    <rect x="22" y="28" width="4" height="14" rx="0.5" fill={color} opacity="0.1" />
    {/* Wick */}
    <line x1="24" y1="28" x2="24" y2="25" stroke={color} strokeWidth="0.8" opacity="0.4" />
    {/* Flickering flame */}
    <path d="M24 8C24 8 19 16 19 22C19 25 21 27 24 27C27 27 29 25 29 22C29 16 24 8 24 8Z" fill={color} opacity="0.7" />
    <path d="M24 14C24 14 21 20 21 23C21 24.5 22.3 25.5 24 25.5C25.7 25.5 27 24.5 27 23C27 20 24 14 24 14Z" fill={INK.flameGold} opacity="0.8" />
    {/* Bright tip */}
    <ellipse cx="24" cy="16" rx="2" ry="3" fill="#fff" opacity="0.25" />
    {/* Dripping wax */}
    <path d="M21 30C21 30 20 32 21 32" stroke={color} strokeWidth="0.5" opacity="0.15" fill="none" />
  </svg>
);

const BackLevel4SVG = ({ color }: { color: string }) => (
  // 篝火渐旺 — campfire with rising heat waves and embers
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Heat waves */}
    <path d="M16 6C18 8 16 12 18 14" stroke={color} strokeWidth="0.6" opacity="0.15" fill="none" />
    <path d="M24 4C26 6 24 10 26 12" stroke={color} strokeWidth="0.8" opacity="0.2" fill="none" />
    <path d="M32 6C34 8 32 12 34 14" stroke={color} strokeWidth="0.6" opacity="0.15" fill="none" />
    {/* Main fire body */}
    <path d="M24 4C24 4 14 16 14 28C14 34 18 40 24 40C30 40 34 34 34 28C34 16 24 4 24 4Z" fill={color} opacity="0.5" />
    <path d="M24 10C24 10 17 20 17 28C17 32 20 36 24 36C28 36 31 32 31 28C31 20 24 10 24 10Z" fill={INK.flameGold} opacity="0.6" />
    {/* Hot core */}
    <path d="M24 18C24 18 20 26 20 30C20 32.5 21.8 34 24 34C26.2 34 28 32.5 28 30C28 26 24 18 24 18Z" fill="#fff" opacity="0.2" />
    {/* Log base */}
    <line x1="12" y1="42" x2="36" y2="42" stroke={color} strokeWidth="2" opacity="0.3" strokeLinecap="round" />
    <line x1="16" y1="40" x2="32" y2="40" stroke={color} strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
    {/* Floating embers */}
    <circle cx="18" cy="12" r="1" fill={INK.flameGold} opacity="0.5" />
    <circle cx="30" cy="8" r="0.8" fill={color} opacity="0.4" />
    <circle cx="22" cy="6" r="0.6" fill={INK.flameGold} opacity="0.3" />
    <circle cx="28" cy="10" r="0.7" fill={color} opacity="0.35" />
  </svg>
);

const BackLevel5SVG = ({ color }: { color: string }) => (
  // 熔炉之心 — forge/furnace with intense inner glow
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Furnace body */}
    <rect x="10" y="14" width="28" height="24" rx="3" stroke={color} strokeWidth="1.5" opacity="0.3" fill="none" />
    {/* Furnace opening */}
    <rect x="14" y="18" width="20" height="16" rx="2" fill={color} opacity="0.12" />
    {/* Intense inner glow */}
    <circle cx="24" cy="26" r="7" fill={color} opacity="0.2" />
    <circle cx="24" cy="26" r="4" fill={INK.flameGold} opacity="0.3" />
    <circle cx="24" cy="26" r="2" fill="#fff" opacity="0.2" />
    {/* Molten metal glow from bottom */}
    <path d="M14 32C14 32 18 36 24 36C30 36 34 32 34 32" fill={color} opacity="0.3" />
    {/* Anvil hint at bottom */}
    <rect x="16" y="38" width="16" height="4" rx="1" stroke={color} strokeWidth="1" opacity="0.2" fill="none" />
    <rect x="20" y="36" width="8" height="2" rx="0.5" fill={color} opacity="0.15" />
    {/* Heat radiation lines */}
    <line x1="8" y1="22" x2="10" y2="22" stroke={color} strokeWidth="0.8" opacity="0.2" />
    <line x1="8" y1="26" x2="10" y2="26" stroke={color} strokeWidth="0.8" opacity="0.2" />
    <line x1="8" y1="30" x2="10" y2="30" stroke={color} strokeWidth="0.8" opacity="0.2" />
    {/* Sparks from forge */}
    <circle cx="20" cy="14" r="0.8" fill={INK.flameGold} opacity="0.4" />
    <circle cx="28" cy="12" r="0.6" fill={color} opacity="0.35" />
    <circle cx="24" cy="10" r="0.7" fill={INK.flameGold} opacity="0.3" />
  </svg>
);

const BackLevel6SVG = ({ color }: { color: string }) => (
  // 不朽晨辉 — eternal dawn radiance, crown of light
  <svg viewBox="0 0 48 48" fill="none" style={{ width: '100%', height: '100%' }}>
    {/* Outer radiance */}
    <circle cx="24" cy="24" r="22" fill={color} opacity="0.04" />
    <circle cx="24" cy="24" r="16" fill={color} opacity="0.06" />
    {/* Radiating beams */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
      <line
        key={i}
        x1={24 + Math.cos(angle * Math.PI / 180) * 10}
        y1={24 + Math.sin(angle * Math.PI / 180) * 10}
        x2={24 + Math.cos(angle * Math.PI / 180) * 22}
        y2={24 + Math.sin(angle * Math.PI / 180) * 22}
        stroke={color}
        strokeWidth={i % 2 === 0 ? 1.2 : 0.6}
        opacity={i % 2 === 0 ? 0.5 : 0.25}
      />
    ))}
    {/* Crown shape */}
    <path d="M12 28L16 18L20 24L24 14L28 24L32 18L36 28" stroke={color} strokeWidth="1.5" opacity="0.6" fill="none" />
    {/* Central sun */}
    <circle cx="24" cy="24" r="6" fill={color} opacity="0.3" />
    <circle cx="24" cy="24" r="4" fill={INK.flameGold} opacity="0.5" />
    <circle cx="24" cy="24" r="2" fill="#fff" opacity="0.5" />
    {/* Inner ring */}
    <circle cx="24" cy="24" r="8" stroke={color} strokeWidth="0.5" opacity="0.2" />
  </svg>
);

// --- Level visual config ---

const frontLevelConfig: Record<number, { glow: string; color: string; ringColor: string }> = {
  1: { glow: `0 0 18px rgba(212,168,83,0.6), 0 0 36px rgba(212,168,83,0.3)`, color: INK.starGold, ringColor: 'rgba(212,168,83,0.25)' },
  2: { glow: `0 0 14px rgba(184,192,212,0.4), 0 0 28px rgba(184,192,212,0.2)`, color: INK.starSilver, ringColor: 'rgba(184,192,212,0.2)' },
  3: { glow: `0 0 10px rgba(123,139,181,0.3)`, color: INK.starBlue, ringColor: 'rgba(123,139,181,0.15)' },
  4: { glow: `0 0 8px rgba(123,139,181,0.25)`, color: '#5a6380', ringColor: 'rgba(123,139,181,0.1)' },
  5: { glow: `0 0 6px rgba(74,83,112,0.2)`, color: INK.starBlueMuted, ringColor: 'rgba(74,83,112,0.1)' },
  6: { glow: 'none', color: '#363d52', ringColor: 'rgba(54,61,82,0.1)' },
};

const backLevelConfig: Record<number, { glow: string; color: string; ringColor: string }> = {
  1: { glow: `0 0 8px rgba(107,143,173,0.3)`, color: '#6b8fad', ringColor: 'rgba(107,143,173,0.15)' },
  2: { glow: `0 0 10px rgba(212,122,40,0.4)`, color: INK.flameEmber, ringColor: 'rgba(212,122,40,0.2)' },
  3: { glow: `0 0 14px rgba(212,122,40,0.4), 0 0 28px rgba(212,122,40,0.2)`, color: '#c46a20', ringColor: 'rgba(196,106,32,0.2)' },
  4: { glow: `0 0 16px rgba(196,65,37,0.4), 0 0 32px rgba(196,65,37,0.2)`, color: INK.flameCinnabar, ringColor: 'rgba(196,65,37,0.2)' },
  5: { glow: `0 0 20px rgba(168,48,32,0.4), 0 0 40px rgba(168,48,32,0.2)`, color: '#a83020', ringColor: 'rgba(168,48,32,0.2)' },
  6: { glow: `0 0 24px rgba(232,197,90,0.6), 0 0 48px rgba(232,197,90,0.3), 0 0 72px rgba(232,197,90,0.1)`, color: INK.flameGold, ringColor: 'rgba(232,197,90,0.3)' },
};

const frontSVGs: Record<number, React.FC<{ color: string }>> = {
  1: FrontLevel1SVG,
  2: FrontLevel2SVG,
  3: FrontLevel3SVG,
  4: FrontLevel4SVG,
  5: FrontLevel5SVG,
  6: FrontLevel6SVG,
};

const backSVGs: Record<number, React.FC<{ color: string }>> = {
  1: BackLevel1SVG,
  2: BackLevel2SVG,
  3: BackLevel3SVG,
  4: BackLevel4SVG,
  5: BackLevel5SVG,
  6: BackLevel6SVG,
};

export function LevelIcon({ side, level, size = 40 }: LevelIconProps) {
  const config = side === 'front' ? frontLevelConfig[level] : backLevelConfig[level];
  const SVGComponent = side === 'front' ? frontSVGs[level] : backSVGs[level];
  if (!config || !SVGComponent) return null;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle, ${config.ringColor} 0%, transparent 70%)`,
        boxShadow: config.glow,
        flexShrink: 0,
        userSelect: 'none' as const,
        filter: `drop-shadow(0 0 ${Math.max(2, size / 10)}px ${config.color}40)`,
      }}
    >
      <SVGComponent color={config.color} />
    </div>
  );
}

// ===== Star Shield Icon — Custom SVG =====

interface ShieldIconProps {
  count: number;
  size?: number;
}

export function ShieldIcon({ count, size = 16 }: ShieldIconProps) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: size * 0.75,
        color: INK.starGold,
        textShadow: `0 0 8px rgba(212,168,83,0.4)`,
        fontFamily: "'LXGW WenKai', serif",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        {/* Shield body */}
        <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke={INK.starGold} strokeWidth="1.5" fill={INK.starGold} fillOpacity="0.15" />
        {/* Star on shield */}
        <path d="M12 7L13 10H16L13.5 12L14.5 15L12 13L9.5 15L10.5 12L8 10H11Z" fill={INK.starGold} opacity="0.8" />
        {/* Star dust particles */}
        <circle cx="6" cy="8" r="0.5" fill={INK.starGold} opacity="0.5" />
        <circle cx="18" cy="8" r="0.5" fill={INK.starGold} opacity="0.5" />
        <circle cx="8" cy="18" r="0.4" fill={INK.starGold} opacity="0.3" />
        <circle cx="16" cy="18" r="0.4" fill={INK.starGold} opacity="0.3" />
      </svg>
      {count}
    </span>
  );
}

// ===== Heart Demon Mark Icon — Custom SVG =====

interface HeartDemonIconProps {
  count: number;
  size?: number;
}

export function HeartDemonIcon({ count, size = 16 }: HeartDemonIconProps) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: size * 0.75,
        color: '#e07060',
        textShadow: `0 0 8px rgba(196,65,37,0.4)`,
        fontFamily: "'LXGW WenKai', serif",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        {/* Outer seal ring */}
        <circle cx="12" cy="12" r="9" stroke="#e07060" strokeWidth="1.2" opacity="0.6" strokeDasharray="2 2" />
        {/* Inner crack pattern */}
        <path d="M12 3L12 10L8 14L12 12L16 16L12 21" stroke="#c44125" strokeWidth="1.2" opacity="0.7" />
        {/* Center mark */}
        <circle cx="12" cy="12" r="2.5" fill="#e07060" opacity="0.3" />
        <circle cx="12" cy="12" r="1.2" fill="#c44125" opacity="0.6" />
        {/* Side cracks */}
        <path d="M5 8L8 10" stroke="#e07060" strokeWidth="0.8" opacity="0.4" />
        <path d="M19 8L16 10" stroke="#e07060" strokeWidth="0.8" opacity="0.4" />
        <path d="M7 18L9 15" stroke="#e07060" strokeWidth="0.6" opacity="0.3" />
        <path d="M17 18L15 15" stroke="#e07060" strokeWidth="0.6" opacity="0.3" />
      </svg>
      {count}
    </span>
  );
}

// ===== Eclipse Icon (星蚀/蒙尘标记) =====

interface EclipseIconProps {
  size?: number;
  color?: string;
}

export function EclipseIcon({ size = 14, color }: EclipseIconProps) {
  const c = color ?? INK.starBlue;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 2px rgba(123,139,181,0.5))' }}
    >
      <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.5" opacity="0.8" />
      <circle cx="15" cy="10" r="5.5" fill="#5a6a90" opacity="0.9" />
      <circle cx="8" cy="14" r="1.5" fill={INK.starGold} opacity="0.9" />
    </svg>
  );
}

// ===== Spark Icon (火种/星火标记) =====

interface SparkIconProps {
  size?: number;
  color?: string;
}

export function SparkIcon({ size = 14, color }: SparkIconProps) {
  const c = color ?? INK.flameEmber;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 3C12 3 7 9 7 14C7 17.5 9.2 20 12 20C14.8 20 17 17.5 17 14C17 9 12 3 12 3Z"
        fill={c}
        opacity="0.7"
      />
      <path
        d="M12 9C12 9 10 12 10 14.5C10 16 10.9 17 12 17C13.1 17 14 16 14 14.5C14 12 12 9 12 9Z"
        fill={INK.flameGold}
        opacity="0.9"
      />
    </svg>
  );
}

// ===== Stat Icons — Dashboard 统计面板专用 =====

// 星蚀 (Star Eclipse) — 统计面板图标
export function StarEclipseStatIcon({ size = 20, color }: { size?: number; color?: string }) {
  const c = color ?? '#c44125';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.2" opacity="0.5" />
      <circle cx="15" cy="10" r="6" fill={c} opacity="0.25" />
      <path d="M12 4L13.2 9L18 12L13.2 15L12 20L10.8 15L6 12L10.8 9Z" fill={c} opacity="0.6" />
      <circle cx="9" cy="14" r="1.8" fill={c} opacity="0.8" />
    </svg>
  );
}

// 心魔 (Heart Demon) — 统计面板图标
export function HeartDemonStatIcon({ size = 20, color }: { size?: number; color?: string }) {
  const c = color ?? '#8B5C8A';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1" opacity="0.4" strokeDasharray="2 2" />
      <path d="M12 4L12 10L8 14L12 11L16 15L12 20" stroke={c} strokeWidth="1.2" opacity="0.6" />
      <circle cx="12" cy="12" r="3" fill={c} opacity="0.2" />
      <circle cx="12" cy="12" r="1.5" fill={c} opacity="0.5" />
    </svg>
  );
}

// 护盾 (Shield) — 统计面板图标
export function ShieldStatIcon({ size = 20, color }: { size?: number; color?: string }) {
  const c = color ?? '#7b8bb5';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.1" />
      <path d="M12 7L13.2 10H16.5L13.8 12L14.9 15L12 13L9.1 15L10.2 12L7.5 10H10.8Z" fill={c} opacity="0.6" />
      <circle cx="5" cy="8" r="0.6" fill={c} opacity="0.3" />
      <circle cx="19" cy="8" r="0.6" fill={c} opacity="0.3" />
    </svg>
  );
}

// 火种 (Fire Seed) — 统计面板图标
export function FireSeedStatIcon({ size = 20, color }: { size?: number; color?: string }) {
  const c = color ?? '#D47A28';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2C12 2 5 10 5 16C5 20 8 22 12 22C16 22 19 20 19 16C19 10 12 2 12 2Z" fill={c} opacity="0.3" />
      <path d="M12 8C12 8 8 14 8 17C8 19 9.8 20.5 12 20.5C14.2 20.5 16 19 16 17C16 14 12 8 12 8Z" fill={c} opacity="0.5" />
      <path d="M12 13C12 13 10 16 10 17.5C10 18.5 10.9 19 12 19C13.1 19 14 18.5 14 17.5C14 16 12 13 12 13Z" fill="#E8C55A" opacity="0.7" />
      <circle cx="10" cy="5" r="0.8" fill={c} opacity="0.4" />
      <circle cx="15" cy="4" r="0.6" fill={c} opacity="0.3" />
    </svg>
  );
}

// 传承值 (Heritage) — 替换 ☀ emoji
export function HeritageIcon({ size = 14, color }: { size?: number; color?: string }) {
  const c = color ?? '#E8A030';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      {/* Sun with rays */}
      <circle cx="12" cy="12" r="5" fill={c} opacity="0.4" />
      <circle cx="12" cy="12" r="3" fill={c} opacity="0.7" />
      <circle cx="12" cy="12" r="1.5" fill="#fff" opacity="0.3" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1={12 + Math.cos(angle * Math.PI / 180) * 7}
          y1={12 + Math.sin(angle * Math.PI / 180) * 7}
          x2={12 + Math.cos(angle * Math.PI / 180) * 11}
          y2={12 + Math.sin(angle * Math.PI / 180) * 11}
          stroke={c}
          strokeWidth={i % 2 === 0 ? 1.2 : 0.6}
          opacity={0.5}
        />
      ))}
    </svg>
  );
}

// 心魔内联图标 (Heart Demon inline) — 替换 ❄ emoji（小型，不含计数）
export function HeartDemonInlineIcon({ size = 12, color }: { size?: number; color?: string }) {
  const c = color ?? '#e07060';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 4L12 10L8 14L12 11L16 15L12 20" stroke={c} strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="2.5" fill={c} opacity="0.35" />
    </svg>
  );
}

// 特权标记 (Privilege Mark) — 替换 ★
export function PrivilegeMark({ size = 14, color }: { size?: number; color?: string }) {
  const c = color ?? INK.starGold;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2L14.5 9L22 12L14.5 15L12 22L9.5 15L2 12L9.5 9Z" fill={c} opacity="0.8" />
    </svg>
  );
}

// 限制标记 (Restriction Mark) — 替换 ▲
export function RestrictionMark({ size = 14, color }: { size?: number; color?: string }) {
  const c = color ?? '#e07060';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 3L4 20H20L12 3Z" fill={c} opacity="0.7" />
      <path d="M12 9L8 18H16L12 9Z" fill={c} opacity="0.3" />
    </svg>
  );
}

// ===== Weight Badge Styles =====

export function getWeightBadgeStyle(direction: 'negative' | 'positive', weight: 1 | 2 | 3): React.CSSProperties {
  if (direction === 'negative') {
    const styles: Record<number, React.CSSProperties> = {
      1: {
        padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, fontWeight: 600,
        background: 'rgba(196,65,37,0.06)', border: '1px solid rgba(196,65,37,0.2)',
        color: '#d08060', letterSpacing: '0.5px',
      },
      2: {
        padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, fontWeight: 600,
        background: 'linear-gradient(135deg, rgba(196,65,37,0.08) 0%, rgba(90,50,50,0.12) 100%)',
        border: '1px solid rgba(196,65,37,0.35)',
        color: '#c05030', letterSpacing: '0.5px',
        boxShadow: 'inset 0 0 8px rgba(90,50,50,0.15)',
      },
      3: {
        padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, fontWeight: 600,
        background: 'linear-gradient(135deg, rgba(196,65,37,0.15) 0%, rgba(80,20,20,0.2) 100%)',
        border: '2px solid rgba(196,65,37,0.5)',
        color: INK.flameCinnabar, textShadow: '0 0 6px rgba(196,65,37,0.3)', letterSpacing: '0.5px',
        boxShadow: 'inset 0 0 12px rgba(196,65,37,0.2), 0 0 8px rgba(196,65,37,0.15)',
      },
    };
    return styles[weight];
  }

  const styles: Record<number, React.CSSProperties> = {
    1: {
      padding: '2px 8px', borderRadius: 2, fontSize: 11, fontWeight: 600,
      background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.2)',
      color: '#b8a070', letterSpacing: '0.5px',
    },
    2: {
      padding: '2px 8px', borderRadius: 2, fontSize: 11, fontWeight: 600,
      background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.35)',
      color: INK.starGold, letterSpacing: '0.5px',
    },
    3: {
      padding: '2px 8px', borderRadius: 2, fontSize: 11, fontWeight: 600,
      background: 'rgba(212,168,83,0.2)', border: '1px solid rgba(212,168,83,0.5)',
      color: INK.flameGold, textShadow: '0 0 6px rgba(212,168,83,0.3)', letterSpacing: '0.5px',
    },
  };
  return styles[weight];
}

// ===== Level Gradient Configs =====

export const FRONT_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #10131f 0%, #1a1e35 30%, #252a42 100%)',
  2: 'linear-gradient(135deg, #10131f 0%, #171b30 30%, #1e2238 100%)',
  3: 'linear-gradient(135deg, #0f1219 0%, #151828 30%, #1b1e32 100%)',
  4: 'linear-gradient(135deg, #0e1018 0%, #13162a 30%, #181b2d 100%)',
  5: 'linear-gradient(135deg, #0d0f16 0%, #111425 30%, #161829 100%)',
  6: 'linear-gradient(135deg, #0a0c14 0%, #0e1018 50%, #12151e 100%)',
};

export const BACK_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #0e0f16 0%, #141520 50%, #1a1520 100%)',
  2: 'linear-gradient(135deg, #0f0e14 0%, #18141a 50%, #1f1520 100%)',
  3: 'linear-gradient(135deg, #100e12 0%, #1a1218 50%, #22161e 100%)',
  4: 'linear-gradient(135deg, #120e10 0%, #1e1216 50%, #28181c 100%)',
  5: 'linear-gradient(135deg, #140e0e 0%, #221414 50%, #301a18 100%)',
  6: 'linear-gradient(135deg, #1a0e08 0%, #2a1a0a 30%, #3d2810 60%, #5a3d1a 100%)',
};

export const FRONT_BORDER_COLORS: Record<number, string> = {
  1: 'rgba(212,168,83,0.35)',
  2: 'rgba(184,192,212,0.25)',
  3: 'rgba(123,139,181,0.2)',
  4: 'rgba(90,99,128,0.18)',
  5: 'rgba(74,83,112,0.15)',
  6: 'rgba(54,61,82,0.12)',
};

export const BACK_BORDER_COLORS: Record<number, string> = {
  1: 'rgba(107,143,173,0.15)',
  2: 'rgba(212,122,40,0.2)',
  3: 'rgba(196,106,32,0.25)',
  4: 'rgba(196,65,37,0.3)',
  5: 'rgba(168,48,32,0.3)',
  6: 'rgba(232,197,90,0.35)',
};

export const FRONT_GLOWS: Record<number, string> = {
  1: '0 0 16px rgba(212,168,83,0.2), 0 4px 20px rgba(123,139,181,0.2)',
  2: '0 0 10px rgba(184,192,212,0.12)',
  3: '0 0 6px rgba(123,139,181,0.08)',
  4: 'none',
  5: 'none',
  6: 'none',
};

export const BACK_GLOWS: Record<number, string> = {
  1: 'none',
  2: '0 0 8px rgba(212,122,40,0.12)',
  3: '0 0 12px rgba(196,106,32,0.15)',
  4: '0 0 16px rgba(196,65,37,0.2)',
  5: '0 0 20px rgba(168,48,32,0.2)',
  6: '0 0 24px rgba(232,197,90,0.25), 0 0 48px rgba(232,197,90,0.1)',
};
