import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useStudents } from '../lib/store';
import { getLevelName, getFrontBlanks } from '../lib/cardLogic';
import { useConfig } from '../contexts/ConfigContext';
import { D, INK } from '../data/theme';
import { LevelIcon, ShieldIcon, HeartDemonIcon, FRONT_GRADIENTS, BACK_GRADIENTS, FRONT_BORDER_COLORS, BACK_BORDER_COLORS, FRONT_GLOWS, BACK_GLOWS } from '../components/LevelIcon';
import LevelIllustration from '../components/LevelIllustration';
import type { CardSide } from '../types';

export default function DisplayPage() {
  const config = useConfig();
  const { students } = useStudents();
  const [mode, setMode] = useState<'overview' | 'individual'>('overview');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewingSide, _setViewingSide] = useState<CardSide | null>(null);

  const sorted = [...students].sort((a, b) => a.number - b.number);
  const currentStudent = sorted[currentIndex];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentIndex(i => Math.min(i + 1, sorted.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'f') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        setMode('overview');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sorted.length]);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: isFullscreen ? 0 : 24,
        position: 'relative',
        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
      }}
    >
      {/* Control bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          padding: isFullscreen ? '16px 24px' : 0,
          background: isFullscreen ? 'rgba(10,12,20,0.9)' : 'transparent',
          position: isFullscreen ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          borderBottom: isFullscreen ? `1px solid ${INK.border}` : 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMode('overview')}
            style={{
              padding: '8px 16px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
              background: mode === 'overview' ? 'rgba(212,168,83,0.12)' : 'transparent',
              border: mode === 'overview' ? `1px solid ${INK.borderStrong}` : `1px solid ${INK.border}`,
              color: mode === 'overview' ? INK.starGold : INK.textMuted,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            全班总览
          </button>
          <button
            onClick={() => setMode('individual')}
            style={{
              padding: '8px 16px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
              background: mode === 'individual' ? 'rgba(212,168,83,0.12)' : 'transparent',
              border: mode === 'individual' ? `1px solid ${INK.borderStrong}` : `1px solid ${INK.border}`,
              color: mode === 'individual' ? INK.starGold : INK.textMuted,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            逐一展示
          </button>
        </div>
        <button
          onClick={toggleFullscreen}
          style={{
            padding: '8px', borderRadius: D.radiusSm, background: 'transparent',
            border: `1px solid ${INK.border}`, color: INK.textMuted, cursor: 'pointer',
          }}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Overview mode */}
      {mode === 'overview' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          {sorted.map((student) => {
            const isFront = student.cardSide === 'front';
            const lvl = student.currentLevel;
            const gradient = isFront ? FRONT_GRADIENTS[lvl] : BACK_GRADIENTS[lvl];
            const borderColor = isFront ? FRONT_BORDER_COLORS[lvl] : BACK_BORDER_COLORS[lvl];
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: student.number * 0.02 }}
                onClick={() => { setCurrentIndex(sorted.indexOf(student)); setMode('individual'); }}
                style={{
                  padding: 14,
                  borderRadius: D.radiusSm,
                  background: gradient,
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
              >
                {/* Mini illustration background */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <LevelIllustration side={student.cardSide} level={lvl} size={200} style={{ width: '100%', height: '100%', borderRadius: 0, opacity: 0.2 }} />
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: isFront
                    ? 'linear-gradient(180deg, rgba(10,12,20,0.6) 0%, rgba(10,12,20,0.3) 50%, rgba(10,12,20,0.65) 100%)'
                    : 'linear-gradient(180deg, rgba(20,14,18,0.6) 0%, rgba(20,14,18,0.3) 50%, rgba(20,14,18,0.65) 100%)',
                  pointerEvents: 'none',
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: INK.textMuted }}>#{student.number}</span>
                    <LevelIcon side={student.cardSide} level={lvl} size={16} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: INK.textPrimary, marginBottom: 4 }}>
                    {student.name}
                  </div>
                  <div style={{ fontSize: 12, color: isFront ? INK.starGold : INK.flameEmber }}>
                    {getLevelName(student.cardSide, lvl, config.frontLevels, config.backLevels)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Individual mode — large card matching StudentCard detail */}
      {mode === 'individual' && currentStudent && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: isFullscreen ? '100vh' : 'calc(100vh - 100px)',
            padding: isFullscreen ? '80px 24px 24px' : 0,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStudent.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', maxWidth: 480 }}
            >
              {(() => {
                const isFront = (viewingSide ?? currentStudent.cardSide) === 'front';
                const side = viewingSide ?? currentStudent.cardSide;
                const lvl = currentStudent.currentLevel;
                const levelName = getLevelName(side, lvl, config.frontLevels, config.backLevels);
                const gradient = isFront ? FRONT_GRADIENTS[lvl] : BACK_GRADIENTS[lvl];
                const borderColor = isFront ? FRONT_BORDER_COLORS[lvl] : BACK_BORDER_COLORS[lvl];
                const glow = isFront ? FRONT_GLOWS[lvl] : BACK_GLOWS[lvl];

                return (
                  <div
                    style={{
                      borderRadius: D.radiusSm,
                      padding: 36,
                      background: gradient,
                      border: `1px solid ${borderColor}`,
                      boxShadow: glow,
                      position: 'relative',
                      overflow: 'hidden',
                      textAlign: 'center',
                    }}
                  >
                    {/* Level illustration background */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                      <LevelIllustration side={side} level={lvl} size={500} style={{ width: '100%', height: '100%', borderRadius: 0, opacity: 0.3 }} />
                    </div>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: isFront
                        ? 'linear-gradient(180deg, rgba(10,12,20,0.5) 0%, rgba(10,12,20,0.15) 50%, rgba(10,12,20,0.55) 100%)'
                        : 'linear-gradient(180deg, rgba(20,14,18,0.5) 0%, rgba(20,14,18,0.15) 50%, rgba(20,14,18,0.55) 100%)',
                      pointerEvents: 'none',
                    }} />

                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <LevelIcon side={side} level={lvl} size={40} />
                        <span style={{ fontSize: 13, color: isFront ? INK.starGoldMuted : INK.flameEmber }}>
                          #{currentStudent.number}
                        </span>
                      </div>

                      <div style={{
                        fontSize: 32, fontWeight: 700, marginBottom: 12,
                        color: isFront ? INK.textPrimary : INK.flameGold,
                      }}>
                        {currentStudent.name}
                      </div>

                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 14px', borderRadius: D.radiusSm, fontSize: 14, fontWeight: 600,
                        background: isFront ? 'rgba(212,168,83,0.12)' : 'rgba(212,122,40,0.12)',
                        color: isFront ? INK.starGold : INK.flameEmber,
                        border: isFront ? `1px solid rgba(212,168,83,0.2)` : `1px solid rgba(212,122,40,0.2)`,
                        marginBottom: 20,
                      }}>
                        {isFront ? '正面' : '背面'} · {levelName}
                      </div>

                      {/* Stats */}
                      <div style={{
                        display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20,
                        fontSize: 13, color: INK.textSecondary,
                      }}>
                        {isFront && (
                          <span>{config.blankMarkName} {currentStudent.blanksFilled}/{getFrontBlanks(lvl, config.frontLevels)}</span>
                        )}
                        {!isFront && (
                          <span>累积{config.checkMarkName} {currentStudent.cumulativeChecks}</span>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ShieldIcon count={currentStudent.starShields} size={14} />
                    {currentStudent.currentLevel === 1 && currentStudent.cardSide === 'front' && (
                      <span style={{ fontSize: 10, color: D.textDim }}>
                        (累积{currentStudent.starShields + (currentStudent.totalShieldsExchanged || 0)} / 可用{currentStudent.starShields})
                      </span>
                    )}
                  </span>
                        <HeartDemonIcon count={currentStudent.heartDemonMarks} size={14} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              style={{
                padding: '10px', borderRadius: D.radiusSm, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                background: 'transparent', border: `1px solid ${INK.border}`,
                color: currentIndex === 0 ? INK.starBlueMuted : INK.textSecondary,
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: 14, color: INK.textMuted }}>
              {currentIndex + 1} / {sorted.length}
            </span>
            <button
              onClick={() => setCurrentIndex(i => Math.min(sorted.length - 1, i + 1))}
              disabled={currentIndex === sorted.length - 1}
              style={{
                padding: '10px', borderRadius: D.radiusSm, cursor: sorted.length - 1 ? 'pointer' : 'not-allowed',
                background: 'transparent', border: `1px solid ${INK.border}`,
                color: currentIndex === sorted.length - 1 ? INK.starBlueMuted : INK.textSecondary,
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
