import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Flame,
  ArrowLeft,
  Calendar,
  XCircle,
  Award,
  Trash2,
  AlertTriangle,
  Edit3,
  Save,
  ShoppingBag,
} from 'lucide-react';
import type { Student, CardSide, NegativeWeight, PositiveWeight } from '../types';
import {
  getLevelName,
  getLevelDescription,
  getFrontBlanks,
  getBackChecksRequired,
  getFrontProgress,
  getBackProgress,
  getLevelOneTitle,
  getImmortalTitle,
  donateHeritage,
  processRise,
} from '../lib/cardLogic';
import { toLocalDateStr } from '../lib/utils';
import { useStudents } from '../lib/store';
import { computeStudentLevelChanges } from '../lib/audit';
import { formatLevelChangeDisplay } from '../lib/levelChangeDisplay';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useMobile } from '../hooks/useMobile';
import { useConfig } from '../contexts/ConfigContext';
import { D, INK, INK_INPUT } from '../data/theme';
import { LevelIcon, EclipseIcon, SparkIcon, HeritageIcon, HeartDemonInlineIcon, PrivilegeMark, RestrictionMark, FRONT_GRADIENTS, BACK_GRADIENTS, FRONT_BORDER_COLORS, BACK_BORDER_COLORS, FRONT_GLOWS, BACK_GLOWS } from '../components/LevelIcon';
import LevelIllustration from '../components/LevelIllustration';

function BlanksVisualization({ student }: { student: Student }) {
  const config = useConfig();
  const maxBlanks = getFrontBlanks(student.currentLevel, config.frontLevels);
  const items = [];
  for (let i = 0; i < maxBlanks; i++) {
    const isFilled = i < student.blanksFilled;
    items.push(
      <motion.div
        key={i}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: i * 0.05 }}
        style={{
          width: 32,
          height: 32,
          borderRadius: D.radiusSm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isFilled ? `2px solid ${INK.starGold}` : `2px solid ${INK.starBlueMuted}`,
          background: isFilled ? INK.starGoldFaint : 'rgba(74,83,112,0.05)',
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          color: isFilled ? INK.starGold : INK.starBlueMuted,
        }}
      >
        {isFilled ? <EclipseIcon size={14} /> : ''}
      </motion.div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items}
    </div>
  );
}

function ChecksVisualization({ student }: { student: Student }) {
  const config = useConfig();

  // 不朽晨辉：显示传承值而非升级进度
  if (student.cardSide === 'back' && student.currentLevel === 6) {
    return <ImmortalHeritageDisplay student={student} />;
  }

  const nextLevel = student.currentLevel + 1;
  const required = getBackChecksRequired(nextLevel, student.heartDemonMarks, config.backLevels);
  const displayTotal = required;

  const items = [];
  for (let i = 0; i < displayTotal; i++) {
    const isFilled = i < student.cumulativeChecks;
    items.push(
      <motion.div
        key={i}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: i * 0.03 }}
        style={{
          width: 28,
          height: 28,
          borderRadius: D.radiusSm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isFilled ? `2px solid ${INK.flameGold}` : `2px solid ${INK.flameEmber}40`,
          background: isFilled
            ? `radial-gradient(circle, rgba(232,197,90,0.25) 0%, rgba(212,122,40,0.08) 100%)`
            : 'transparent',
          fontSize: 11,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          color: isFilled ? INK.flameGold : `${INK.flameEmber}40`,
        }}
      >
        {isFilled ? <SparkIcon size={12} /> : ''}
      </motion.div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items}
    </div>
  );
}

function ImmortalHeritageDisplay({ student }: { student: Student }) {
  const config = useConfig();
  const title = getImmortalTitle(student.totalHeritageEarned, config.immortalTitles);

  // Calculate progress to next title
  const nextTitle = config.immortalTitles.find(t => t.heritageRequired > student.totalHeritageEarned);
  const currentThreshold = config.immortalTitles.filter(t => t.heritageRequired <= student.totalHeritageEarned).pop()?.heritageRequired ?? 0;
  const progressPercent = nextTitle
    ? Math.min(100, ((student.totalHeritageEarned - currentThreshold) / (nextTitle.heritageRequired - currentThreshold)) * 100)
    : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {title && (
        <div style={{
          fontSize: 18, fontWeight: 700, fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          background: 'linear-gradient(135deg, #E8A030, #D4A853, #FFF0D0)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 12px rgba(232,160,48,0.5))',
        }}>
          <HeritageIcon size={12} /> {title}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div style={{
          flex: 1, padding: '8px 14px', borderRadius: D.radiusSm, textAlign: 'center',
          background: 'rgba(232,160,48,0.1)', border: '1px solid rgba(232,160,48,0.25)',
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#E8A030', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
            {student.heritagePoints}
          </div>
          <div style={{ fontSize: 11, color: '#E8A030', fontFamily: "'LXGW WenKai', 'Cinzel', serif", opacity: 0.7, whiteSpace: 'nowrap' }}>
            <HeritageIcon size={10} /> 传承值
          </div>
        </div>
        <div style={{
          flex: 1, padding: '8px 14px', borderRadius: D.radiusSm, textAlign: 'center',
          background: 'rgba(224,112,96,0.08)', border: '1px solid rgba(224,112,96,0.2)',
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#e07060', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
            {student.heartDemonMarks}
          </div>
          <div style={{ fontSize: 11, color: '#e07060', fontFamily: "'LXGW WenKai', 'Cinzel', serif", opacity: 0.7 }}>
            <HeartDemonInlineIcon size={10} /> 心魔
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: D.textMid, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
        累计传承值：{student.totalHeritageEarned}　已捐赠：{student.totalHeritageDonated}
      </div>
      {nextTitle && (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.textDim, fontFamily: "'LXGW WenKai', 'Cinzel', serif", marginBottom: 3 }}>
            <span>下一称号：<HeritageIcon size={10} /> {nextTitle.name}</span>
            <span>{student.totalHeritageEarned}/{nextTitle.heritageRequired}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #E8A030, #FFF0D0)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function CardFace({
  student,
}: {
  student: Student;
}) {
  const config = useConfig();
  const isFront = student.cardSide === 'front';
  const levelName = getLevelName(student.cardSide, student.currentLevel, config.frontLevels, config.backLevels);
  const description = getLevelDescription(student.cardSide, student.currentLevel, config.frontLevels, config.backLevels);
  const isLevelOne = student.currentLevel === 1 && isFront;

  const levelTitle = isFront && isLevelOne ? getLevelOneTitle(student.weeksAtLevelOne, config.levelOneTitles) : null;

  // Title tier colors by index: tier 0=pale gold, 1=bright gold, 2=red gold, 3+=platinum
  const TITLE_TIER_COLORS = [
    { color: '#d4c080', border: 'rgba(212,192,128,0.4)', glow: '0 0 12px rgba(212,192,128,0.2)', bg: 'rgba(212,192,128,0.08)' },
    { color: '#e8c55a', border: 'rgba(232,197,90,0.5)', glow: '0 0 16px rgba(232,197,90,0.3)', bg: 'rgba(232,197,90,0.10)' },
    { color: '#e8a040', border: 'rgba(232,160,64,0.5)', glow: '0 0 20px rgba(232,160,64,0.35)', bg: 'rgba(232,160,64,0.10)' },
    { color: '#f0e8d8', border: 'rgba(240,232,216,0.6)', glow: '0 0 24px rgba(240,232,216,0.4), 0 0 48px rgba(212,168,83,0.2)', bg: 'rgba(240,232,216,0.12)' },
  ];
  const titleIdx = levelTitle ? config.levelOneTitles.findIndex(t => t.name === levelTitle) : -1;
  const titleStyle = titleIdx >= 0 ? TITLE_TIER_COLORS[Math.min(titleIdx, TITLE_TIER_COLORS.length - 1)] : null;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 400,
        boxSizing: 'border-box',
        borderRadius: D.radius,
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
        background: isFront ? FRONT_GRADIENTS[student.currentLevel] : BACK_GRADIENTS[student.currentLevel],
        border: `1px solid ${levelTitle && titleStyle ? titleStyle.border : (isFront ? FRONT_BORDER_COLORS[student.currentLevel] : BACK_BORDER_COLORS[student.currentLevel])}`,
        boxShadow: levelTitle && titleStyle ? titleStyle.glow : (isFront ? FRONT_GLOWS[student.currentLevel] : BACK_GLOWS[student.currentLevel]),
      }}
    >
      {/* Level illustration background — fills entire card */}
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
      }}>
        <LevelIllustration side={student.cardSide} level={student.currentLevel} size={400} style={{ width: '100%', height: '100%', borderRadius: 0, opacity: 0.3 }} />
      </div>

      {/* Overlay gradient for text readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isFront
          ? 'linear-gradient(180deg, rgba(10,12,20,0.55) 0%, rgba(10,12,20,0.2) 50%, rgba(10,12,20,0.6) 100%)'
          : (!isFront && student.currentLevel === 6)
            ? 'linear-gradient(180deg, rgba(20,14,10,0.4) 0%, rgba(20,14,10,0.1) 50%, rgba(20,14,10,0.45) 100%)'
            : 'linear-gradient(180deg, rgba(20,14,18,0.55) 0%, rgba(20,14,18,0.2) 50%, rgba(20,14,18,0.6) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Side indicator */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          marginBottom: 16,
          background: isFront ? INK.starGoldFaint : 'rgba(212,122,40,0.15)',
          color: isFront ? INK.starGold : INK.flameEmber,
          border: isFront ? `1px solid rgba(212,168,83,0.3)` : `1px solid rgba(212,122,40,0.3)`,
        }}
      >
        {isFront ? <Star size={12} /> : <Flame size={12} />}
        {isFront ? '正面 - 星辰' : '背面 - 火焰'}
      </div>

      {/* Level icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
        <LevelIcon side={student.cardSide} level={student.currentLevel} size={56} />
        <div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              color: isFront ? (isLevelOne ? INK.flameGold : INK.starSilver) : (student.currentLevel === 6 ? '#FFF0D0' : INK.flameGold),
              textShadow: isLevelOne ? `0 0 20px rgba(212,168,83,0.4)` : 'none',
            }}
          >
            {levelName}
          </div>
          {levelTitle && titleStyle && (
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 12px', borderRadius: D.radiusSm,
                background: titleStyle.bg, border: `1px solid ${titleStyle.border}`,
                fontSize: 13, fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: titleStyle.color,
                marginTop: 4, boxShadow: titleStyle.glow,
              }}
            >
              <Award size={13} /> {levelTitle}
            </div>
          )}
        </div>
      </div>

      {/* Level number */}
      <div
        style={{
          fontSize: 12,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          color: isFront ? 'rgba(123,139,181,0.6)' : 'rgba(212,122,40,0.6)',
          marginBottom: 12,
        }}
      >
        等级 {student.currentLevel} / 6
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          color: isFront ? 'rgba(184,192,212,0.75)' : (!isFront && student.currentLevel === 6) ? 'rgba(255,240,208,0.85)' : 'rgba(232,197,90,0.75)',
          marginBottom: 20,
          position: 'relative',
        }}
      >
        {description}
      </div>

      {/* Visual blanks / checks */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            color: isFront ? 'rgba(123,139,181,0.6)' : 'rgba(212,122,40,0.6)',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          {isFront
            ? `${config.blankMarkName} ${student.blanksFilled} / ${getFrontBlanks(student.currentLevel, config.frontLevels)}`
            : (student.currentLevel === 6)
              ? ''
              : `${config.checkMarkName} ${student.cumulativeChecks} / ${getBackChecksRequired(student.currentLevel + 1, student.heartDemonMarks, config.backLevels)}`}
        </div>
        {isFront ? (
          <BlanksVisualization student={student} />
        ) : (
          <ChecksVisualization student={student} />
        )}
      </div>
    </div>
  );
}

function StatsPanel({ student }: { student: Student }) {
  const config = useConfig();
  const isMobile = useMobile();
  const isFront = student.cardSide === 'front';
  const isImmortal = !isFront && student.currentLevel === 6;

  const stats = isFront ? (student.currentLevel === 1 ? [
    {
      icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke={INK.starGold} strokeWidth="1.5" fill={INK.starGold} fillOpacity="0.15" /><path d="M12 7L13 10H16L13.5 12L14.5 15L12 13L9.5 15L10.5 12L8 10H11Z" fill={INK.starGold} opacity="0.8" /><circle cx="6" cy="8" r="0.5" fill={INK.starGold} opacity="0.5" /><circle cx="18" cy="8" r="0.5" fill={INK.starGold} opacity="0.5" /><circle cx="8" cy="18" r="0.4" fill={INK.starGold} opacity="0.3" /><circle cx="16" cy="18" r="0.4" fill={INK.starGold} opacity="0.3" /></svg>,
      label: '累积护盾',
      value: student.starShields + (student.totalShieldsExchanged || 0),
      color: INK.starBlue,
      bg: 'rgba(123,139,181,0.06)',
    },
    {
      icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke={D.blue} strokeWidth="1.5" fill={D.blue} fillOpacity="0.15" /><path d="M12 7L13 10H16L13.5 12L14.5 15L12 13L9.5 15L10.5 12L8 10H11Z" fill={D.blue} opacity="0.8" /><circle cx="6" cy="8" r="0.5" fill={D.blue} opacity="0.5" /><circle cx="18" cy="8" r="0.5" fill={D.blue} opacity="0.5" /><circle cx="8" cy="18" r="0.4" fill={D.blue} opacity="0.3" /><circle cx="16" cy="18" r="0.4" fill={D.blue} opacity="0.3" /></svg>,
      label: '可用护盾',
      value: student.starShields,
      color: D.blue,
      bg: 'rgba(123,139,181,0.06)',
    },
    {
      icon: <EclipseIcon size={16} color={D.cinnabar} />,
      label: config.blankMarkName,
      value: student.blanksFilled,
      color: D.cinnabar,
      bg: 'rgba(196,65,37,0.06)',
    },
    {
      icon: <Calendar size={16} style={{ color: '#8baa7a' }} />,
      label: '连续零违纪',
      value: `${student.consecutiveNoViolationDays}天`,
      color: '#8baa7a',
      bg: 'rgba(139,170,122,0.06)',
    },
  ] : [
    {
      icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke={INK.starGold} strokeWidth="1.5" fill={INK.starGold} fillOpacity="0.15" /><path d="M12 7L13 10H16L13.5 12L14.5 15L12 13L9.5 15L10.5 12L8 10H11Z" fill={INK.starGold} opacity="0.8" /><circle cx="6" cy="8" r="0.5" fill={INK.starGold} opacity="0.5" /><circle cx="18" cy="8" r="0.5" fill={INK.starGold} opacity="0.5" /><circle cx="8" cy="18" r="0.4" fill={INK.starGold} opacity="0.3" /><circle cx="16" cy="18" r="0.4" fill={INK.starGold} opacity="0.3" /></svg>,
      label: '星光护盾',
      value: student.starShields,
      color: INK.starBlue,
      bg: 'rgba(123,139,181,0.06)',
    },
    {
      icon: <EclipseIcon size={16} color={D.cinnabar} />,
      label: config.blankMarkName,
      value: student.blanksFilled,
      color: D.cinnabar,
      bg: 'rgba(196,65,37,0.06)',
    },
    {
      icon: <Calendar size={16} style={{ color: '#8baa7a' }} />,
      label: '连续零违纪',
      value: `${student.consecutiveNoViolationDays}天`,
      color: '#8baa7a',
      bg: 'rgba(139,170,122,0.06)',
    },
  ]) : isImmortal ? [
    {
      icon: <HeritageIcon size={14} />,
      label: '累积传承值',
      value: student.heritagePoints + student.totalHeritageDonated,
      color: '#E8A030',
      bg: 'rgba(232,160,48,0.06)',
    },
    {
      icon: <HeritageIcon size={14} />,
      label: '可用传承值',
      value: student.heritagePoints,
      color: D.blue,
      bg: 'rgba(123,139,181,0.06)',
    },
    {
      icon: <HeritageIcon size={14} />,
      label: '已捐赠',
      value: student.totalHeritageDonated,
      color: '#8baa7a',
      bg: 'rgba(139,170,122,0.06)',
    },
    {
      icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" stroke="#e07060" strokeWidth="1.2" opacity="0.6" strokeDasharray="2 2" /><path d="M12 3L12 10L8 14L12 12L16 16L12 21" stroke="#c44125" strokeWidth="1.2" opacity="0.7" /><circle cx="12" cy="12" r="2.5" fill="#e07060" opacity="0.3" /><circle cx="12" cy="12" r="1.2" fill="#c44125" opacity="0.6" /><path d="M5 8L8 10" stroke="#e07060" strokeWidth="0.8" opacity="0.4" /><path d="M19 8L16 10" stroke="#e07060" strokeWidth="0.8" opacity="0.4" /><path d="M7 18L9 15" stroke="#e07060" strokeWidth="0.6" opacity="0.3" /><path d="M17 18L15 15" stroke="#e07060" strokeWidth="0.6" opacity="0.3" /></svg>,
      label: '心魔印记',
      value: student.heartDemonMarks,
      color: '#e07060',
      bg: 'rgba(196,65,37,0.06)',
    },
  ] : [
    {
      icon: <SparkIcon size={16} color={INK.flameGold} />,
      label: config.checkMarkName,
      value: student.cumulativeChecks,
      color: INK.flameGold,
      bg: 'rgba(232,197,90,0.06)',
    },
    {
      icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" stroke="#e07060" strokeWidth="1.2" opacity="0.6" strokeDasharray="2 2" /><path d="M12 3L12 10L8 14L12 12L16 16L12 21" stroke="#c44125" strokeWidth="1.2" opacity="0.7" /><circle cx="12" cy="12" r="2.5" fill="#e07060" opacity="0.3" /><circle cx="12" cy="12" r="1.2" fill="#c44125" opacity="0.6" /><path d="M5 8L8 10" stroke="#e07060" strokeWidth="0.8" opacity="0.4" /><path d="M19 8L16 10" stroke="#e07060" strokeWidth="0.8" opacity="0.4" /><path d="M7 18L9 15" stroke="#e07060" strokeWidth="0.6" opacity="0.3" /><path d="M17 18L15 15" stroke="#e07060" strokeWidth="0.6" opacity="0.3" /></svg>,
      label: '心魔印记',
      value: student.heartDemonMarks,
      color: '#e07060',
      bg: 'rgba(196,65,37,0.06)',
    },
    {
      icon: <Calendar size={16} style={{ color: '#8baa7a' }} />,
      label: '连续零违纪',
      value: `${student.consecutiveNoViolationDays}天`,
      color: '#8baa7a',
      bg: 'rgba(139,170,122,0.06)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : (student.cardSide === 'front' && student.currentLevel === 1 ? 'repeat(4, 1fr)' : student.cardSide === 'back' && student.currentLevel === 6 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'),
        gap: 8,
      }}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            borderRadius: D.radiusSm,
            padding: '12px 14px',
            background: D.bgCard,
            border: D.glassBorder,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: `0 0 12px ${stat.color}10`,
            minWidth: 0,
          }}
        >
          <span style={{ color: stat.color }}>{stat.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.textMuted, overflowWrap: 'break-word', lineHeight: 1.25 }}>{stat.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: stat.color }}>{stat.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LevelEffects({ student }: { student: Student }) {
  const config = useConfig();
  const effects = student.cardSide === 'front'
    ? config.frontLevelEffects
    : config.backLevelEffects;
  const current = effects[student.currentLevel - 1];

  const nextLevel = student.currentLevel < 6 ? student.currentLevel + 1 : null;
  const prevLevel = student.currentLevel > 1 ? student.currentLevel - 1 : null;
  const nextEffect = nextLevel ? effects[nextLevel - 1] : null;
  const prevEffect = prevLevel ? effects[prevLevel - 1] : null;

  const isFront = student.cardSide === 'front';

  // Front: nextLevel = worse (降级预告), prevLevel = better (回升预告)
  // Back: nextLevel = better (升级预告), prevLevel = NOT shown (背面不降级)
  const showDowngrade = isFront && prevEffect;

  return (
    <div
      style={{
        background: D.bgGlass,
        borderRadius: D.radiusSm,
        border: D.glassBorder,
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          color: INK.textPrimary,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {current.type === 'privilege' ? (
          <Award size={16} style={{ color: INK.starGold }} />
        ) : (
          <AlertTriangle size={16} style={{ color: INK.flameCinnabar }} />
        )}
        {current.type === 'privilege' ? '当前特权' : '当前限制'}
      </div>

      {/* Current level effects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {current.items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: D.radiusSm,
              background: D.bgGlass,
              border: current.type === 'privilege'
                ? `1px solid ${D.borderGlow}`
                : `1px solid ${D.cinnabarDim}`,
              boxShadow: current.type === 'privilege'
                ? D.goldGlow
                : D.cinnabarGlow,
            }}
          >
            <span style={{
              fontSize: 14,
              color: current.type === 'privilege' ? INK.starGold : INK.flameCinnabar,
              lineHeight: 1,
            }}>
              {current.type === 'privilege' ? <PrivilegeMark size={14} /> : <RestrictionMark size={14} />}
            </span>
            <span style={{
              fontSize: 13,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              color: current.type === 'privilege' ? INK.flameGold : '#e07060',
            }}>
              {item}
            </span>
          </div>
        ))}
      </div>

      {/* Next level preview */}
      {nextEffect && (
        <div style={{ marginBottom: showDowngrade ? 12 : 0 }}>
          <div style={{ fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.textMuted, marginBottom: 6, fontWeight: 500 }}>
            {isFront ? '降级预告' : '升级预告'} → {getLevelName(student.cardSide, nextLevel!, config.frontLevels, config.backLevels)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {nextEffect.items.map((item, i) => {
              const isNew = !current.items.includes(item);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: D.radiusXs,
                    background: isNew
                      ? 'rgba(212,168,83,0.04)'
                      : 'rgba(74,83,112,0.08)',
                    border: `1px solid ${isNew ? 'rgba(212,168,83,0.1)' : INK.border}`,
                    opacity: isNew ? 1 : 0.6,
                  }}
                >
                  {isNew && (
                    <span style={{ fontSize: 10, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.starGold, fontWeight: 600 }}>NEW</span>
                  )}
                  <span style={{
                    fontSize: 12,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    color: nextEffect.type === 'privilege' ? INK.flameGold : '#e07060',
                  }}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Previous level preview — front only (back side doesn't demote) */}
      {showDowngrade && (
        <div>
          <div style={{ fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.textMuted, marginBottom: 6, fontWeight: 500 }}>
            回升预告 → {getLevelName(student.cardSide, prevLevel!, config.frontLevels, config.backLevels)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prevEffect!.items.map((item, i) => {
              const isNew = !current.items.includes(item);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: D.radiusXs,
                    background: isNew
                      ? 'rgba(139,170,122,0.04)'
                      : 'rgba(74,83,112,0.08)',
                    border: `1px solid ${isNew ? 'rgba(139,170,122,0.1)' : INK.border}`,
                    opacity: isNew ? 1 : 0.6,
                  }}
                >
                  {isNew && (
                    <span style={{ fontSize: 10, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: '#8baa7a', fontWeight: 600 }}>回归</span>
                  )}
                  <span style={{
                    fontSize: 12,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    color: prevEffect!.type === 'privilege' ? INK.flameGold : '#e07060',
                  }}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BehaviorHistory({ student, onDeleteRecord }: { student: Student; onDeleteRecord: (id: string) => boolean | Promise<boolean> }) {
  const config = useConfig();
  const { records } = useStudents();
  const { canDeleteRecord } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const studentRecords = useMemo(
    () => records.filter(r => r.studentId === student.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [records, student.id]
  );

  // Compute which records caused level changes (lightweight per-student replay)
  const levelChangeMap = useMemo(
    () => computeStudentLevelChanges(studentRecords, config),
    [studentRecords, config]
  );

  // Time period lookup
  const isMobile = useMobile();

  const renderLevelChangeBadge = (lc: NonNullable<ReturnType<typeof levelChangeMap.get>>, compact = false) => {
    const display = formatLevelChangeDisplay(lc);
    const toneStyle = display.tone === 'up'
      ? { background: 'rgba(139,170,122,0.15)', color: '#8baa7a', border: 'rgba(139,170,122,0.3)' }
      : display.tone === 'flip'
        ? { background: 'rgba(212,168,83,0.16)', color: D.gold, border: 'rgba(212,168,83,0.35)' }
        : { background: 'rgba(196,65,37,0.12)', color: INK.flameCinnabar, border: 'rgba(196,65,37,0.25)' };
    return (
      <span
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 600,
          padding: compact ? '1px 5px' : '1px 6px',
          borderRadius: D.radiusXs,
          flexShrink: 0,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          background: toneStyle.background,
          color: toneStyle.color,
          border: `1px solid ${toneStyle.border}`,
        }}
      >
        {display.label}
      </span>
    );
  };
  const timePeriods = config.timePeriods || [];

  const displayRecords = showAll ? studentRecords : studentRecords.slice(0, 200);

  return (
    <div
      style={{
        background: D.bgGlass,
        borderRadius: D.radiusSm,
        border: D.glassBorder,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          color: INK.textPrimary,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <XCircle size={16} style={{ color: INK.textSecondary }} />
        行为记录
        <span style={{ fontSize: 12, color: INK.textMuted, fontWeight: 400 }}>共 {studentRecords.length} 条</span>
      </div>

      {studentRecords.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0',
            color: INK.textMuted,
            fontSize: 13,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          }}
        >
          暂无行为记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {displayRecords.map(record => {
            const isNeg = record.direction === 'negative';
            const weightName = isNeg
              ? config.negativeWeightNames[record.weight as NegativeWeight]
              : config.positiveWeightNames[record.weight as PositiveWeight];
            const effectiveRecordWeight = isNeg
              ? (record.studentCardSide === 'back' ? 1 + (record.extraWeight ?? 0) : (record.weight as number) + (record.extraWeight ?? 0))
              : (record.weight as number) + (record.extraWeight ?? 0);
            const negativeUnit = record.studentCardSide === 'back' ? '心魔' : config.blankMarkName;
            const positiveUnit = record.studentCardSide === 'back' ? config.checkMarkName : '护盾';
            const symbol = isNeg ? `${effectiveRecordWeight}${negativeUnit}` : `${effectiveRecordWeight}${positiveUnit}`;

            // Mobile: stacked layout. Desktop: single-row layout.
            if (isMobile) {
            return (
              <div key={record.id} style={{
                padding: '10px 12px', borderRadius: D.radiusSm, background: D.bgCard, border: D.glassBorder,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, fontWeight: 600, flexShrink: 0,
                    background: isNeg ? 'rgba(196,65,37,0.08)' : 'rgba(123,139,181,0.08)',
                    color: isNeg ? '#e07060' : INK.starBlue,
                  }}>
                    {weightName} {symbol}
                  </span>
                  <span style={{ fontSize: 13, color: INK.textPrimary, flex: 1, minWidth: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {record.description}
                    {record.remark && <span style={{ color: INK.textMuted, marginLeft: 4 }}>({record.remark.replace(/^ruleId:[^,，]+[,，]\s*/, '')})</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {record.timePeriodId && <span style={{ fontSize: 11, color: INK.starGold, opacity: 0.8 }}>@{timePeriods.find(tp => tp.id === record.timePeriodId)?.name || record.timePeriodId}</span>}
                  {record.shieldsConsumed > 0 && <span style={{ fontSize: 11, color: INK.starBlue }}>消耗{record.shieldsConsumed}护盾</span>}
                  {record.isHighSensitivity && <AlertTriangle size={12} style={{ color: INK.flameCinnabar }} />}
                  {levelChangeMap.has(record.id) && (() => {
                    const lc = levelChangeMap.get(record.id)!;
                    return renderLevelChangeBadge(lc);
                  })()}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: INK.textMuted }}>
                    {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {record.recordedBy && record.recordedBy !== 'demo' && <span style={{ marginLeft: 4 }}>· {record.recordedBy}</span>}
                  </span>
                  {canDeleteRecord && (
                    showDeleteConfirm === record.id ? (
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button disabled={deletingRecordId === record.id} onClick={async () => {
                          setDeletingRecordId(record.id);
                          const synced = await onDeleteRecord(record.id);
                          if (synced) setShowDeleteConfirm(null);
                          setDeletingRecordId(null);
                        }} style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: deletingRecordId === record.id ? 'wait' : 'pointer', opacity: deletingRecordId === record.id ? 0.65 : 1, background: 'rgba(196,65,37,0.15)', border: '1px solid rgba(196,65,37,0.35)', color: INK.flameCinnabar }}>{deletingRecordId === record.id ? '同步中' : '确认'}</button>
                        <button onClick={() => setShowDeleteConfirm(null)} style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer', background: 'rgba(74,83,112,0.15)', border: `1px solid ${INK.border}`, color: INK.textSecondary }}>取消</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowDeleteConfirm(record.id)} style={{ padding: '2px 6px', borderRadius: D.radiusXs, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(196,65,37,0.2)', color: INK.textMuted }}>
                        <Trash2 size={12} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
            }
            // Desktop: original single-row layout
            return (
              <div key={record.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', borderRadius: D.radiusSm, background: D.bgCard, border: D.glassBorder,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    padding: '1px 6px', borderRadius: D.radiusXs, fontSize: 10, fontWeight: 600, flexShrink: 0,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    background: isNeg ? 'rgba(196,65,37,0.08)' : 'rgba(123,139,181,0.08)',
                    color: isNeg ? '#e07060' : INK.starBlue,
                  }}>
                    {weightName} {symbol}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, flex: 1, minWidth: 0, marginRight: 8 }}>
                    {record.description}
                    {record.remark && <span style={{ color: INK.textMuted, marginLeft: 6 }}>({record.remark.replace(/^ruleId:[^,，]+[,，]\s*/, '')})</span>}
                  </span>
                  {record.timePeriodId && <span style={{ fontSize: 10, color: INK.starGold, flexShrink: 0, opacity: 0.7 }}>@{timePeriods.find(tp => tp.id === record.timePeriodId)?.name || record.timePeriodId}</span>}
                  {record.shieldsConsumed > 0 && <span style={{ fontSize: 10, color: INK.starBlue, flexShrink: 0 }}>消耗{record.shieldsConsumed}护盾</span>}
                  {record.isHighSensitivity && <AlertTriangle size={10} style={{ color: INK.flameCinnabar, flexShrink: 0 }} />}
                  {levelChangeMap.has(record.id) && (() => {
                    const lc = levelChangeMap.get(record.id)!;
                    return renderLevelChangeBadge(lc, true);
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: INK.textMuted }}>
                    {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {record.recordedBy && record.recordedBy !== 'demo' && <span style={{ marginLeft: 4 }}>· {record.recordedBy}</span>}
                  </span>
                  {canDeleteRecord && (
                    showDeleteConfirm === record.id ? (
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button disabled={deletingRecordId === record.id} onClick={async () => {
                          setDeletingRecordId(record.id);
                          const synced = await onDeleteRecord(record.id);
                          if (synced) setShowDeleteConfirm(null);
                          setDeletingRecordId(null);
                        }} style={{ padding: '1px 6px', borderRadius: D.radiusXs, fontSize: 10, cursor: deletingRecordId === record.id ? 'wait' : 'pointer', opacity: deletingRecordId === record.id ? 0.65 : 1, fontFamily: "'LXGW WenKai', 'Cinzel', serif", background: 'rgba(196,65,37,0.15)', border: '1px solid rgba(196,65,37,0.35)', color: INK.flameCinnabar }}>{deletingRecordId === record.id ? '同步中' : '确认'}</button>
                        <button onClick={() => setShowDeleteConfirm(null)} style={{ padding: '1px 6px', borderRadius: D.radiusXs, fontSize: 10, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif", background: 'rgba(74,83,112,0.15)', border: `1px solid ${INK.border}`, color: INK.textSecondary }}>取消</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowDeleteConfirm(record.id)} style={{ padding: '1px 4px', borderRadius: D.radiusXs, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(196,65,37,0.2)', color: INK.textMuted }}>
                        <Trash2 size={10} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
          {studentRecords.length > 200 && !showAll && (
            <button onClick={() => setShowAll(true)} style={{ padding: '6px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif", background: D.bgGlass, border: '1px solid rgba(212,168,83,0.2)', color: INK.starGold, textAlign: 'center' }}>
              展开全部 {studentRecords.length} 条记录
            </button>
          )}
          {showAll && studentRecords.length > 200 && (
            <button onClick={() => setShowAll(false)} style={{ padding: '6px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif", background: 'rgba(74,83,112,0.15)', border: `1px solid ${INK.border}`, color: INK.textSecondary, textAlign: 'center' }}>
              收起
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LevelChangeCeremony({ direction, fromName, toName, studentName, fromSide, fromLevel, toSide, toLevel, onComplete }: { direction: 'down' | 'up'; fromName: string; toName: string; studentName: string; fromSide?: CardSide; fromLevel?: number; toSide?: CardSide; toLevel?: number; onComplete: () => void }) {
  const [phase, setPhase] = useState<'show_old' | 'exit_old' | 'enter_new' | 'hold'>('show_old');
  const calledRef = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('exit_old'), 1000);
    const t2 = setTimeout(() => setPhase('enter_new'), 1500);
    const t3 = setTimeout(() => setPhase('hold'), 2200);
    const t4 = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onComplete();
      }
    }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const particles = useMemo(() => {
    const p = [];
    for (let i = 0; i < 24; i++) {
      p.push({
        x: 50 + (Math.random() - 0.5) * 80,
        y: 50 + (Math.random() - 0.5) * 80,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 0.8,
        duration: 1 + Math.random() * 1.5,
      });
    }
    return p;
  }, []);

  const isDown = direction === 'down';
  const primaryColor = isDown ? 'rgba(220,80,60,0.6)' : 'rgba(212,168,83,0.6)';
  const textMain = isDown ? '#dc503c' : INK.starGold;
  const exitY = isDown ? 30 : -30;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,12,20,0.92)', overflow: 'hidden',
      }}
      onClick={() => { if (!calledRef.current) { calledRef.current = true; onComplete(); } }}
    >
      {/* Radial light burst for upgrade */}
      {!isDown && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 0.4, 0.2, 0], scale: [0.3, 1.5, 2, 3] }}
          transition={{ duration: 2.5, delay: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: 300, height: 300, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(212,168,83,0.3) 0%, rgba(212,168,83,0.1) 40%, transparent 70%)`,
          }}
        />
      )}

      {/* Dimming vignette for downgrade */}
      {isDown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0.4, 0] }}
          transition={{ duration: 2, delay: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle, transparent 30%, rgba(60,20,20,0.5) 100%)',
          }}
        />
      )}

      {/* Particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{
            opacity: [0.6, 0.3, 0],
            scale: isDown ? 1.5 : 0.3,
            x: isDown ? (p.x - 50) * 4 : 0,
            y: isDown ? (p.y - 50) * 4 : (p.y - 50) * -3,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: textMain,
            boxShadow: `0 0 6px ${primaryColor}`,
          }}
        />
      ))}

      {/* Center content */}
      <div style={{ textAlign: 'center', zIndex: 1, position: 'relative', width: 300, height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Old level icon */}
        <AnimatePresence>
          {(phase === 'show_old' || phase === 'exit_old') && fromSide && fromLevel && (
            <motion.div
              key="old-icon"
              initial={{ opacity: 1, scale: 1 }}
              animate={phase === 'exit_old' ? { opacity: 0, scale: 0.5, y: exitY } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeIn' }}
              style={{ position: 'absolute', top: 0 }}
            >
              <LevelIcon side={fromSide} level={fromLevel} size={64} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* New level icon */}
        <AnimatePresence>
          {(phase === 'enter_new' || phase === 'hold') && toSide && toLevel && (
            <motion.div
              key="new-icon"
              initial={{ opacity: 0, scale: 0.3, y: exitY }}
              animate={{ opacity: 1, scale: [0.3, 1.2, 1], y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ position: 'absolute', top: 0 }}
            >
              <LevelIcon side={toSide} level={toLevel} size={64} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Old level name */}
        <AnimatePresence>
          {(phase === 'show_old' || phase === 'exit_old') && (
            <motion.div
              key="old"
              initial={{ opacity: 1, y: 0 }}
              animate={phase === 'exit_old' ? { opacity: 0, y: exitY } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeIn' }}
              style={{
                position: 'absolute', left: 0, right: 0, top: 75,
                fontSize: 22, fontWeight: 600,
                color: isDown ? '#8a6060' : '#b8a070',
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              }}
            >
              {fromName}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New level name */}
        <AnimatePresence>
          {(phase === 'enter_new' || phase === 'hold') && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: exitY }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                position: 'absolute', left: 0, right: 0, top: 75,
                fontSize: 28, fontWeight: 700, color: textMain,
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                filter: `drop-shadow(0 0 12px ${primaryColor})`,
              }}
            >
              {toName}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student name */}
        <AnimatePresence>
          {(phase === 'enter_new' || phase === 'hold') && (
            <motion.div
              className="student-name"
              key="name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute', left: 0, right: 0, top: 120,
                fontSize: 13, color: INK.textSecondary,
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              }}
            >
              {studentName}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Direction label */}
        <AnimatePresence>
          {(phase === 'enter_new' || phase === 'hold') && (
            <motion.div
              key="dir"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              style={{
                position: 'absolute', left: 0, right: 0, top: 145,
                fontSize: 12, letterSpacing: 2,
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                color: isDown ? 'rgba(196,65,37,0.6)' : 'rgba(212,168,83,0.6)',
              }}
            >
              {isDown ? '星光黯淡' : '星辰闪耀'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function FlipCeremony({ studentName, newLevelName, onComplete }: { studentName: string; newLevelName: string; onComplete: () => void }) {
  const calledRef = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onComplete();
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const starParticles = useMemo(() => {
    const p = [];
    for (let i = 0; i < 36; i++) {
      p.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 1.2,
        duration: 1.2 + Math.random() * 1.5,
      });
    }
    return p;
  }, []);

  const fireParticles = useMemo(() => {
    const p = [];
    for (let i = 0; i < 20; i++) {
      p.push({
        leftX: 30 + Math.random() * 40,
        size: 4 + Math.random() * 6,
        delay: i * 0.08,
        colorIdx: i % 3,
      });
    }
    return p;
  }, []);

  // Shockwave rings
  const rings = useMemo(() => [0, 0.3], []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,12,20,0.95)',
        overflow: 'hidden',
      }}
      onClick={onComplete}
    >
      {/* Phase 1: Intro text (0-1.2s) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0.9, 0] }}
        transition={{ duration: 1.5, times: [0, 0.3, 0.7, 1] }}
        style={{
          position: 'absolute',
          top: '30%',
          textAlign: 'center',
          zIndex: 3,
        }}
      >
        <div style={{
          fontSize: 16, fontWeight: 400, letterSpacing: 4,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          color: 'rgba(184,192,212,0.6)',
        }}>
          当星辰走到尽头……
        </div>
      </motion.div>

      {/* Shockwave rings (1.2-2.5s) */}
      {rings.map((delayOffset, i) => (
        <motion.div
          key={`ring-${i}`}
          initial={{ scale: 0, opacity: 0.6, borderWidth: 2 }}
          animate={{ scale: [0, 8], opacity: [0.6, 0], borderWidth: [2, 0.5] }}
          transition={{ duration: 1.2, delay: 1.2 + delayOffset, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: 60, height: 60, borderRadius: '50%',
            border: '2px solid rgba(212,168,83,0.4)',
          }}
        />
      ))}

      {/* Star particles dispersing (1.5-3.5s) */}
      {starParticles.map((p, i) => (
        <motion.div
          key={`star-${i}`}
          initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: [0, 0.8, 0.6, 0],
            x: (p.x - 50) * 6,
            y: (p.y - 50) * 6,
            scale: 0.2,
          }}
          transition={{ duration: p.duration, delay: 1.5 + p.delay * 0.5, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size, height: p.size, borderRadius: '50%',
            background: '#d4a853',
            boxShadow: '0 0 8px rgba(212,168,83,0.6)',
          }}
        />
      ))}

      {/* Central card flip (1.8-3.5s) */}
      <motion.div
        initial={{ rotateY: 0, scale: 0.3, opacity: 0 }}
        animate={{ rotateY: [0, 0, 90, 90, 180], scale: [0.3, 0.8, 0.8, 0.9, 1], opacity: [0, 1, 1, 1, 1] }}
        transition={{ duration: 2.5, times: [0, 0.15, 0.4, 0.55, 0.8], ease: 'easeInOut', delay: 1.5 }}
        style={{
          width: 300, height: 420, borderRadius: D.radius,
          perspective: 1000, position: 'relative', transformStyle: 'preserve-3d',
          boxShadow: '0 0 60px rgba(212,168,83,0.3), 0 0 120px rgba(196,65,37,0.15)',
        }}
      >
        {/* Front side */}
        <motion.div
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 2.5, times: [0, 0.35, 0.5, 1], delay: 1.5 }}
          style={{
            position: 'absolute', inset: 0, borderRadius: D.radius,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #1a1640 100%)',
            border: '2px solid rgba(212,168,83,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            backfaceVisibility: 'hidden',
          }}
        >
          <LevelIllustration side="front" level={6} size={300} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5, borderRadius: D.radius }} />
          <LevelIcon side="front" level={6} size={80} />
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.starGold }}>深谷余烬</div>
        </motion.div>

        {/* Back side */}
        <motion.div
          animate={{ opacity: [0, 0, 1, 1] }}
          transition={{ duration: 2.5, times: [0, 0.4, 0.55, 1], delay: 1.5 }}
          style={{
            position: 'absolute', inset: 0, borderRadius: D.radius,
            background: 'linear-gradient(135deg, #4a1515 0%, #2a0808 50%, #1a0505 100%)',
            border: '2px solid rgba(196,65,37,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
          }}
        >
          <LevelIllustration side="back" level={1} size={300} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5, borderRadius: D.radius }} />
          <LevelIcon side="back" level={1} size={80} />
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.flameGold }}>冰封心火</div>
        </motion.div>
      </motion.div>

      {/* Flash at flip midpoint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.8, 0] }}
        transition={{ duration: 0.4, times: [0, 0.1, 0.5, 1], delay: 2.8 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Fire particles rising (3-5s) */}
      {fireParticles.map((p, i) => (
        <motion.div
          key={`fire-${i}`}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 0.9, 0.7, 0],
            y: [-50, -180, -350],
            scale: [0.5, 1.2, 0.3],
          }}
          transition={{ duration: 1.8, delay: 3 + p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size, height: p.size, borderRadius: '50%',
            background: p.colorIdx === 0 ? INK.flameGold : p.colorIdx === 1 ? INK.flameEmber : INK.flameCinnabar,
            boxShadow: '0 0 12px rgba(212,122,40,0.6)',
            left: `${p.leftX}%`, bottom: '30%',
          }}
        />
      ))}

      {/* Bottom text (3.5-5s) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: [0, 0, 1, 1], y: [20, 20, 0, 0] }}
        transition={{ duration: 2, times: [0, 0.3, 0.5, 1], delay: 3.2, ease: 'easeOut' }}
        style={{
          position: 'absolute', bottom: '12%', textAlign: 'center',
        }}
      >
        <div className="student-name" style={{
          fontSize: 18, fontWeight: 600, letterSpacing: 3,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          background: `linear-gradient(135deg, ${INK.flameGold}, ${INK.starGold})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 16px rgba(212,168,83,0.4))',
        }}>
          {studentName} · 深谷余烬 → {newLevelName}
        </div>
        <div style={{ fontSize: 13, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.flameGold, marginTop: 6, opacity: 0.7 }}>
          星辰虽逝，薪火未灭
        </div>
      </motion.div>
    </motion.div>
  );
}

function StudentEditPanel({ student, onSave }: { student: Student; onSave: (updates: Partial<Student>) => void }) {
  const config = useConfig();
  const [editing, setEditing] = useState(false);
  const [cardSide, setCardSide] = useState<CardSide>(student.cardSide);
  const [currentLevel, setCurrentLevel] = useState(student.currentLevel);
  const [blanksFilled, setBlanksFilled] = useState(student.blanksFilled);
  const [cumulativeChecks, setCumulativeChecks] = useState(student.cumulativeChecks);
  const [starShields, setStarShields] = useState(student.starShields);
  const [heartDemonMarks, setHeartDemonMarks] = useState(student.heartDemonMarks);
  const [consecutiveNoViolationDays, setConsecutiveNoViolationDays] = useState(student.consecutiveNoViolationDays);

  const startEdit = () => {
    setCardSide(student.cardSide);
    setCurrentLevel(student.currentLevel);
    setBlanksFilled(student.blanksFilled);
    setCumulativeChecks(student.cumulativeChecks);
    setStarShields(student.starShields);
    setHeartDemonMarks(student.heartDemonMarks);
    setConsecutiveNoViolationDays(student.consecutiveNoViolationDays);
    setEditing(true);
  };

  const handleSave = () => {
    onSave({
      cardSide,
      currentLevel,
      blanksFilled,
      cumulativeChecks,
      starShields,
      heartDemonMarks,
      consecutiveNoViolationDays,
      totalBlanksEverFilled: Math.max(student.totalBlanksEverFilled, blanksFilled),
      totalHeartDemonsEverGained: Math.max(student.totalHeartDemonsEverGained, heartDemonMarks),
      totalShieldsEverEarned: Math.max(student.totalShieldsEverEarned, starShields),
      totalChecksEverEarned: Math.max(student.totalChecksEverEarned, cumulativeChecks),
      updatedAt: new Date().toISOString(),
    });
    setEditing(false);
  };

  const levelOptions = Array.from({ length: 6 }, (_, i) => i + 1);

  const inputStyle: React.CSSProperties = {
    ...INK_INPUT,
    width: '100%', padding: '8px 12px',
    fontSize: 13,
    backgroundColor: '#1a1a2e',
  };

  const optionStyle: React.CSSProperties = {
    background: '#1a1a2e',
    color: D.text,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.textMuted, marginBottom: 4, display: 'block',
  };

  if (!editing) {
    return (
      <div style={{
        padding: 14, borderRadius: D.radiusSm, marginBottom: 20,
        background: D.bgGlass, border: D.glassBorder,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 13, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.textMuted }}>手动调整卡片状态（等级、面、数值等）</div>
        <button onClick={startEdit} style={{
          padding: '6px 14px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.25)',
          color: INK.starGold, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Edit3 size={12} /> 编辑
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: 16, borderRadius: D.radiusSm, marginBottom: 20,
      background: D.bgGlass, border: '1px solid rgba(212,168,83,0.2)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.starGold, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Edit3 size={14} /> 手动编辑卡片状态
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Card side */}
        <div>
          <label style={labelStyle}>卡片面</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setCardSide('front')} style={{
              flex: 1, padding: '8px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              background: cardSide === 'front' ? 'rgba(212,168,83,0.15)' : 'rgba(74,83,112,0.12)',
              border: `1px solid ${cardSide === 'front' ? 'rgba(212,168,83,0.4)' : INK.border}`,
              color: cardSide === 'front' ? INK.starGold : INK.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <Star size={12} /> 正面
            </button>
            <button onClick={() => setCardSide('back')} style={{
              flex: 1, padding: '8px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              background: cardSide === 'back' ? 'rgba(212,122,40,0.15)' : 'rgba(74,83,112,0.12)',
              border: `1px solid ${cardSide === 'back' ? 'rgba(212,122,40,0.4)' : INK.border}`,
              color: cardSide === 'back' ? INK.flameEmber : INK.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <Flame size={12} /> 背面
            </button>
          </div>
        </div>

        {/* Level */}
        <div>
          <label style={labelStyle}>等级（1-6）</label>
          <select value={currentLevel} onChange={e => setCurrentLevel(Number(e.target.value))} style={inputStyle}>
            {levelOptions.map(lv => (
              <option key={lv} value={lv} style={optionStyle}>
                Lv.{lv} - {getLevelName(cardSide, lv, config.frontLevels, config.backLevels)}
              </option>
            ))}
          </select>
        </div>

        {/* Blanks filled (front only) */}
        {cardSide === 'front' && (
          <div>
            <label style={labelStyle}>{config.blankMarkName}填充数</label>
            <input type="number" min={0} max={getFrontBlanks(currentLevel, config.frontLevels)} value={blanksFilled} onChange={e => setBlanksFilled(Math.max(0, Number(e.target.value)))} style={inputStyle} />
          </div>
        )}

        {/* Cumulative checks */}
        <div>
          <label style={labelStyle}>累积{config.checkMarkName}数</label>
          <input type="number" min={0} value={cumulativeChecks} onChange={e => setCumulativeChecks(Math.max(0, Number(e.target.value)))} style={inputStyle} />
        </div>

        {/* Star shields */}
        <div>
          <label style={labelStyle}>星光护盾</label>
          <input type="number" min={0} value={starShields} onChange={e => setStarShields(Math.max(0, Number(e.target.value)))} style={inputStyle} />
        </div>

        {/* Heart demon marks */}
        <div>
          <label style={labelStyle}>心魔印记</label>
          <input type="number" min={0} value={heartDemonMarks} onChange={e => setHeartDemonMarks(Math.max(0, Number(e.target.value)))} style={inputStyle} />
        </div>

        {/* Consecutive no violation days */}
        <div>
          <label style={labelStyle}>连续无违纪天数</label>
          <input type="number" min={0} value={consecutiveNoViolationDays} onChange={e => setConsecutiveNoViolationDays(Math.max(0, Number(e.target.value)))} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button onClick={() => setEditing(false)} style={{
          padding: '8px 16px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          background: 'rgba(74,83,112,0.15)', border: `1px solid ${INK.border}`, color: INK.textSecondary,
        }}>
          取消
        </button>
        <button onClick={handleSave} style={{
          padding: '8px 16px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          background: `linear-gradient(135deg, ${INK.starGoldMuted}, ${INK.starGold})`, border: 'none',
          color: INK.bgDeep, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: D.goldGlowStrong,
        }}>
          <Save size={14} /> 保存
        </button>
      </div>
    </div>
  );
}

// ===== Tab Bar Component =====

function TabBar({ activeTab, onTabChange, student }: {
  activeTab: 'level' | 'effects' | 'history';
  onTabChange: (tab: 'level' | 'effects' | 'history') => void;
  student: Student;
}) {
  const isFront = student.cardSide === 'front';
  const accentColor = isFront ? INK.starGold : INK.flameEmber;

  const tabs: { key: 'level' | 'effects' | 'history'; label: string; icon: React.ReactNode }[] = [
    { key: 'level', label: '等级', icon: <Star size={13} /> },
    { key: 'effects', label: '特权/限制', icon: <Award size={13} /> },
    { key: 'history', label: '记录', icon: <Calendar size={13} /> },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: 2,
      marginBottom: 20,
      background: D.bgGlass,
      borderRadius: D.radiusSm,
      border: D.glassBorder,
      padding: 3,
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '8px 0',
              borderRadius: D.radiusXs + 1,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              transition: 'all 0.2s ease',
              background: isActive ? (isFront ? 'rgba(212,168,83,0.12)' : 'rgba(212,122,40,0.12)') : 'transparent',
              color: isActive ? accentColor : INK.textMuted,
              boxShadow: isActive ? `0 0 8px ${accentColor}20` : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function StudentCard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = useConfig();
  const { students, updateStudent, deleteBehaviorRecord, addBehaviorRecord } = useStudents();
  const { canDeleteRecord, canRecord, isParent } = useAuth();
  const { showToast } = useToast();
  const [showFlipCeremony, setShowFlipCeremony] = useState(false);
  const [showLevelChangeCeremony, setShowLevelChangeCeremony] = useState(false);
  const [showHeritageDonate, setShowHeritageDonate] = useState(false);
  const [heritageRecipientId, setHeritageRecipientId] = useState('');
  const [heritageConfirm, setHeritageConfirm] = useState(false);
  const [showExchangePanel, setShowExchangePanel] = useState(false);
  const [exchangeConfirmId, setExchangeConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'level' | 'effects' | 'history'>('level');
  const [isSyncing, setIsSyncing] = useState(false);
  const isMobile = useMobile();

  const student = students.find((s) => s.id === id);

  // Check for flip ceremony trigger from URL params
  useEffect(() => {
    if (searchParams.get('flipped') === 'true') {
      setShowFlipCeremony(true);
      // Clean URL
      navigate(`/card/${id}`, { replace: true });
    }
  }, [searchParams, id, navigate]);

  // Show level change ceremony on first visit
  useEffect(() => {
    if (student?.lastLevelChange && !student.lastLevelChange.viewed) {
      if (showFlipCeremony || showLevelChangeCeremony) return;
      if (student.lastLevelChange.direction === 'flip') {
        setShowFlipCeremony(true);
      } else {
        setShowLevelChangeCeremony(true);
      }
    }
  }, [student?.id, student?.lastLevelChange]);

  if (!student) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: INK.textSecondary,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontFamily: "'LXGW WenKai', 'Cinzel', serif", marginBottom: 8 }}>未找到该学生</p>
          {!isParent && (
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 20px',
              borderRadius: D.radiusSm,
              background: INK.starGoldMuted,
              color: INK.bgDeep,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              fontWeight: 600,
            }}
          >
            返回首页
          </button>
          )}
        </div>
      </div>
    );
  }

  const progress = student.cardSide === 'front'
    ? getFrontProgress(student, config.frontLevels)
    : getBackProgress(student, config.backLevels);

  const syncAfterChange = async (successMessage: string) => {
    setIsSyncing(true);
    try {
      await window.xinghuoSync?.saveNow();
      showToast(successMessage);
      return true;
    } catch {
      showToast('同步失败：请检查网络后在顶部点“重试”');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    deleteBehaviorRecord(recordId);
    return await syncAfterChange('已删除记录并同步');
  };

  const handleEditSave = async (updates: Partial<Student>) => {
    if (!student) return;
    updateStudent(student.id, (s) => ({ ...s, ...updates }));
    await syncAfterChange('已保存修改并同步');
  };

  return (
    <div style={{ minHeight: '100vh', padding: isMobile ? '8px 0 calc(94px + env(safe-area-inset-bottom))' : '16px', overflowX: 'hidden' }}>
      {/* Flip ceremony overlay */}
      <AnimatePresence>
        {showFlipCeremony && (
          <FlipCeremony
            studentName={student.name}
            newLevelName={getLevelName('back', 1, config.frontLevels, config.backLevels)}
            onComplete={() => {
              setShowFlipCeremony(false);
              if (student.lastLevelChange) {
                updateStudent(student.id, (s) => {
                  const { lastLevelChange, ...rest } = s;
                  return rest as Student;
                });
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Level change ceremony overlay */}
      <AnimatePresence>
        {showLevelChangeCeremony && student.lastLevelChange && (
          <LevelChangeCeremony
            direction={student.lastLevelChange.direction as 'down' | 'up'}
            fromName={getLevelName(student.lastLevelChange.fromSide, student.lastLevelChange.fromLevel, config.frontLevels, config.backLevels)}
            toName={getLevelName(student.lastLevelChange.toSide, student.lastLevelChange.toLevel, config.frontLevels, config.backLevels)}
            fromSide={student.lastLevelChange.fromSide}
            fromLevel={student.lastLevelChange.fromLevel}
            toSide={student.lastLevelChange.toSide}
            toLevel={student.lastLevelChange.toLevel}
            studentName={student.name}
            onComplete={() => {
              setShowLevelChangeCeremony(false);
              if (student.lastLevelChange) {
                updateStudent(student.id, (s) => {
                  const { lastLevelChange, ...rest } = s;
                  return rest as Student;
                });
              }
            }}
          />
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Back button — hidden for parents (they can't access 全班总览) */}
        {!isParent && (
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: D.radiusSm,
            background: D.bgGlass,
            border: D.glassBorder,
            color: INK.textSecondary,
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={14} /> 返回总览
        </button>
        )}

        {/* Student header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: D.radiusSm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              color: student.cardSide === 'front' ? INK.starGold : INK.flameGold,
              background:
                student.cardSide === 'front'
                  ? INK.starGoldFaint
                  : 'rgba(212,122,40,0.12)',
              border:
                student.cardSide === 'front'
                  ? '1px solid rgba(212,168,83,0.25)'
                  : '1px solid rgba(212,122,40,0.25)',
            }}
          >
            {student.number}
          </div>
          <div>
            <div className="student-name" style={{ fontSize: 22, fontWeight: 700, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: INK.textPrimary }}>
              {student.name}
            </div>
            <div
              style={{
                fontSize: 13,
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                color: student.cardSide === 'front' ? INK.starGold : INK.flameEmber,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {student.cardSide === 'front' ? <Star size={12} /> : <Flame size={12} />}
              当前：{student.cardSide === 'front' ? '正面' : '背面'} -{' '}
              {getLevelName(student.cardSide, student.currentLevel, config.frontLevels, config.backLevels)}
            </div>
          </div>
        </div>

        {/* Card face */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <CardFace student={student} />
        </div>

        {/* Tab bar */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} student={student} />

        {/* Tab content */}
        {activeTab === 'level' && (
        <>
        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              color: INK.textSecondary,
              marginBottom: 4,
            }}
          >
            <span>
              {student.cardSide === 'front'
                ? `${config.blankMarkName}填充 ${student.blanksFilled}/${getFrontBlanks(student.currentLevel, config.frontLevels)}`
                : (student.currentLevel === 6)
                  ? ''
                  : `${config.checkMarkName} ${student.cumulativeChecks}/${getBackChecksRequired(student.currentLevel + 1, student.heartDemonMarks, config.backLevels)}`}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: D.radiusSm,
              background: 'rgba(74,83,112,0.2)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: D.radiusSm,
                background:
                  student.cardSide === 'front'
                    ? `linear-gradient(90deg, ${INK.starGoldMuted}, ${INK.starGold})`
                    : `linear-gradient(90deg, ${INK.flameEmber}, ${INK.flameGold})`,
              }}
            />
          </div>
        </div>

        {/* Stats panel */}
        <div style={{ marginBottom: 20 }}>
          <StatsPanel student={student} />
        </div>

        {/* Rise conditions — front side level 2-6 only */}
        {student.cardSide === 'front' && student.currentLevel >= 2 && (() => {
          const riseTask = config.riseTasks?.find(t => t.level === student.currentLevel);
          if (!riseTask) return null;
          const daysRequired = riseTask.riseDaysRequired ?? 0;
          const currentDays = student.consecutiveNoViolationDays;
          const daysMet = currentDays >= daysRequired;
          const taskDone = student.riseTaskCompleted ?? false;
          const allMet = daysMet && taskDone;
          const progress = daysRequired > 0 ? Math.min(100, (currentDays / daysRequired) * 100) : 0;
          return (
            <div style={{
              marginBottom: 20, padding: 14, borderRadius: D.radius,
              background: allMet ? 'rgba(100,200,130,0.06)' : D.bgGlass,
              border: allMet ? '1px solid rgba(100,200,130,0.3)' : D.glassBorder,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: allMet ? '#68c87a' : INK.textPrimary, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  回升条件 → {getLevelName('front', student.currentLevel - 1, config.frontLevels, config.backLevels)}
                </span>
                {allMet && (
                  <span style={{ fontSize: 11, color: '#68c87a', fontWeight: 500 }}>条件已满足</span>
                )}
              </div>
              {/* Condition 1: consecutive no-violation days */}
              {daysRequired > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: daysMet ? '#68c87a' : INK.textSecondary }}>
                      连续{daysRequired}天零违纪
                    </span>
                    <span style={{ fontSize: 11, color: daysMet ? '#68c87a' : D.textDim, whiteSpace: 'nowrap' }}>
                      {currentDays}/{daysRequired}天
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: daysMet ? '#68c87a' : D.gold, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}
              {/* Condition 2: task completion */}
              {riseTask.riseTask && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: D.radiusXs, background: taskDone ? 'rgba(100,200,130,0.06)' : 'rgba(255,255,255,0.02)', border: taskDone ? '1px solid rgba(100,200,130,0.2)' : `1px solid ${INK.border}` }}>
                  <span style={{ fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: taskDone ? '#68c87a' : INK.textSecondary }}>
                    {riseTask.riseTask}
                  </span>
                  {taskDone ? (
                    <button
                      disabled={isSyncing}
                      onClick={async () => {
                        updateStudent(student.id, s => ({ ...s, riseTaskCompleted: false }));
                        await syncAfterChange('回升任务状态已同步');
                      }}
                      style={{
                        padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: isSyncing ? 'wait' : 'pointer',
                        opacity: isSyncing ? 0.65 : 1,
                        background: 'rgba(100,200,130,0.08)', border: '1px solid rgba(100,200,130,0.25)',
                        color: '#68c87a',
                      }}
                    >
                      已完成✕
                    </button>
                  ) : (
                    <button
                      disabled={isSyncing}
                      onClick={async () => {
                        if (daysMet) {
                          const { student: updated, rose } = processRise(student, currentDays, daysRequired, true);
                          if (rose) {
                            const oldName = getLevelName('front', student.currentLevel, config.frontLevels, config.backLevels);
                            const newName = getLevelName('front', updated.currentLevel, config.frontLevels, config.backLevels);
                            updateStudent(student.id, () => updated);
                            addBehaviorRecord({
                              studentId: student.id,
                              direction: 'positive',
                              weight: 1 as PositiveWeight,
                              category: '品行',
                              description: `完成回升任务：${riseTask.riseTask}`,
                              remark: `${oldName} → ${newName}`,
                              recordedBy: '班主任',
                              verified: true,
                              shieldsConsumed: 0,
                              isHighSensitivity: false,
                              studentCardSide: student.cardSide,
                              timePeriodId: undefined,
                            });
                            await syncAfterChange(`${student.name} 回升成功并同步：${oldName} → ${newName}`);
                            return;
                          }
                        }
                        updateStudent(student.id, s => ({ ...s, riseTaskCompleted: true }));
                        await syncAfterChange('回升任务已标记完成并同步');
                      }}
                      style={{
                        padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: isSyncing ? 'wait' : 'pointer',
                        opacity: isSyncing ? 0.65 : 1,
                        background: 'rgba(100,200,130,0.08)', border: '1px solid rgba(100,200,130,0.25)',
                        color: '#68c87a',
                      }}
                    >
                      标记完成
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Exchange section — only for front level 1 (星辉典范) or back level 6 (不朽晨辉) */}
        {((student.cardSide === 'front' && student.currentLevel === 1) || (student.cardSide === 'back' && student.currentLevel === 6)) && (
          <div style={{ marginBottom: 20, padding: 14, borderRadius: D.radius, background: D.bgGlass, border: D.glassBorder }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showExchangePanel ? 10 : 0 }}>
              <div style={{ fontSize: 13, color: student.cardSide === 'front' ? INK.starGold : '#E8A030', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                <ShoppingBag size={13} /> {student.cardSide === 'front' ? '护盾兑换' : '传承兑换'}
              </div>
              <button onClick={() => { setShowExchangePanel(!showExchangePanel); setExchangeConfirmId(null); }}
                style={{ padding: '3px 10px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', background: student.cardSide === 'front' ? 'rgba(123,139,181,0.08)' : 'rgba(232,160,48,0.08)', border: student.cardSide === 'front' ? '1px solid rgba(123,139,181,0.3)' : '1px solid rgba(232,160,48,0.3)', color: student.cardSide === 'front' ? INK.starBlue : '#E8A030', transition: 'all 0.25s ease' }}>
                {showExchangePanel ? '收起' : '兑换'}
              </button>
            </div>
            {showExchangePanel && (() => {
              const today = toLocalDateStr(new Date());
              const availableItems = config.exchangeItems.filter(item => {
                if (item.side !== student.cardSide || !item.isActive) return false;
                if (item.startDate && today < item.startDate) return false;
                if (item.endDate && today > item.endDate) return false;
                return true;
              }).sort((a, b) => a.cost - b.cost);
              const currency = student.cardSide === 'front' ? '护盾' : '传承值';
              const balance = student.cardSide === 'front' ? student.starShields : student.heritagePoints;
              if (availableItems.length === 0) {
                return <div style={{ fontSize: 12, color: D.textDim }}>暂无可兑换项目</div>;
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: D.textMid, marginBottom: 2 }}>
                    当前{currency}：<span style={{ color: student.cardSide === 'front' ? INK.starBlue : '#E8A030', fontWeight: 600 }}>{balance}</span>
                  </div>
                  {availableItems.map(item => {
                    const canAfford = balance >= item.cost;
                    const isConfirming = exchangeConfirmId === item.id;
                    return (
                      <div key={item.id} style={{
                        padding: '10px 12px', borderRadius: D.radiusSm,
                        background: canAfford ? (student.cardSide === 'front' ? 'rgba(123,139,181,0.06)' : 'rgba(232,160,48,0.06)') : 'rgba(74,83,112,0.04)',
                        border: canAfford
                          ? (student.cardSide === 'front' ? '1px solid rgba(123,139,181,0.3)' : '1px solid rgba(232,160,48,0.3)')
                          : `1px solid ${INK.border}`,
                        opacity: canAfford ? 1 : 0.5,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: item.description ? 4 : 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif", color: canAfford ? (student.cardSide === 'front' ? INK.starGold : '#E8A030') : D.textDim }}>
                            {item.name}
                            {(item.startDate || item.endDate) && (
                              <span style={{ marginLeft: 4, padding: '0px 5px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: 'rgba(212,122,40,0.2)', color: '#D47A28', verticalAlign: 'middle' }}>限时</span>
                            )}
                          </span>
                          <span style={{
                            padding: '1px 8px', borderRadius: D.radiusXs, fontSize: 11, fontWeight: 600,
                            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                            background: canAfford ? (student.cardSide === 'front' ? 'rgba(123,139,181,0.12)' : 'rgba(232,160,48,0.12)') : 'rgba(74,83,112,0.08)',
                            border: canAfford ? (student.cardSide === 'front' ? '1px solid rgba(123,139,181,0.25)' : '1px solid rgba(232,160,48,0.25)') : `1px solid ${INK.border}`,
                            color: canAfford ? (student.cardSide === 'front' ? INK.starBlue : '#E8A030') : D.textDim,
                          }}>
                            {item.cost} {currency}
                          </span>
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 11, color: D.textMid, fontFamily: "'LXGW WenKai', 'Cinzel', serif", marginBottom: canAfford && !isConfirming ? 6 : 4 }}>
                            {item.description}
                          </div>
                        )}
                        {canAfford && !isConfirming && (
                          <button onClick={() => setExchangeConfirmId(item.id)}
                            style={{ padding: '3px 10px', borderRadius: D.radiusSm, fontSize: 11, cursor: 'pointer', background: student.cardSide === 'front' ? 'rgba(123,139,181,0.1)' : 'rgba(232,160,48,0.1)', border: student.cardSide === 'front' ? '1px solid rgba(123,139,181,0.3)' : '1px solid rgba(232,160,48,0.3)', color: student.cardSide === 'front' ? INK.starBlue : '#E8A030', fontWeight: 500, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                            兑换
                          </button>
                        )}
                        {isConfirming && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: D.cinnabar, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>确认消耗{item.cost}{currency}兑换？</span>
                            <button disabled={isSyncing} onClick={async () => {
                              if (student.cardSide === 'front') {
                                updateStudent(student.id, (s: Student) => ({ ...s, starShields: s.starShields - item.cost, totalShieldsExchanged: (s.totalShieldsExchanged || 0) + item.cost }));
                              } else {
                                updateStudent(student.id, (s: Student) => ({ ...s, heritagePoints: s.heritagePoints - item.cost, totalHeritageDonated: s.totalHeritageDonated + item.cost }));
                              }
                              addBehaviorRecord({
                                studentId: student.id, direction: 'positive', weight: 1 as PositiveWeight,
                                category: '品行', description: `兑换：${item.name}`,
                                remark: `消耗${item.cost}${student.cardSide === 'front' ? '护盾' : '传承值'}`, recordedBy: '班主任',
                                verified: true, shieldsConsumed: 0, isHighSensitivity: false,
                                studentCardSide: student.cardSide,
                              });
                              const synced = await syncAfterChange(`已兑换并同步：${item.name}`);
                              if (synced) {
                                setExchangeConfirmId(null);
                                setShowExchangePanel(false);
                              }
                            }} style={{ padding: '3px 8px', borderRadius: D.radiusSm, fontSize: 11, cursor: isSyncing ? 'wait' : 'pointer', opacity: isSyncing ? 0.65 : 1, background: student.cardSide === 'front' ? 'rgba(123,139,181,0.2)' : 'rgba(232,160,48,0.2)', border: student.cardSide === 'front' ? '1px solid rgba(123,139,181,0.4)' : '1px solid rgba(232,160,48,0.4)', color: student.cardSide === 'front' ? INK.starBlue : '#E8A030', fontWeight: 500, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                              {isSyncing ? '同步中' : '确认'}
                            </button>
                            <button onClick={() => setExchangeConfirmId(null)} style={{ padding: '3px 8px', borderRadius: D.radiusSm, fontSize: 11, cursor: 'pointer', background: D.bgCard, border: `1px solid ${D.border}`, color: D.textMid, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                              取消
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* 薪火传承 — only for immortal students with heritage */}
        {student.cardSide === 'back' && student.currentLevel === 6 && student.heritagePoints > 0 && (
          <div style={{ marginBottom: 20, padding: 14, borderRadius: D.radius, background: D.bgGlass, border: D.glassBorder }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showHeritageDonate ? 10 : 0 }}>
              <div style={{ fontSize: 13, color: '#E8A030', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                <HeritageIcon size={13} /> 薪火传承
              </div>
              <button onClick={() => { setShowHeritageDonate(!showHeritageDonate); setHeritageRecipientId(''); setHeritageConfirm(false); }}
                style={{ padding: '3px 10px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', background: 'rgba(232,160,48,0.08)', border: '1px solid rgba(232,160,48,0.3)', color: '#E8A030', transition: 'all 0.25s ease' }}>
                {showHeritageDonate ? '收起' : '捐赠'}
              </button>
            </div>
            {showHeritageDonate && (
              <div>
                <div style={{ fontSize: 12, color: D.textMid, marginBottom: 6 }}>
                  你有 <span style={{ color: '#E8A030', fontWeight: 600 }}>{student.heritagePoints}</span> 传承值可捐赠，1传承值=帮助1名同学消除1个心魔
                </div>
                <div style={{ fontSize: 12, color: D.textMid, marginBottom: 4 }}>选择受助者（有心魔的背面同学）</div>
                {(() => {
                  const recipients = students.filter(s => s.cardSide === 'back' && s.heartDemonMarks > 0 && s.id !== student.id);
                  if (recipients.length === 0) {
                    return <div style={{ fontSize: 12, color: D.textDim }}>暂无有心魔的背面同学</div>;
                  }
                  return (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                      {recipients.map(s => (
                        <button key={s.id} onClick={() => { setHeritageRecipientId(s.id); setHeritageConfirm(false); }}
                          style={{
                            padding: '4px 10px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
                            background: heritageRecipientId === s.id ? 'rgba(139,92,138,0.2)' : D.bgCard,
                            border: heritageRecipientId === s.id ? '1px solid rgba(139,92,138,0.5)' : `1px solid ${D.border}`,
                            color: heritageRecipientId === s.id ? '#8B5C8A' : D.textMid,
                            transition: 'all 0.15s ease',
                          }}>
                          <span className="student-name">{s.name}</span> <span style={{ color: '#e07060', display: 'inline-flex', alignItems: 'center', gap: 1 }}><HeartDemonInlineIcon size={10} />{s.heartDemonMarks}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {heritageRecipientId && (() => {
                  const recipient = students.find(s => s.id === heritageRecipientId);
                  if (!recipient) return null;
                  return heritageConfirm ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: D.cinnabar }}>确认捐赠1传承值帮{recipient.name}消除1心魔？</span>
                      <button disabled={isSyncing} onClick={async () => {
                        const { donor: updatedDonor, recipient: updatedRecipient } = donateHeritage(student, recipient);
                        updateStudent(student.id, () => updatedDonor);
                        updateStudent(heritageRecipientId, () => updatedRecipient);
                        addBehaviorRecord({
                          studentId: heritageRecipientId, direction: 'positive', weight: 1 as PositiveWeight,
                          category: '品行', description: '心魔消除·薪火传承',
                          remark: `${student.name}捐赠1传承值`, recordedBy: '班主任',
                          verified: true, shieldsConsumed: 0, isHighSensitivity: false,
                          studentCardSide: 'back',
                        });
                        const synced = await syncAfterChange(`已帮${recipient.name}消除1个心魔并同步`);
                        if (synced) {
                          setShowHeritageDonate(false);
                          setHeritageConfirm(false);
                        }
                      }} style={{ padding: '4px 10px', borderRadius: D.radiusSm, fontSize: 12, cursor: isSyncing ? 'wait' : 'pointer', opacity: isSyncing ? 0.65 : 1, background: 'rgba(232,160,48,0.2)', border: '1px solid rgba(232,160,48,0.4)', color: '#E8A030', fontWeight: 500 }}>
                        {isSyncing ? '同步中' : '确认'}
                      </button>
                      <button onClick={() => setHeritageConfirm(false)} style={{ padding: '4px 10px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', background: D.bgCard, border: `1px solid ${D.border}`, color: D.textMid }}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setHeritageConfirm(true)} style={{ padding: '5px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', background: 'rgba(232,160,48,0.12)', border: '1px solid rgba(232,160,48,0.3)', color: '#E8A030', fontWeight: 500 }}>
                      确认捐赠
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Manual edit panel */}
        {canDeleteRecord && (
          <StudentEditPanel student={student} onSave={handleEditSave} />
        )}
        </>
        )}

        {activeTab === 'effects' && (
          <div style={{ marginBottom: 20 }}>
            <LevelEffects student={student} />
          </div>
        )}

        {activeTab === 'history' && (
          <>
            <BehaviorHistory student={student} onDeleteRecord={handleDeleteRecord} />

            {/* Record button — only for teacher/committee */}
            {canRecord && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => navigate(`/record?studentId=${student.id}`)}
                style={{
                  padding: '12px 32px',
                  borderRadius: D.radiusSm,
                  background: `linear-gradient(135deg, ${INK.starGoldMuted}, ${INK.starGold})`,
                  border: 'none',
                  color: INK.bgDeep,
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: D.goldGlowStrong,
                }}
              >
                <XCircle size={16} /> 记录行为
              </button>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
