import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Star, Flame, Shield, RotateCcw, TrendingUp, Heart, Award,
  Zap, AlertTriangle, BookOpen, XCircle, CheckCircle2, ShieldCheck,
  ShoppingBag, ChevronDown, X,
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useMobile } from '../hooks/useMobile';
import { D, INK } from '../data/theme';
import { VERSION_LOGS } from '../data/config';
import { HeritageIcon, HeartDemonInlineIcon, PrivilegeMark, RestrictionMark } from '../components/LevelIcon';
import type { BehaviorDefinition, Category, NegativeWeight, PositiveWeight } from '../types';

const SECTIONS = [
  { id: 'intro', icon: Star, label: '系统简介' },
  { id: 'front-levels', icon: Star, label: '正面《律己之路》' },
  { id: 'back-levels', icon: Flame, label: '背面《新生之路》' },
  { id: 'negative-behaviors', icon: XCircle, label: '负面行为清单' },
  { id: 'positive-behaviors', icon: CheckCircle2, label: '正面行为清单' },
  { id: 'shield', icon: Shield, label: '星光护盾' },
  { id: 'exchange', icon: ShoppingBag, label: '兑换商店' },
  { id: 'flip', icon: RotateCcw, label: '翻面机制' },
  { id: 'rise', icon: TrendingUp, label: '正面回升' },
  { id: 'heart-demon', icon: Heart, label: '心魔印记' },
  { id: 'titles', icon: Award, label: '星辉典范进阶称号' },
  { id: 'immortal', icon: Flame, label: '不朽晨辉薪火传承' },
  { id: 'auto-rules', icon: Zap, label: '自动规则' },
  { id: 'version-history', icon: BookOpen, label: '版本历史' },
];

const CATEGORY_COLORS: Record<Category, string> = {
  '纪律': D.blue, '学习': D.success, '卫生': D.ember, '品行': D.cinnabar, '限时活动': D.gold,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 48, scrollMarginTop: 24,
};

const headingStyle = (color: string): React.CSSProperties => ({
  fontSize: 24, fontWeight: 700, color, marginBottom: 16,
  display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12,
  borderBottom: `1px solid ${color}55`,
});

const cardStyle: React.CSSProperties = {
  background: D.bgCard, borderRadius: D.radiusSm,
  border: D.glassBorder, padding: 16, marginBottom: 12,
  backdropFilter: D.glassBlur,
};

const textStyle: React.CSSProperties = {
  fontSize: 15, lineHeight: 1.8, color: `${D.text}cc`,
};

function BehaviorTable({ behaviors, direction }: { behaviors: BehaviorDefinition[]; direction: 'negative' | 'positive' }) {
  const config = useConfig();
  const categories: Category[] = config.categories as Category[];
  const weights: (NegativeWeight | PositiveWeight)[] = [1, 2, 3];
  const weightNames = direction === 'negative' ? config.negativeWeightNames : config.positiveWeightNames;
  const symbol = direction === 'negative' ? '星蚀/心魔' : '护盾/火种';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {categories.map(cat => (
        <div key={cat} style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: CATEGORY_COLORS[cat], marginBottom: 12, padding: '4px 10px', borderRadius: D.radiusSm, background: D.bgGlass, display: 'inline-block' }}>
            {cat}
          </div>
          {weights.map(w => {
            const items = behaviors.filter(b => b.category === cat && b.weight === w);
            if (items.length === 0) return null;
            return (
              <div key={w} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: INK.textMuted, marginBottom: 6 }}>
                  {weightNames[w as 1 | 2 | 3]}({w}{symbol})：
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map(b => (
                    <span
                      key={b.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 13,
                        background: direction === 'negative' ? D.cinnabarDim : D.blueDim,
                        border: `1px solid ${direction === 'negative' ? 'rgba(196,65,37,0.2)' : 'rgba(123,139,181,0.2)'}`,
                        color: direction === 'negative' ? '#e07060' : INK.starSilver,
                      }}
                    >
                      {b.name}
                      {b.isHighSensitivity && (
                        <AlertTriangle size={10} style={{ color: INK.flameCinnabar }} />
                      )}
                      {b.isInverseSelectable && direction === 'negative' && (
                        <ShieldCheck size={10} style={{ color: INK.starBlue }} />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function RulesPage() {
  const config = useConfig();
  const isMobile = useMobile();
  const [activeSection, setActiveSection] = useState('intro');
  const [showToc, setShowToc] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const sections = contentRef.current.querySelectorAll('[data-section-id]');
    let current = 'intro';
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 120) {
        current = section.getAttribute('data-section-id') || 'intro';
      }
    });
    setActiveSection(current);
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollTo = (id: string) => {
    const el = contentRef.current?.querySelector(`[data-section-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight: `calc(100vh - ${isMobile ? 48 : 64}px)`,
      gap: 0,
    }}>
      {/* ===== DESKTOP SIDEBAR ===== */}
      {!isMobile && (
      <aside
        style={{
          width: 220, flexShrink: 0,
          background: D.bgCard, backdropFilter: D.glassBlur,
          borderRight: D.glassBorder, padding: '20px 0', overflowY: 'auto',
        }}
      >
        <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={16} style={{ color: INK.starGoldMuted }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: INK.textPrimary }}>规则说明</span>
        </div>
        <div style={{ margin: '0 12px 12px', height: 1, background: `linear-gradient(90deg, transparent, ${D.gold}44, transparent)` }} />
        {SECTIONS.map(({ id, icon: Icon, label }) => {
          const isActive = activeSection === id;
          return (
            <button key={id} onClick={() => scrollTo(id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '8px 16px', border: 'none',
              background: isActive ? D.goldDim : 'transparent',
              borderLeft: isActive ? `3px solid ${D.gold}` : '3px solid transparent',
              color: isActive ? D.gold : D.textDim, fontSize: 13, cursor: 'pointer',
              textAlign: 'left' as const, transition: 'all 0.15s',
              boxShadow: isActive ? D.goldGlow : 'none',
            }}>
              <Icon size={14} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </span>
            </button>
          );
        })}
      </aside>
      )}

      {/* ===== MOBILE: Dropdown TOC selector + content ===== */}
      {isMobile && (
        <div style={{ flexShrink: 0 }}>
          {/* Current section button */}
          <button onClick={() => setShowToc(true)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', border: 'none', cursor: 'pointer',
            background: D.bgCard, borderBottom: D.glassBorder,
            color: D.gold, fontSize: 15, fontWeight: 600, textAlign: 'left' as const,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} />
              <span>
                {(() => {
                  const sec = SECTIONS.find(s => s.id === activeSection);
                  return sec ? sec.label : '规则说明';
                })()}
              </span>
            </div>
            <ChevronDown size={18} style={{ color: D.textDim, transform: showToc ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* ===== TOC OVERLAY ===== */}
          {showToc && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column',
              animation: 'fadeSlideIn 0.2s ease',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: D.glassBorder,
              }}>
                <span style={{ fontSize: 17, fontWeight: 600, color: D.text }}>目录</span>
                <button onClick={() => setShowToc(false)} style={{
                  background: 'none', border: 'none', color: D.textDim, cursor: 'pointer',
                  padding: 8, fontSize: 20,
                }}>
                  <X size={22} />
                </button>
              </div>
              {/* Section list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {SECTIONS.map(({ id, icon: Icon, label }) => {
                  const isActive = activeSection === id;
                  return (
                    <button key={id} onClick={() => { scrollTo(id); setShowToc(false); }} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '16px 24px', border: 'none',
                      background: isActive ? D.goldDim : 'transparent',
                      color: isActive ? D.gold : D.textMid,
                      fontSize: 16, cursor: 'pointer', textAlign: 'left' as const,
                      transition: 'all 0.15s',
                      borderLeft: isActive ? `3px solid ${D.gold}` : '3px solid transparent',
                    }}>
                      <Icon size={18} style={{ color: isActive ? D.gold : D.textDim }} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <main ref={contentRef} style={{
        flex: 1, overflowY: 'auto',
        padding: isMobile ? '12px 12px calc(96px + env(safe-area-inset-bottom))' : '24px 40px',
        maxHeight: `calc(100vh - ${isMobile ? 48 : 64}px)`,
        overflowX: 'hidden',
      }}>
        <style>{`
          @media (max-width: 767px) {
            .rules-grid {
              grid-template-columns: 1fr !important;
            }
            [data-section-id] {
              margin-bottom: 28px !important;
              overflow-wrap: break-word;
            }
            [data-section-id] h2 {
              font-size: 18px !important;
              line-height: 1.35 !important;
              align-items: flex-start !important;
            }
          }
        `}</style>

        {/* 1. 系统简介 */}
        <div data-section-id="intro" style={sectionStyle}>
          <h2 style={headingStyle(INK.starGold)}><Star size={20} /> 系统简介</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              「星火燎原」是一套创新的双面卡片操行评定系统，取代了传统的加减分量化表。
            </p>
            <div className="rules-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ ...cardStyle, borderLeft: `3px solid ${INK.starGoldMuted}` }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: INK.starGold, marginBottom: 8 }}>
                  <Star size={14} style={{ verticalAlign: 'middle' }} /> 正面《律己之路》
                </div>
                <p style={{ fontSize: 14, color: INK.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  以「星辰的光度」为意象——当学生违纪时，星辰逐渐暗淡，从北极星般稳定的「星辉典范」，一步步走向「深谷余烬」。
                </p>
              </div>
              <div style={{ ...cardStyle, borderLeft: `3px solid ${INK.flameEmber}` }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: INK.flameGold, marginBottom: 8 }}>
                  <Flame size={14} style={{ verticalAlign: 'middle' }} /> 背面《新生之路》
                </div>
                <p style={{ fontSize: 14, color: INK.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  以「火焰的强度」为意象——当学生翻面重生时，火焰逐渐燃起，从冰封的「冰封心火」，一步步走向「不朽晨辉」。
                </p>
              </div>
            </div>
            <div style={{
              padding: '14px 18px', borderRadius: D.radiusSm,
              background: D.bgCard,
              backdropFilter: D.glassBlur,
              border: '1px solid rgba(212,168,83,0.3)',
              boxShadow: D.goldGlow,
            }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: INK.flameGold }}>核心哲学：</span>
              <span style={{ fontSize: 15, color: INK.textPrimary }}>
                背面的终极等级「不朽晨辉」，在光辉与热度上超越了正面的初始等级「星辉典范」——
                <strong>历经考验的重生者，比未经考验的优等生更强大。</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 2. 正面等级 */}
        <div data-section-id="front-levels" style={sectionStyle}>
          <h2 style={headingStyle(INK.starGold)}><Star size={20} /> 正面《律己之路》— 星辰的六种光度</h2>
          <p style={{ ...textStyle, marginBottom: 16 }}>
            正面卡片有6个等级，等级越高（数字越大），星辰越暗淡。每级有不同数量的空格，空格被{config.blankMarkName}填满则降级。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {config.frontLevels.map((level, idx) => {
              const effect = config.frontLevelEffects[idx];
              const isPrivilege = effect.type === 'privilege';
              return (
                <div key={level.level} style={{
                  ...cardStyle,
                  borderLeft: `3px solid ${level.level === 1 ? D.flameGold : level.level <= 3 ? D.goldDim : D.blueDim}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: level.level === 1 ? D.flameGold : D.text }}>
                        等级{level.level} · {level.name}
                      </span>
                      <span style={{
                        padding: '1px 8px', borderRadius: D.radiusSm, fontSize: 11, fontWeight: 600,
                        background: isPrivilege ? D.goldDim : D.cinnabarDim,
                        color: isPrivilege ? D.gold : D.cinnabar,
                        border: `1px solid ${isPrivilege ? 'rgba(212,168,83,0.3)' : 'rgba(196,65,37,0.3)'}`,
                      }}>
                        {isPrivilege ? '特权' : '限制'}
                      </span>
                    </div>
                    <span style={{
                      padding: '2px 10px', borderRadius: D.radiusSm, fontSize: 12,
                      background: D.goldDim, color: D.gold,
                    }}>
                      {level.blanks === 8 ? `8个${config.blankMarkName}翻面` : `${level.blanks}格`}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: D.textDim, marginBottom: 6 }}>{level.imagery}</div>
                  <div style={{ fontSize: 14, color: `${D.text}b3`, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 10 }}>
                    {level.description}
                  </div>
                  {/* Effects list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${D.border}`, paddingTop: 10 }}>
                    {effect.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: isPrivilege ? D.gold : D.cinnabar, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>
                          {isPrivilege ? <PrivilegeMark size={12} color={D.gold} /> : <RestrictionMark size={12} color={D.cinnabar} />}
                        </span>
                        <span style={{ fontSize: 13, color: isPrivilege ? D.flameGold : '#e07060' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 背面等级 */}
        <div data-section-id="back-levels" style={sectionStyle}>
          <h2 style={headingStyle(D.ember)}><Flame size={20} /> 背面《新生之路》— 火焰的六重燃态</h2>
          <p style={{ ...textStyle, marginBottom: 16 }}>
            背面卡片也有6个等级，通过累积{config.checkMarkName}数升级。采用累计制——每一个{config.checkMarkName}都是向「不朽晨辉」迈进的一步。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {config.backLevels.map((level, idx) => {
              const effect = config.backLevelEffects[idx];
              const isPrivilege = effect.type === 'privilege';
              return (
                <div key={level.level} style={{
                  ...cardStyle,
                  borderLeft: `3px solid ${level.level >= 5 ? D.ember : level.level >= 3 ? '#8b4513' : '#3d2210'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: level.level === 6 ? D.flameGold : D.text }}>
                        等级{level.level} · {level.name}
                      </span>
                      <span style={{
                        padding: '1px 8px', borderRadius: D.radiusSm, fontSize: 11, fontWeight: 600,
                        background: isPrivilege ? D.goldDim : D.cinnabarDim,
                        color: isPrivilege ? D.gold : D.cinnabar,
                        border: `1px solid ${isPrivilege ? 'rgba(212,168,83,0.3)' : 'rgba(196,65,37,0.3)'}`,
                      }}>
                        {isPrivilege ? '特权' : '限制'}
                      </span>
                    </div>
                    <span style={{
                      padding: '2px 10px', borderRadius: D.radiusSm, fontSize: 12,
                      background: D.cinnabarDim, color: D.flameGold,
                    }}>
                      {level.checksRequired === 0 ? '起点' : `${level.checksRequired}${config.checkMarkName}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: D.textDim, marginBottom: 6 }}>{level.imagery}</div>
                  <div style={{ fontSize: 14, color: `${D.text}b3`, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 10 }}>
                    {level.description}
                  </div>
                  {/* Effects list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${D.border}`, paddingTop: 10 }}>
                    {effect.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: isPrivilege ? D.gold : D.cinnabar, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>
                          {isPrivilege ? <PrivilegeMark size={12} color={D.gold} /> : <RestrictionMark size={12} color={D.cinnabar} />}
                        </span>
                        <span style={{ fontSize: 13, color: isPrivilege ? D.flameGold : '#e07060' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. 负面行为清单 */}
        <div data-section-id="negative-behaviors" style={sectionStyle}>
          <h2 style={headingStyle(INK.flameCinnabar)}><XCircle size={20} /> 负面行为清单</h2>
          <p style={{ ...textStyle, marginBottom: 12 }}>
            违纪行为的效果取决于卡片当前面：
          </p>
          <div className="rules-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ ...cardStyle, borderLeft: `3px solid ${INK.starBlue}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK.starBlue, marginBottom: 4 }}>卡片在正面时</div>
              <div style={{ fontSize: 13, color: INK.textSecondary }}>负面行为 → 获得星蚀</div>
              <div style={{ fontSize: 12, color: INK.textMuted }}>蒙尘=1星蚀，褪色=2星蚀，失格=3星蚀</div>
            </div>
            <div style={{ ...cardStyle, borderLeft: `3px solid ${INK.flameEmber}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK.flameEmber, marginBottom: 4 }}>卡片在背面时</div>
              <div style={{ fontSize: 13, color: INK.textSecondary }}>负面行为 → 获得心魔印记</div>
              <div style={{ fontSize: 12, color: INK.textMuted }}>每犯一次规，心魔印记+1</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {([`${config.negativeWeightNames[1]}(1星蚀)`, `${config.negativeWeightNames[2]}(2星蚀)`, `${config.negativeWeightNames[3]}(3星蚀)`] as const).map((w, i) => (
              <div key={w} style={{
                padding: '8px 14px', borderRadius: D.radiusSm,
                background: [D.cinnabarDim, 'rgba(196,65,37,0.1)', 'rgba(196,65,37,0.15)'][i],
                border: `1px solid rgba(196,65,37,${[0.15, 0.25, 0.35][i]})`,
                fontSize: 13, color: D.cinnabar,
              }}>
                {w}
              </div>
            ))}
          </div>
          <BehaviorTable behaviors={config.negativeBehaviors} direction="negative" />
          <div style={{ marginTop: 12, fontSize: 13, color: INK.flameCinnabar, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> 标记为高敏感的行为，班委仅负责报告，由班主任核实裁定
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: INK.starBlue, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> 标记为反选的行为，选中违纪学生时，未选中的正面卡片学生自动获得1个星光护盾
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#e07060', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Heart size={14} /> 翻面至背面后，再犯规矩将增加「心魔印记」，每枚印记使当前等级升级所需{config.checkMarkName}+1，详见「心魔印记」章节
          </div>
        </div>

        {/* 5. 正面行为清单 */}
        <div data-section-id="positive-behaviors" style={sectionStyle}>
          <h2 style={headingStyle(INK.starBlue)}><CheckCircle2 size={20} /> 正面行为清单</h2>
          <p style={{ ...textStyle, marginBottom: 12 }}>
            积极行为的效果取决于卡片当前面：
          </p>
          <div className="rules-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ ...cardStyle, borderLeft: `3px solid ${INK.starBlue}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK.starBlue, marginBottom: 4 }}>卡片在正面时</div>
              <div style={{ fontSize: 13, color: INK.textSecondary }}>正面行为 → 获得护盾</div>
              <div style={{ fontSize: 12, color: INK.textMuted }}>微芒=1护盾，星光=2护盾，闪耀=3护盾</div>
            </div>
            <div style={{ ...cardStyle, borderLeft: `3px solid ${INK.starGold}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK.starGold, marginBottom: 4 }}>卡片在背面时</div>
              <div style={{ fontSize: 13, color: INK.textSecondary }}>正面行为 → 获得火种</div>
              <div style={{ fontSize: 12, color: INK.textMuted }}>微芒=1火种，星光=2火种，闪耀=3火种</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {([`${config.positiveWeightNames[1]}(1护盾/火种)`, `${config.positiveWeightNames[2]}(2护盾/火种)`, `${config.positiveWeightNames[3]}(3护盾/火种)`] as const).map((w, i) => (
              <div key={w} style={{
                padding: '8px 14px', borderRadius: D.radiusSm,
                background: [D.blueDim, 'rgba(123,139,181,0.1)', 'rgba(123,139,181,0.15)'][i],
                border: `1px solid rgba(123,139,181,${[0.15, 0.25, 0.35][i]})`,
                fontSize: 13, color: D.silver,
              }}>
                {w}
              </div>
            ))}
          </div>
          <BehaviorTable behaviors={config.positiveBehaviors} direction="positive" />
        </div>

        {/* 6. 星光护盾 */}
        <div data-section-id="shield" style={sectionStyle}>
          <h2 style={headingStyle(INK.starBlue)}><Shield size={20} /> 星光护盾</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              星光护盾是一种<strong style={{ color: INK.starBlue }}>后果缓冲机制</strong>，通过正面行为和自动规则获得。
            </p>
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: 600, color: INK.starBlue, marginBottom: 10 }}>获得方式</div>
              <ul style={{ fontSize: 14, color: INK.textSecondary, lineHeight: 1.8, marginTop: 8, paddingLeft: 20 }}>
                <li><strong style={{ color: INK.starBlue }}>正面行为</strong>：卡片在正面时，正面行为按权重获得护盾（微芒=1护盾，星光=2护盾，闪耀=3护盾）</li>
                <li><strong style={{ color: INK.starBlue }}>自动规则</strong>：一周作业全勤 → 额外加2护盾（正面）或2火种（背面）；一周无迟到 → 额外加2护盾（正面）或2火种（背面）</li>
                <li><strong style={{ color: INK.starBlue }}>反选自动化</strong>：录入迟到/作业未交时，未选中的正面卡片学生自动获得1护盾</li>
              </ul>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: 600, color: INK.starBlue, marginBottom: 10 }}>抵消规则（{config.shieldOffsetRatio}:1比例）</div>
              <p style={{ fontSize: 14, color: INK.textSecondary, lineHeight: 1.7, margin: 0 }}>
                当学生获得{config.blankMarkName}时，如果拥有星光护盾：
              </p>
              <ul style={{ fontSize: 14, color: INK.textSecondary, lineHeight: 1.8, marginTop: 8, paddingLeft: 20 }}>
                <li>{config.blankMarkName}仍然<strong style={{ color: INK.flameCinnabar }}>记录在案</strong>（错误不可撤销）</li>
                <li>每{config.shieldOffsetRatio}个护盾可抵消1个{config.blankMarkName}的<strong style={{ color: INK.starBlue }}>空格填入</strong>效果</li>
                <li>护盾自动消耗，不足抵消的部分照常填入空格</li>
                <li>比例可由班主任在设置中调整</li>
              </ul>
            </div>
            <div style={{
              padding: '12px 16px', borderRadius: D.radiusSm,
              background: D.blueDim, backdropFilter: D.glassBlur,
              border: '1px solid rgba(123,139,181,0.2)',
              marginTop: 12, fontSize: 14, color: D.blue, fontStyle: 'italic',
            }}>
              "你的错误不可撤销，但你之前积蓄的力量为你挡住了冲击。"
            </div>
          </div>
        </div>

        {/* 6.5 兑换商店 */}
        <div data-section-id="exchange" style={sectionStyle}>
          <h2 style={headingStyle('#C8956E')}><ShoppingBag size={20} /> 兑换商店</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              护盾和传承值不只是用来防守的——攒够了，还可以<strong style={{ color: '#C8956E' }}>兑换奖励</strong>！
            </p>
            <div className="rules-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ ...cardStyle, borderLeft: `3px solid ${INK.starBlue}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: INK.starBlue, marginBottom: 4 }}>正面：星辉典范</div>
                <div style={{ fontSize: 13, color: INK.textSecondary }}>星辉典范（正面等级1）的同学可以用<strong style={{ color: INK.starBlue }}>护盾</strong>兑换奖励</div>
              </div>
              <div style={{ ...cardStyle, borderLeft: '3px solid #E8A030' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E8A030', marginBottom: 4 }}>背面：不朽晨辉</div>
                <div style={{ fontSize: 13, color: INK.textSecondary }}>不朽晨辉（背面等级6）的同学可以用<strong style={{ color: '#E8A030' }}>传承值</strong>兑换奖励</div>
              </div>
            </div>
            <div style={{
              ...cardStyle, borderLeft: `3px solid ${D.gold}`,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: D.gold, marginBottom: 6 }}>为什么只限这两个等级？</div>
              <div style={{ fontSize: 14, color: INK.textSecondary, lineHeight: 1.7 }}>
                兑换功能仅对星辉典范（正面等级1）和不朽晨辉（背面等级6）开放。其余等级的同学，护盾和传承值仍需用于抵消违纪后果，暂不可用于兑换。
              </div>
            </div>

            {(() => {
              const activeItems = config.exchangeItems.filter(item => item.isActive);
              const frontItems = activeItems.filter(item => item.side === 'front');
              const backItems = activeItems.filter(item => item.side === 'back');
              return (
                <>
                  {frontItems.length > 0 && (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 600, color: INK.starBlue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Shield size={16} /> 正面·护盾兑换
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {frontItems.map(item => (
                          <div key={item.id} style={{
                            ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                            flexWrap: 'wrap', gap: 8,
                            borderLeft: `3px solid ${INK.starBlue}`,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 600, color: INK.textPrimary, marginBottom: 2 }}>{item.name}</div>
                              {item.description && <div style={{ fontSize: 13, color: INK.textMuted, wordBreak: 'break-word' }}>{item.description}</div>}
                            </div>
                            <div style={{
                              padding: '4px 12px', borderRadius: D.radiusSm, flexShrink: 0,
                              background: D.blueDim, border: '1px solid rgba(123,139,181,0.3)',
                              fontSize: 14, fontWeight: 600, color: INK.starBlue, whiteSpace: 'nowrap',
                            }}>
                              {item.cost} 护盾
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {backItems.length > 0 && (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#E8A030', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HeritageIcon size={16} /> 背面·传承值兑换
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                        {backItems.map(item => (
                          <div key={item.id} style={{
                            ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                            flexWrap: 'wrap', gap: 8,
                            borderLeft: '3px solid #E8A030',
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 600, color: INK.textPrimary, marginBottom: 2 }}>{item.name}</div>
                              {item.description && <div style={{ fontSize: 13, color: INK.textMuted, wordBreak: 'break-word' }}>{item.description}</div>}
                            </div>
                            <div style={{
                              padding: '4px 12px', borderRadius: D.radiusSm, flexShrink: 0,
                              background: 'rgba(232,160,48,0.1)', border: '1px solid rgba(232,160,48,0.3)',
                              fontSize: 14, fontWeight: 600, color: '#E8A030', whiteSpace: 'nowrap',
                            }}>
                              {item.cost} 传承值
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            <div style={{
              padding: '12px 16px', borderRadius: D.radiusSm,
              background: 'rgba(200,149,110,0.1)', backdropFilter: D.glassBlur,
              border: '1px solid rgba(200,149,110,0.3)',
              marginTop: 12, fontSize: 14, color: '#C8956E', fontStyle: 'italic',
            }}>
              "守得住底线，才花得起余粮。"
            </div>
          </div>
        </div>

        {/* 7. 翻面机制 */}
        <div data-section-id="flip" style={sectionStyle}>
          <h2 style={headingStyle(INK.starGoldMuted)}><RotateCcw size={20} /> 翻面机制</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              当正面等级6「深谷余烬」集满<strong style={{ color: INK.flameCinnabar }}>8个{config.blankMarkName}</strong>时，卡片翻面至背面等级1「冰封心火」。
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
              padding: 24, borderRadius: D.radiusSm,
              background: D.bgCard, backdropFilter: D.glassBlur,
              border: D.glassBorder,
            }}>
              <div style={{ textAlign: 'center' }}>
                <Star size={28} style={{ color: INK.starGoldMuted, marginBottom: 4 }} />
                <div style={{ fontSize: 13, color: INK.starGold }}>深谷余烬</div>
                <div style={{ fontSize: 11, color: INK.textMuted }}>8个{config.blankMarkName}集满</div>
              </div>
              <div style={{ fontSize: 24, color: INK.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <Flame size={28} style={{ color: INK.flameEmber, marginBottom: 4 }} />
                <div style={{ fontSize: 13, color: INK.flameGold }}>冰封心火</div>
                <div style={{ fontSize: 11, color: INK.textMuted }}>重新出发</div>
              </div>
            </div>
            <p style={{ marginTop: 16 }}>
              翻面不是失败，而是新的开始。学生的空格清零，{config.checkMarkName}数归零，从背面等级1重新出发。翻面时将触发「重生」仪式动画——星辰虽逝，心火未灭。
            </p>
          </div>
        </div>

        {/* 8. 正面回升 */}
        <div data-section-id="rise" style={sectionStyle}>
          <h2 style={headingStyle('#8baa7a')}><TrendingUp size={20} /> 正面回升</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              降级后可以回升，但比降级<strong style={{ color: '#8baa7a' }}>更难</strong>。需要同时满足两个条件：
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ ...cardStyle, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#8baa7a', marginBottom: 6 }}>条件一</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>连续N天零违纪</div>
              </div>
              <div style={{ ...cardStyle, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#8baa7a', marginBottom: 6 }}>条件二</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>完成特定任务（难度递增）</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {config.riseTasks.map(task => (
                <div key={task.level} style={{
                  ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 14, color: INK.textPrimary }}>
                    {task.name} → 上一级
                  </span>
                  <span style={{ fontSize: 13, color: '#8baa7a' }}>
                    {task.riseDaysRequired}天零违纪 + {task.riseTask}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 9. 心魔印记 */}
        <div data-section-id="heart-demon" style={sectionStyle}>
          <h2 style={headingStyle('#e07060')}><Heart size={20} /> 心魔印记</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              翻面至背面后，每再犯一次规，增加<strong style={{ color: '#e07060' }}>1个心魔印记</strong>，
              使当前等级升级所需{config.checkMarkName}数+1。心魔让学生直观看到「旧习如何拖慢新生的步伐」。
            </p>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#8baa7a', marginBottom: 12 }}>消除途径：</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ ...cardStyle, borderLeft: '3px solid #8baa7a' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#8baa7a', marginBottom: 4 }}>途径一：连续零违纪</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>连续2个教学周零违纪 → 自动消除1个心魔</div>
              </div>
              <div style={{ ...cardStyle, borderLeft: `3px solid ${INK.starGold}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: INK.starGold, marginBottom: 4 }}>途径二：闪耀行为</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>背面同学完成1个闪耀(3×)级行为 → 自动消除1个心魔</div>
              </div>
              <div style={{ ...cardStyle, borderLeft: '3px solid #E8A030' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E8A030', marginBottom: 4 }}>途径三：传承值抵消</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>不朽晨辉同学的传承值自动抵消心魔（1传承值=消1心魔）</div>
              </div>
            </div>
          </div>
        </div>

        {/* 10. 星辉典范进阶称号 */}
        <div data-section-id="titles" style={sectionStyle}>
          <h2 style={headingStyle(INK.flameGold)}><Award size={20} /> 星辉典范进阶称号</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              始终保持在「星辉典范」（正面等级1）的同学，按持续时间获得分级称号。称号不影响等级，但是一种荣誉标识。
              条件：始终保持在正面等级1，不降级、不翻面，按连续停留在等级1的教学周数解锁称号。
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}} className="rules-grid">
              {config.levelOneTitles.map(title => (
                <div key={title.name} style={cardStyle}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: INK.flameGold, marginBottom: 4 }}>
                    {title.name}
                  </div>
                  <div style={{ fontSize: 13, color: INK.textSecondary }}>{title.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 10.5 不朽晨辉薪火传承 */}
        <div data-section-id="immortal" style={sectionStyle}>
          <h2 style={headingStyle('#E8A030')}><Zap size={20} /> 不朽晨辉薪火传承</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              达到「不朽晨辉」的同学，将开启隐藏副本——<b style={{ color: '#E8A030' }}>薪火传承</b>。这不是终点，而是一种全新的存在方式：既照亮自己，也照亮他人。
            </p>
            <p style={{ marginBottom: 16, fontSize: 14, color: INK.textSecondary }}>
              不朽晨辉同学不再显示火种升级进度，改为显示<b style={{ color: '#E8A030' }}>传承值</b>。传承值是全新的资源，既有自保之力，也可照亮他人。
            </p>

            <div style={{ fontSize: 15, fontWeight: 600, color: '#E8A030', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}><HeritageIcon size={14} /> 传承值</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <div style={{ ...cardStyle, borderLeft: '3px solid #E8A030' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E8A030', marginBottom: 4 }}>获取方式</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>完成正面行为，按权重获得传承值：{config.positiveWeightNames[1]}+1、{config.positiveWeightNames[2]}+2、{config.positiveWeightNames[3]}+3</div>
              </div>
              <div style={{ ...cardStyle, borderLeft: '3px solid #E8A030' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E8A030', marginBottom: 4 }}>自用：抵消心魔</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>传承值自动优先抵消自己的心魔印记（每1传承值可抵消1点心魔印记）。抵消后传承值扣除，心魔印记相应减少。</div>
              </div>
              <div style={{ ...cardStyle, borderLeft: '3px solid #E8A030' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E8A030', marginBottom: 4 }}>助人：照亮他人</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>传承值余额可帮助背面同学消除心魔印记（每消耗1传承值，可为1位背面同学消除1点心魔印记），需班主任确认</div>
              </div>
            </div>

            <div style={{ fontSize: 15, fontWeight: 600, color: '#C44125', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}><HeartDemonInlineIcon size={14} color="#C44125" /> 心魔与降级</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <div style={{ ...cardStyle, borderLeft: '3px solid #C44125' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#C44125', marginBottom: 4 }}>心魔产生</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>不朽晨辉同学违纪，仍然+1心魔印记</div>
              </div>
              <div style={{ ...cardStyle, borderLeft: '3px solid #C44125' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#C44125', marginBottom: 4 }}>降级规则</div>
                <div style={{ fontSize: 14, color: INK.textSecondary }}>心魔印记达到{config.immortalDemotionThreshold}个时，降级到「熔炉之心」，传承值清零。重新积累火种可再次升级。<span style={{ fontSize: 12, color: INK.textMuted }}>（阈值可在系统设置中修改）</span></div>
              </div>
            </div>

            <div style={{ fontSize: 15, fontWeight: 600, color: '#E8A030', marginBottom: 10 }}>🏆 不朽晨辉进阶称号</div>
            <p style={{ fontSize: 14, color: INK.textSecondary, marginBottom: 12 }}>
              基于累计获得的传承值（非当前余额，而是历史累计总量），解锁更强称号。即使捐赠了传承值，累计值不会减少，称号不会降级。
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}} className="rules-grid">
              {config.immortalTitles.map(title => (
                <div key={title.name} style={cardStyle}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#E8A030', marginBottom: 4 }}>
                    <HeritageIcon size={14} /> {title.name}
                  </div>
                  <div style={{ fontSize: 13, color: INK.textSecondary }}>{title.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 11. 自动规则 */}
        <div data-section-id="auto-rules" style={sectionStyle}>
          <h2 style={headingStyle(INK.starSilver)}><Zap size={20} /> 自动规则</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              部分规则由系统自动判定和执行，无需手动录入：
            </p>

            {/* Reward rules */}
            <div style={{ fontSize: 15, fontWeight: 600, color: INK.starBlue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={16} /> 奖励规则
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {config.autoRules.filter(r => r.isActive && r.effectType === 'shieldAndEmber').map(rule => {
                const triggerLabels: Record<string, string> = {
                  'weekly_no_behavior': '一周内无某行为',
                  'weekly_behavior_count': '一周内某行为达X次',
                };
                const effectLabels: Record<string, string> = {
                  'shieldAndEmber': `额外加${rule.effectAmount}护盾（正面）或${rule.effectAmount}火种（背面）`,
                  'blankAndHeartDemon': `额外加${rule.effectAmount}${config.blankMarkName}（正面）/ 1心魔（背面）`,
                };
                const isGold = rule.effectAmount >= 4;
                return (
                  <div key={rule.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: INK.textPrimary, marginBottom: 4 }}>
                        {rule.name.split(' → ')[0]}
                      </div>
                      <div style={{ fontSize: 13, color: INK.textMuted, wordBreak: 'break-word' }}>触发条件：{triggerLabels[rule.triggerCondition.type] || rule.triggerCondition.type}{rule.triggerCondition.behaviorId ? `：${[...config.negativeBehaviors, ...config.positiveBehaviors].find(b => b.id === rule.triggerCondition.behaviorId)?.name || rule.triggerCondition.behaviorId}` : '（任何负面行为）'}{rule.triggerCondition.threshold ? `达${rule.triggerCondition.threshold}次` : ''}</div>
                    </div>
                    <div style={{
                      padding: '6px 14px', borderRadius: D.radiusSm, flexShrink: 0,
                      background: isGold ? D.goldDim : D.blueDim,
                      border: `1px solid ${isGold ? 'rgba(212,168,83,0.3)' : 'rgba(123,139,181,0.3)'}`,
                      fontSize: 14, fontWeight: 600, color: isGold ? D.flameGold : D.blue,
                    }}>
                      {rule.effectType === 'shieldAndEmber' && <Shield size={14} style={{ verticalAlign: 'middle' }} />}
                      {' '}{effectLabels[rule.effectType] || `${rule.effectType} +${rule.effectAmount}`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Penalty rules (from autoRules) */}
            <div style={{ fontSize: 15, fontWeight: 600, color: INK.flameCinnabar, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} /> 惩罚规则
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {config.autoRules.filter(r => r.isActive && r.effectType === 'blankAndHeartDemon').map(rule => {
                const allBehaviors = [...config.negativeBehaviors, ...config.positiveBehaviors];
                const behavior = allBehaviors.find(b => b.id === rule.triggerCondition.behaviorId);
                const threshold = rule.triggerCondition.threshold ?? 3;
                const amount = rule.effectAmount;
                const effectLabel = `+${amount}${config.blankMarkName}（正面）/ +1心魔（背面）`;
                const triggerDesc = rule.triggerCondition.type === 'weekly_behavior_count'
                  ? `一周内${behavior?.name || '该行为'}达${threshold}次`
                  : rule.triggerCondition.behaviorId
                    ? `一周内无「${behavior?.name || '该行为'}」`
                    : '一周内无任何负面行为';
                return (
                  <div key={rule.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: INK.textPrimary, marginBottom: 4 }}>
                        {rule.name.split(' → ')[0]}
                      </div>
                      <div style={{ fontSize: 13, color: INK.textMuted, wordBreak: 'break-word' }}>
                        触发条件：{triggerDesc}
                      </div>
                    </div>
                    <div style={{
                      padding: '6px 14px', borderRadius: D.radiusSm, flexShrink: 0,
                      background: 'rgba(192,57,43,0.1)',
                      border: '1px solid rgba(192,57,43,0.3)',
                      fontSize: 14, fontWeight: 600, color: INK.flameCinnabar,
                    }}>
                      {effectLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 版本历史 */}
        <div data-section-id="version-history" style={sectionStyle}>
          <h2 style={headingStyle(INK.starSilver)}><BookOpen size={20} /> 版本历史</h2>
          <div style={textStyle}>
            <p style={{ marginBottom: 16 }}>
              「星火燎原」系统持续迭代，每一次更新都在让规则更公平、更有趣。以下是所有版本的变更记录。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {VERSION_LOGS.map(log => (
                <div key={log.version} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${D.border}` }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: INK.starGold }}>
                      v{log.version}
                    </span>
                    <span style={{ fontSize: 13, color: INK.textMuted }}>
                      {log.date}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {log.changes.map((change, i) => (
                      <div key={i} style={{ paddingLeft: 12, borderLeft: `2px solid ${D.gold}44` }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: INK.textPrimary, marginBottom: 2 }}>
                          {change.title}
                        </div>
                        <div style={{ fontSize: 13, color: INK.textSecondary, lineHeight: 1.7 }}>
                          {change.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
