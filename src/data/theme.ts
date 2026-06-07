// ===== 星火燎原 · 设计系统 =====
// Dark OLED + Bento Grid + Glassmorphism

export const D = {
  // 背景 — OLED 纯黑层级
  bg: '#000000',
  bgElevated: '#0a0a0f',
  bgCard: 'rgba(255,255,255,0.03)',
  bgCardHover: 'rgba(255,255,255,0.06)',
  bgGlass: 'rgba(255,255,255,0.05)',
  bgInput: 'rgba(255,255,255,0.04)',

  // 文字
  text: '#F0F0F0',
  textDim: '#707070',
  textMid: '#999999',

  // 强调色
  gold: '#D4A853',
  goldDim: 'rgba(212,168,83,0.15)',
  goldGlow: '0 0 20px rgba(212,168,83,0.25)',
  goldGlowStrong: '0 0 30px rgba(212,168,83,0.4)',
  goldText: '0 0 16px rgba(212,168,83,0.35)',

  // 星辰色
  blue: '#7B8BB5',
  blueDim: 'rgba(123,139,181,0.12)',
  silver: '#B8C0D4',

  // 火焰色
  cinnabar: '#C44125',
  ember: '#D47A28',
  flameGold: '#E8C55A',
  cinnabarDim: 'rgba(196,65,37,0.12)',
  cinnabarGlow: '0 0 16px rgba(196,65,37,0.25)',

  // 状态
  success: '#8BAA7A',
  successDim: 'rgba(139,170,122,0.10)',

  // 边框
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  borderGlow: 'rgba(212,168,83,0.12)',

  // 圆角
  radius: 16,
  radiusSm: 8,
  radiusXs: 4,

  // 玻璃态
  glassBlur: 'blur(24px)',
  glassBorder: '1px solid rgba(255,255,255,0.06)',

  // 前景渐变（正面 6 级）
  frontGradients: [
    'linear-gradient(135deg, #0a0a14 0%, #141430 30%, #1e1e40 100%)',
    'linear-gradient(135deg, #0a0a14 0%, #12122a 30%, #1a1a36 100%)',
    'linear-gradient(135deg, #08080f 0%, #10102a 30%, #161630 100%)',
    'linear-gradient(135deg, #07070d 0%, #0e0e26 30%, #14142c 100%)',
    'linear-gradient(135deg, #06060a 0%, #0c0c22 30%, #121228 100%)',
    'linear-gradient(135deg, #040406 0%, #0a0a14 50%, #0e0e1c 100%)',
  ],

  // 背面渐变（背面 6 级）
  backGradients: [
    'linear-gradient(135deg, #08080e 0%, #101020 50%, #16121e 100%)',
    'linear-gradient(135deg, #0a0810 0%, #141018 50%, #1c121c 100%)',
    'linear-gradient(135deg, #0c0a10 0%, #180e18 50%, #20141c 100%)',
    'linear-gradient(135deg, #0e0a0e 0%, #1c1016 50%, #28161a 100%)',
    'linear-gradient(135deg, #100a0a 0%, #201214 50%, #2e1816 100%)',
    'linear-gradient(135deg, #160c06 0%, #281808 30%, #3d2810 60%, #5a3d1a 100%)',
  ],
};

// 向后兼容：旧代码引用 INK 的地方仍然可用
export const INK = {
  bgDeep: D.bg,
  bgMid: D.bgElevated,
  bgCard: D.bgCard,
  bgCardHover: D.bgCardHover,

  starGold: D.gold,
  starGoldMuted: 'rgba(212,168,83,0.6)',
  starGoldFaint: D.goldDim,
  starBlue: D.blue,
  starBlueMuted: 'rgba(123,139,181,0.5)',
  starSilver: D.silver,

  flameCinnabar: D.cinnabar,
  flameEmber: D.ember,
  flameGold: D.flameGold,
  flameWarm: '#8b4513',
  flameFaint: D.cinnabarDim,

  textPrimary: D.text,
  textSecondary: D.textMid,
  textMuted: D.textDim,

  border: D.border,
  borderHover: D.borderHover,
  borderStrong: D.borderGlow,

  glowGold: D.goldGlow,
  glowGoldStrong: D.goldGlowStrong,
  glowCinnabar: D.cinnabarGlow,
  glowBlue: '0 0 12px rgba(123,139,181,0.25)',

  glass: D.bgGlass,
  glassBorder: D.glassBorder,
  glassBlur: D.glassBlur,

  washWarm: 'rgba(212,168,83,0.02)',
  washCool: 'rgba(123,139,181,0.02)',
  washDeep: 'rgba(60,50,40,0.03)',

  frontGradients: D.frontGradients,
  backGradients: D.backGradients,
};

export const SCROLL_CARD = {
  background: D.bgGlass,
  border: D.glassBorder,
  borderRadius: D.radiusSm,
};

export const INK_INPUT = {
  background: D.bgInput,
  border: `1px solid ${D.border}`,
  borderRadius: D.radiusSm,
  color: D.text,
  outline: 'none',
  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
};

export const INK_OPTION = {
  background: '#1e1b4b',
  color: D.text,
};
