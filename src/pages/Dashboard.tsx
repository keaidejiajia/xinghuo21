import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Flame, Users, BarChart3, TrendingUp, AlertCircle, CheckCircle, Play, Pause, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Download } from 'lucide-react';
import type { Student, BehaviorRecord, PositiveWeight } from '../types';
import { getLevelName, getFrontBlanks, getBackChecksRequired, getLevelOneTitle, getLevelOneTitleWeeksFromHistory, getImmortalTitle, getLevelDescription, processPositiveBehaviorFront, processPositiveBehavior, processNegativeBehavior } from '../lib/cardLogic';
import { getSeatPriority, APP_VERSION } from '../data/config';
import { useStudents, updateStudent, addBehaviorRecord } from '../lib/store';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useConfig } from '../contexts/ConfigContext';
import { useConfigUpdater } from '../contexts/ConfigContext';
import { useMobile } from '../hooks/useMobile';
import { LevelIcon, ShieldIcon, HeartDemonIcon, EclipseIcon, SparkIcon, StarEclipseStatIcon, HeartDemonStatIcon, ShieldStatIcon, FireSeedStatIcon, HeritageIcon, HeartDemonInlineIcon, FRONT_GRADIENTS, BACK_GRADIENTS, FRONT_BORDER_COLORS, BACK_BORDER_COLORS, FRONT_GLOWS, BACK_GLOWS } from '../components/LevelIcon';
import ExportModal from '../components/ExportModal';
import { MobilePage, MobileSection, MobileSegmentedControl, MobileSheet } from '../components/mobile/MobileUI';
import { D } from '../data/theme';
import { behaviorRecordLocalDate, recordLocalDate, toLocalDateStr, isTeachingDay, calcConsecutiveNoViolationDays } from '../lib/utils';
import { getLatestCompletedTeachingWeek, isAutoRuleRecordForWeek } from '../lib/autoRuleSettlement';
import LevelIllustration from '../components/LevelIllustration';
import { FLAG_DATA_URL } from '../data/flagDataUrl';

function ProgressDots({ filled, total, type }: { filled: number; total: number; type: 'front' | 'back' }) {
  const items = [];
  const capped = total;
  for (let i = 0; i < capped; i++) {
    const isFilled = i < filled;
    if (type === 'front') {
      items.push(
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          border: isFilled ? `1.5px solid ${D.gold}` : `1.5px solid ${D.border}`,
          background: isFilled ? D.goldDim : 'transparent',
          fontSize: 9, color: isFilled ? D.gold : D.textDim, fontWeight: 700,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
        }}>
          {isFilled ? <EclipseIcon size={9} /> : ''}
        </span>
      );
    } else {
      items.push(
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          border: isFilled ? `1.5px solid ${D.ember}` : `1.5px solid ${D.border}`,
          background: isFilled ? 'rgba(212,122,40,0.15)' : 'transparent',
          fontSize: 8, color: isFilled ? D.ember : D.textDim,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
        }}>
          {isFilled ? <SparkIcon size={8} /> : ''}
        </span>
      );
    }
  }
  return <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>{items}</div>;
}

function hasSettledAutoRuleForWeek(
  record: BehaviorRecord,
  ruleId: string,
  prevWeek: { weekNumber: number; startDate: string; endDate: string },
  currentWeek: { startDate: string; endDate: string },
): boolean {
  if (!record.isAutoRule) return false;
  if (record.autoRuleId === ruleId && record.settledWeek === prevWeek.weekNumber) return true;
  const remark = record.remark || '';
  if (!remark.includes(`ruleId:${ruleId}`)) return false;

  if (remark.includes(`settledWeek:${prevWeek.weekNumber}`) || remark.includes(`\u7ed3\u7b97\u7b2c${prevWeek.weekNumber}\u5468`)) {
    return true;
  }

  const recordDate = behaviorRecordLocalDate(record);

  // Legacy weekly records did not store occurredDate or settledWeek; they were created in the next week.
  return remark.includes('\u4e0a\u5468\u7ed3\u7b97') && recordDate >= currentWeek.startDate && recordDate <= currentWeek.endDate;
}

function HonorTitleBadge({ title, color, fontSize = 10, padding = '1px 7px', marginBottom = 8 }: {
  title: string;
  color: string;
  fontSize?: number;
  padding?: string;
  marginBottom?: number;
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      maxWidth: '100%',
      padding, borderRadius: D.radiusXs,
      background: `${color}15`, border: `1px solid ${color}44`,
      fontSize, fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif",
      color, marginBottom,
      position: 'relative', zIndex: 2,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>✦ {title}</span>
    </div>
  );
}

function StudentCardThumbnail({ student, records }: { student: Student; records: BehaviorRecord[] }) {
  const navigate = useNavigate();
  const config = useConfig();
  const isFront = student.cardSide === 'front';
  const lvl = student.currentLevel;
  const levelName = getLevelName(student.cardSide, lvl, config.frontLevels, config.backLevels);

  const isImmortal = !isFront && lvl === 6;
  const maxBlanks = isFront
    ? getFrontBlanks(lvl, config.frontLevels)
    : getBackChecksRequired(lvl + 1, student.heartDemonMarks, config.backLevels);
  const currentFilled = isFront
    ? student.blanksFilled
    : student.cumulativeChecks;
  const totalDots = maxBlanks;

  const gradient = isFront ? FRONT_GRADIENTS[lvl] : BACK_GRADIENTS[lvl];
  const borderColor = isFront ? FRONT_BORDER_COLORS[lvl] : BACK_BORDER_COLORS[lvl];
  const glow = isFront ? FRONT_GLOWS[lvl] : BACK_GLOWS[lvl];

  const isLevelOne = isFront && lvl === 1;
  const levelTitle = isLevelOne ? getLevelOneTitle(getLevelOneTitleWeeksFromHistory(student, records, config), config.levelOneTitles) : null;
  const totalHeritageEarned = Math.max(student.totalHeritageEarned || 0, student.heritagePoints + (student.totalHeritageDonated || 0));
  const immortalTitle = isImmortal ? getImmortalTitle(totalHeritageEarned, config.immortalTitles) : null;
  const TITLE_TIER_COLORS = ['#d4c080', '#e8c55a', '#e8a040', '#f0e8d8'];
  const titleIdx = levelTitle ? config.levelOneTitles.findIndex(t => t.name === levelTitle) : -1;
  const titleColor = titleIdx >= 0 ? TITLE_TIER_COLORS[Math.min(titleIdx, TITLE_TIER_COLORS.length - 1)] : null;
  const honorTitle = levelTitle || immortalTitle;
  const honorColor = titleColor || (immortalTitle ? '#E8A030' : null);

  return (
    <div
      onClick={() => navigate(`/card/${student.id}`)}
      style={{
        background: gradient,
        border: `1px solid ${titleColor ? `${titleColor}88` : borderColor}`,
        borderRadius: D.radius,
        padding: 14,
        cursor: 'pointer',
        transition: 'transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s cubic-bezier(.22,1,.36,1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: titleColor ? `0 0 12px ${titleColor}44, ${glow}` : glow,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = isFront
          ? `0 12px 32px rgba(212,168,83,0.3), ${D.goldGlow}`
          : `0 12px 32px rgba(196,65,37,0.3), ${D.cinnabarGlow}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = glow;
      }}
    >
      {/* Level illustration background — fills entire card */}
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none' as const,
        zIndex: 0,
      }}>
        <LevelIllustration side={student.cardSide} level={lvl} size={200} style={{ width: '100%', height: '100%', borderRadius: 0, opacity: 0.25 }} />
      </div>

      {/* Glass-like inner overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isFront
          ? 'linear-gradient(180deg, rgba(10,12,20,0.6) 0%, rgba(10,12,20,0.3) 50%, rgba(10,12,20,0.7) 100%)'
          : 'linear-gradient(180deg, rgba(20,14,18,0.6) 0%, rgba(20,14,18,0.3) 50%, rgba(20,14,18,0.7) 100%)',
        backdropFilter: 'blur(2px)',
        pointerEvents: 'none' as const,
        zIndex: 0,
        borderRadius: D.radius,
      }} />

      {/* Level icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative', zIndex: 1 }}>
        <div style={{
          animation: isFront ? 'star-twinkle 4s ease-in-out infinite' : 'ember-pulse 3s ease-in-out infinite',
        }}>
          <LevelIcon side={student.cardSide} level={lvl} size={32} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: D.textDim, marginBottom: 1, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
            #{student.number}
          </div>
          <div className="student-name" style={{
            fontSize: 15, fontWeight: 600,
            color: isFront ? D.text : D.gold,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          }}>
            {student.name}
          </div>
        </div>
        <div style={{
          padding: '2px 6px', borderRadius: D.radiusXs, fontSize: 10, fontWeight: 600,
          background: isFront ? D.goldDim : D.cinnabarDim,
          color: isFront ? D.gold : D.ember,
          flexShrink: 0,
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
        }}>
          {isFront ? <Star size={9} style={{ verticalAlign: 'middle' }} /> : <Flame size={9} style={{ verticalAlign: 'middle' }} />}
        </div>
      </div>

      {/* Level name */}
      <div style={{
        fontSize: 12, fontWeight: 500, marginBottom: 8, position: 'relative', zIndex: 1,
        color: isFront ? (lvl === 1 ? D.gold : D.silver) : D.ember,
        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
      }}>
        {levelName}
      </div>

      {/* Title badge */}
      {honorTitle && honorColor && <HonorTitleBadge title={honorTitle} color={honorColor} />}

      {/* Progress dots / Progress bar / Immortal heritage info */}
      {isImmortal ? (
        <div style={{ marginBottom: 8, position: 'relative', zIndex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#E8A030', fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif", whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2 }}><HeritageIcon size={11} /> {student.heritagePoints + student.totalHeritageDonated}</span>
          {student.heartDemonMarks > 0 && (
            <span style={{ fontSize: 11, color: '#e07060', fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif", whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2 }}><HeartDemonInlineIcon size={11} /> {student.heartDemonMarks}</span>
          )}
        </div>
      ) : totalDots > 8 ? (
        <div style={{ marginBottom: 8, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            flex: 1, height: 6, borderRadius: 3,
            background: isFront ? 'rgba(212,168,83,0.12)' : 'rgba(212,122,40,0.12)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, (currentFilled / totalDots) * 100)}%`,
              height: '100%', borderRadius: 3,
              background: isFront ? D.gold : D.ember,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
            color: isFront ? D.gold : D.ember,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          }}>
            {currentFilled}/{totalDots}
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <ProgressDots filled={currentFilled} total={totalDots} type={isFront ? 'front' : 'back'} />
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative', zIndex: 1 }}>
        {isFront && <ShieldIcon count={lvl === 1 ? student.starShields + (student.totalShieldsExchanged || 0) : student.starShields} size={14} />}
        {!isFront && !isImmortal && <HeartDemonIcon count={student.heartDemonMarks} size={14} />}
      </div>

      {/* Rise task progress bar for front level 2-6 */}
      {(() => {
        // Show consecutive no-violation days progress only for front level 2-6.
        if (!isFront || lvl < 2) return null;
        const riseTask = isFront ? config.riseTasks?.find(t => t.side === 'front' && t.level === lvl) : null;
        const daysRequired = riseTask?.riseDaysRequired ?? 5;
        const currentDays = student.consecutiveNoViolationDays;
        const progress = Math.min(100, (currentDays / daysRequired) * 100);
        const canRise = currentDays >= daysRequired;
        if (progress < 0.3 && !canRise && currentDays === 0) return null;
        return (
          <div style={{ marginTop: 6, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: canRise ? '#68c87a' : (isFront ? D.gold : D.ember), transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: 9, color: canRise ? '#68c87a' : D.textDim, whiteSpace: 'nowrap' }}>
              {currentDays}/{daysRequired}天零违纪
            </span>
          </div>
        );
      })()}

      {/* Level change glow indicator */}
      {student.lastLevelChange && !student.lastLevelChange.viewed && (() => {
        const lc = student.lastLevelChange!;
        const isStale = Date.now() - new Date(lc.timestamp).getTime() > 24 * 60 * 60 * 1000;
        const isMismatched = lc.toLevel !== student.currentLevel || lc.toSide !== student.cardSide;
        if (isStale || isMismatched) return null;
        const dir = lc.direction;
        const isDown = dir === 'down';
        const isUp = dir === 'up';
        const borderCol = isDown ? 'rgba(255,60,60,0.7)' : isUp ? 'rgba(100,220,140,0.6)' : 'rgba(255,120,40,0.7)';
        const animName = isDown ? 'downgradePulse' : isUp ? 'upgradePulse' : 'flipPulse';
        const animDur = isDown ? '0.8s' : isUp ? '1.2s' : '0.6s';
        return (
          <div style={{
            position: 'absolute', inset: -2, borderRadius: D.radius,
            border: `2px solid ${borderCol}`,
            animation: `${animName} ${animDur} ease-in-out infinite`,
            pointerEvents: 'none',
            zIndex: 2,
          }} />
        );
      })()}
    </div>
  );
}

function SparkLineChart({ data, color }: {
  data: Array<{ date: string; count: number }>;
  color: string;
  label?: string;
  icon?: React.ReactNode;
}) {
  if (data.length === 0) {
    return (
      <div style={{ width: 460, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: "'LXGW WenKai', serif" }}>
        暂无数据
      </div>
    );
  }

  const width = 460;
  const height = 220;
  const pad = { top: 24, right: 16, bottom: 36, left: 36 };
  const cW = width - pad.left - pad.right;
  const cH = height - pad.top - pad.bottom;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const yMax = Math.ceil(maxCount * 1.2) || 1;

  const points = data.map((d, i) => ({
    x: pad.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2),
    y: pad.top + cH - (d.count / yMax) * cH,
    ...d,
  }));

  const linePath = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} ${pad.top + cH} L ${points[0].x} ${pad.top + cH} Z`
    : '';

  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((yMax / yTicks) * i));

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {yTickVals.map(v => {
        const y = pad.top + cH - (v / yMax) * cH;
        return <line key={v} x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.06)" />;
      })}
      {areaPath && <path d={areaPath} fill={`${color}15`} />}
      {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
          {p.count > 0 && (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill={color} fontSize={10} fontWeight={600}>
              {p.count}
            </text>
          )}
        </g>
      ))}
      {points.map((p, i) => {
        const step = data.length > 12 ? 3 : data.length > 8 ? 2 : 1;
        if (i % step !== 0 && i !== data.length - 1) return null;
        return (
          <text key={`x${i}`} x={p.x} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={9}>
            {p.date.slice(5)}
          </text>
        );
      })}
      {yTickVals.map(v => {
        const y = pad.top + cH - (v / yMax) * cH;
        return (
          <text key={`y${v}`} x={pad.left - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={9}>
            {v}
          </text>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { students, records } = useStudents();
  const { isTeacher, canRecord } = useAuth();
  const config = useConfig();
  const isMobile = useMobile();
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideIndex, setSlideIndex] = useState(() => {
    const saved = sessionStorage.getItem('slideshow_index');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [slideSortMode, setSlideSortMode] = useState<'number' | 'level-desc' | 'level-asc'>('number');
  const [showExport, setShowExport] = useState(false);
  const [chartIndicator, setChartIndicator] = useState<{ key: string; label: string; color: string; icon: React.ReactNode } | null>(null);
  const [honorRollKey, setHonorRollKey] = useState<string | null>(null);
  const [showBehaviorOverview, setShowBehaviorOverview] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const [mobileFilter, setMobileFilter] = useState<'all' | 'front' | 'back' | 'attention'>('all');
  const { updateConfig } = useConfigUpdater();
  const toast = useToast();

  // Sorting
  type SortMode = 'number' | 'level-asc' | 'level-desc';
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    return (localStorage.getItem('app_sort_mode') as SortMode) || 'number';
  });
  const updateSortMode = (mode: SortMode) => {
    setSortMode(mode);
    localStorage.setItem('app_sort_mode', mode);
  };
  const sortedStudents = useMemo(() => {
    const base = [...students];
    if (sortMode === 'number') return base.sort((a, b) => a.number - b.number);
    return base.sort((a, b) => {
      const pa = getSeatPriority(a.cardSide, a.currentLevel, config.seatPriorityMap);
      const pb = getSeatPriority(b.cardSide, b.currentLevel, config.seatPriorityMap);
      if (pa !== pb) return sortMode === 'level-asc' ? pa - pb : pb - pa;
      // Same level tiebreaker — direction follows sortMode
      const asc = sortMode === 'level-asc'; // asc=best first, !asc=worst first
      if (a.cardSide === 'front') {
        // 星辉典范(正1)用累积护盾排名，不因兑换而降
        if (a.currentLevel === 1 && b.currentLevel === 1) {
          const shieldSumA = a.starShields + (a.totalShieldsExchanged || 0);
          const shieldSumB = b.starShields + (b.totalShieldsExchanged || 0);
          const subA = shieldSumA - a.totalBlanksEverFilled;
          const subB = shieldSumB - b.totalBlanksEverFilled;
          if (subA !== subB) return asc ? subB - subA : subA - subB;
          if (shieldSumA !== shieldSumB) return asc ? shieldSumB - shieldSumA : shieldSumA - shieldSumB;
          return asc ? b.consecutiveNoViolationDays - a.consecutiveNoViolationDays : a.consecutiveNoViolationDays - b.consecutiveNoViolationDays;
        }
        const subA = a.starShields - a.blanksFilled;
        const subB = b.starShields - b.blanksFilled;
        if (subA !== subB) return asc ? subB - subA : subA - subB;
        if (a.starShields !== b.starShields) return asc ? b.starShields - a.starShields : a.starShields - b.starShields;
        return asc ? b.consecutiveNoViolationDays - a.consecutiveNoViolationDays : a.consecutiveNoViolationDays - b.consecutiveNoViolationDays;
      } else {
        // 不朽晨辉(背6)用累积传承值排名
        if (a.currentLevel === 6 && b.currentLevel === 6) {
          const heritageSumA = a.heritagePoints + a.totalHeritageDonated;
          const heritageSumB = b.heritagePoints + b.totalHeritageDonated;
          const subA = heritageSumA - a.heartDemonMarks;
          const subB = heritageSumB - b.heartDemonMarks;
          if (subA !== subB) return asc ? subB - subA : subA - subB;
          if (heritageSumA !== heritageSumB) return asc ? heritageSumB - heritageSumA : heritageSumA - heritageSumB;
          return asc ? b.consecutiveNoViolationDays - a.consecutiveNoViolationDays : a.consecutiveNoViolationDays - b.consecutiveNoViolationDays;
        }
        const subA = a.cumulativeChecks - a.heartDemonMarks;
        const subB = b.cumulativeChecks - b.heartDemonMarks;
        if (subA !== subB) return asc ? subB - subA : subA - subB;
        if (a.cumulativeChecks !== b.cumulativeChecks) return asc ? b.cumulativeChecks - a.cumulativeChecks : a.cumulativeChecks - b.cumulativeChecks;
        return asc ? b.consecutiveNoViolationDays - a.consecutiveNoViolationDays : a.consecutiveNoViolationDays - b.consecutiveNoViolationDays;
      }
    });
  }, [students, sortMode, config.seatPriorityMap]);

  // Slideshow students with independent sort
  const slideshowStudents = useMemo(() => {
    const base = [...students];
    if (slideSortMode === 'number') return base.sort((a, b) => a.number - b.number);
    return base.sort((a, b) => {
      const pa = getSeatPriority(a.cardSide, a.currentLevel, config.seatPriorityMap);
      const pb = getSeatPriority(b.cardSide, b.currentLevel, config.seatPriorityMap);
      if (pa !== pb) return slideSortMode === 'level-desc' ? pb - pa : pa - pb;
      const asc = slideSortMode !== 'level-desc'; // asc=best first when not level-desc
      if (a.cardSide === 'front') {
        // 星辉典范(正1)用累积护盾排名
        if (a.currentLevel === 1 && b.currentLevel === 1) {
          const shieldSumA = a.starShields + (a.totalShieldsExchanged || 0);
          const shieldSumB = b.starShields + (b.totalShieldsExchanged || 0);
          const subA = shieldSumA - a.totalBlanksEverFilled;
          const subB = shieldSumB - b.totalBlanksEverFilled;
          if (subA !== subB) return asc ? subB - subA : subA - subB;
          return asc ? shieldSumB - shieldSumA : shieldSumA - shieldSumB;
        }
        const subA = a.starShields - a.blanksFilled;
        const subB = b.starShields - b.blanksFilled;
        if (subA !== subB) return asc ? subB - subA : subA - subB;
        return asc ? b.starShields - a.starShields : a.starShields - b.starShields;
      } else {
        // 不朽晨辉(背6)用累积传承值排名
        if (a.currentLevel === 6 && b.currentLevel === 6) {
          const heritageSumA = a.heritagePoints + a.totalHeritageDonated;
          const heritageSumB = b.heritagePoints + b.totalHeritageDonated;
          const subA = heritageSumA - a.heartDemonMarks;
          const subB = heritageSumB - b.heartDemonMarks;
          if (subA !== subB) return asc ? subB - subA : subA - subB;
          return asc ? heritageSumB - heritageSumA : heritageSumA - heritageSumB;
        }
        const subA = a.cumulativeChecks - a.heartDemonMarks;
        const subB = b.cumulativeChecks - b.heartDemonMarks;
        if (subA !== subB) return asc ? subB - subA : subA - subB;
        return asc ? b.cumulativeChecks - a.cumulativeChecks : a.cumulativeChecks - b.cumulativeChecks;
      }
    });
  }, [students, slideSortMode, config.seatPriorityMap]);

  // Persist slideIndex to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('slideshow_index', String(slideIndex));
  }, [slideIndex]);

  // Auto-play slideshow
  useEffect(() => {
    if (!isAutoPlaying || !showSlideshow) return;
    if (slideIndex >= slideshowStudents.length - 1) { setIsAutoPlaying(false); return; }
    const timer = setTimeout(() => setSlideIndex(prev => prev + 1), 3000);
    return () => clearTimeout(timer);
  }, [isAutoPlaying, showSlideshow, slideIndex, slideshowStudents.length]);

  // Daily settlement: recalculate consecutiveNoViolationDays from records (idempotent, self-correcting)
  useEffect(() => {
    const today = toLocalDateStr();
    const lastSettle = localStorage.getItem('app_last_settle_date');
    if (lastSettle === today) return;

    // Non-teaching day: only mark as settled, don't recalculate
    if (!isTeachingDay(today, config.teachingWeeks)) {
      localStorage.setItem('app_last_settle_date', today);
      return;
    }

    students.forEach(s => {
      const correctCount = calcConsecutiveNoViolationDays(s.id, s.createdAt, records, config.teachingWeeks, today);
      if (s.consecutiveNoViolationDays !== correctCount) {
        updateStudent(s.id, prev => ({ ...prev, consecutiveNoViolationDays: correctCount, updatedAt: new Date().toISOString() }));
      }
    });
    localStorage.setItem('app_last_settle_date', today);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Weekly settlement: auto-rules (reward + penalty)
  useEffect(() => {
    const today = toLocalDateStr();
    const legacyWeeklySettlementDisabled = localStorage.getItem('__xinghuo_run_legacy_weekly_settlement__') !== '1';
    if (legacyWeeklySettlementDisabled) return;
    // Find current teaching week
    const currentWeek = config.teachingWeeks.find(w => today >= w.startDate && today <= w.endDate);
    if (!currentWeek) return;

    const currentWeekNum = currentWeek.weekNumber;
    const lastSettledWeek = parseInt(localStorage.getItem('app_last_week_settle') || '0', 10);
    if (lastSettledWeek >= currentWeekNum) return; // Already settled this week or later

    // Settle the previous week on first visit of each new week
    const prevWeek = config.teachingWeeks.find(w => w.weekNumber === currentWeekNum - 1);
    if (!prevWeek) {
      localStorage.setItem('app_last_week_settle', String(currentWeekNum));
      return;
    }

    // Mark as settled IMMEDIATELY to prevent re-entry
    localStorage.setItem('app_last_week_settle', String(currentWeekNum));

    // Execute auto-rules for the previous week
    // Track accumulated student state across rules to prevent stale reference overwrites
    const studentMap = new Map<string, Student>();
    students.forEach(s => studentMap.set(s.id, s));

    const activeRules = config.autoRules.filter(r => r.isActive);
    for (const rule of activeRules) {
      for (const origStudent of students) {
        const student = studentMap.get(origStudent.id)!;

        // Idempotency: skip if this rule already triggered for this student for prevWeek
        const alreadySettled = records.some(r =>
          r.studentId === student.id &&
          hasSettledAutoRuleForWeek(r, rule.id, prevWeek, currentWeek)
        );
        if (alreadySettled) continue;

        let triggered = false;

        switch (rule.triggerCondition.type) {
          case 'weekly_no_behavior': {
            if (rule.triggerCondition.behaviorId) {
              const allBehaviors = [...config.negativeBehaviors, ...config.positiveBehaviors];
              const behavior = allBehaviors.find(b => b.id === rule.triggerCondition.behaviorId);
              if (!behavior) break;
              const weekCount = records.filter(r =>
                r.studentId === student.id &&
                r.direction === behavior.direction &&
                r.description === behavior.name &&
                !r.isAutoRule &&
                behaviorRecordLocalDate(r) >= prevWeek.startDate &&
                behaviorRecordLocalDate(r) <= prevWeek.endDate
              ).length;
              triggered = weekCount === 0;
            } else {
              const weekNegatives = records.filter(r =>
                r.studentId === student.id &&
                r.direction === 'negative' &&
                !r.isAutoRule &&
                behaviorRecordLocalDate(r) >= prevWeek.startDate &&
                behaviorRecordLocalDate(r) <= prevWeek.endDate
              );
              triggered = weekNegatives.length === 0;
            }
            break;
          }
          case 'weekly_behavior_count': {
            const allBehaviors = [...config.negativeBehaviors, ...config.positiveBehaviors];
            const behavior = allBehaviors.find(b => b.id === rule.triggerCondition.behaviorId);
            if (!behavior) break;
            const weekCount = records.filter(r =>
              r.studentId === student.id &&
              r.direction === behavior.direction &&
              r.description === behavior.name &&
              !r.isAutoRule &&
              behaviorRecordLocalDate(r) >= prevWeek.startDate &&
              behaviorRecordLocalDate(r) <= prevWeek.endDate
            ).length;
            triggered = weekCount >= (rule.triggerCondition.threshold ?? 3);
            break;
          }
          default:
            break;
        }

        if (triggered) {
          const amount = rule.effectAmount;
          if (rule.effectType === 'blankAndHeartDemon') {
            if (student.cardSide === 'front') {
              const { student: updated, shieldsConsumed: sc } = processNegativeBehavior(student, amount, student.starShields, config.shieldOffsetRatio, config.frontLevels, config.backLevels, config.immortalDemotionThreshold);
              studentMap.set(student.id, updated);
              updateStudent(student.id, () => updated);
              const behavior = [...config.negativeBehaviors].find(b => b.id === rule.triggerCondition.behaviorId);
              addBehaviorRecord({
                studentId: student.id,
                direction: 'negative',
                weight: amount as any,
                category: behavior?.category || '纪律',
                description: `自动规则：${rule.name.split(' → ')[0]}`,
                autoRuleId: rule.id,
                settledWeek: prevWeek.weekNumber,
                occurredDate: prevWeek.endDate,
                recordedBy: '系统',
                verified: true,
                shieldsConsumed: sc,
                isHighSensitivity: false,
                studentCardSide: 'front',
                isAutoRule: true,
              });
            } else {
              const updated = { ...student, heartDemonMarks: student.heartDemonMarks + 1, totalHeartDemonsEverGained: student.totalHeartDemonsEverGained + 1, updatedAt: new Date().toISOString() };
              studentMap.set(student.id, updated);
              updateStudent(student.id, () => updated);
              addBehaviorRecord({
                studentId: student.id,
                direction: 'negative',
                weight: 1 as any,
                category: '品行',
                description: `自动规则：${rule.name.split(' → ')[0]}`,
                autoRuleId: rule.id,
                settledWeek: prevWeek.weekNumber,
                occurredDate: prevWeek.endDate,
                recordedBy: '系统',
                verified: true,
                shieldsConsumed: 0,
                isHighSensitivity: false,
                studentCardSide: 'back',
                isAutoRule: true,
              });
            }
          } else {
            // shieldAndEmber: reward (front=shields, back=fire seeds)
            if (student.cardSide === 'front') {
              const { student: updated } = processPositiveBehaviorFront(student, amount);
              studentMap.set(student.id, updated);
              updateStudent(student.id, () => updated);
              addBehaviorRecord({
                studentId: student.id,
                direction: 'positive',
                weight: amount as PositiveWeight,
                category: '品行',
                description: `自动规则：${rule.name.split(' → ')[0]}`,
                autoRuleId: rule.id,
                settledWeek: prevWeek.weekNumber,
                occurredDate: prevWeek.endDate,
                recordedBy: '系统',
                verified: true,
                shieldsConsumed: 0,
                isHighSensitivity: false,
                studentCardSide: 'front',
                isAutoRule: true,
              });
            } else {
              const { student: updated } = processPositiveBehavior(student, amount, config.backLevels, config.heartDemonClearRules);
              studentMap.set(student.id, updated);
              updateStudent(student.id, () => updated);
              addBehaviorRecord({
                studentId: student.id,
                direction: 'positive',
                weight: amount as PositiveWeight,
                category: '品行',
                description: `自动规则：${rule.name.split(' → ')[0]}`,
                autoRuleId: rule.id,
                settledWeek: prevWeek.weekNumber,
                occurredDate: prevWeek.endDate,
                recordedBy: '系统',
                verified: true,
                shieldsConsumed: 0,
                isHighSensitivity: false,
                studentCardSide: 'back',
                isAutoRule: true,
              });
            }
          }
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Completed-week settlement: positive weekly rewards are derived after a teaching week ends.
  useEffect(() => {
    const today = toLocalDateStr();
    const completedWeeks = config.teachingWeeks
      .filter(week => week.endDate < today)
      .sort((a, b) => a.weekNumber - b.weekNumber);
    if (completedWeeks.length === 0) return;

    const latestCompletedWeek = getLatestCompletedTeachingWeek(config.teachingWeeks, today);
    if (latestCompletedWeek) {
      localStorage.setItem('app_last_week_settle', String(latestCompletedWeek.weekNumber));
    }

    const rewardRules = config.autoRules.filter(rule =>
      rule.isActive &&
      rule.effectType === 'shieldAndEmber' &&
      rule.triggerCondition.type === 'weekly_no_behavior'
    );
    if (rewardRules.length === 0) return;

    const studentMap = new Map<string, Student>();
    students.forEach(student => studentMap.set(student.id, student));

    for (const settledWeek of completedWeeks) {
      for (const rule of rewardRules) {
        const targetBehavior = rule.triggerCondition.behaviorId
          ? [...config.negativeBehaviors, ...config.positiveBehaviors].find(behavior => behavior.id === rule.triggerCondition.behaviorId)
          : undefined;
        if (rule.triggerCondition.behaviorId && !targetBehavior) continue;

        for (const originalStudent of students) {
          const student = studentMap.get(originalStudent.id);
          if (!student) continue;
          if (recordLocalDate(student.createdAt) > settledWeek.endDate) continue;

          const alreadySettled = records.some(record =>
            record.studentId === student.id &&
            isAutoRuleRecordForWeek(record, rule.id, settledWeek, config.teachingWeeks)
          );
          if (alreadySettled) continue;

          const blockingRecords = records.filter(record => {
            if (
              record.studentId !== student.id ||
              record.isAutoRule ||
              behaviorRecordLocalDate(record) < settledWeek.startDate ||
              behaviorRecordLocalDate(record) > settledWeek.endDate
            ) {
              return false;
            }
            if (!targetBehavior) return record.direction === 'negative';
            return record.direction === targetBehavior.direction && record.description === targetBehavior.name;
          });
          if (blockingRecords.length > 0) continue;

          const amount = rule.effectAmount;
          const description = `自动规则：${rule.name.split('→')[0].trim()}`;
          if (student.cardSide === 'front') {
            const { student: updated } = processPositiveBehaviorFront(student, amount);
            studentMap.set(student.id, updated);
            updateStudent(student.id, () => updated);
            addBehaviorRecord({
              studentId: student.id,
              direction: 'positive',
              weight: amount as PositiveWeight,
              category: '品行',
              description,
              autoRuleId: rule.id,
              settledWeek: settledWeek.weekNumber,
              occurredDate: settledWeek.endDate,
              recordedBy: '系统',
              verified: true,
              shieldsConsumed: 0,
              isHighSensitivity: false,
              studentCardSide: 'front',
              isAutoRule: true,
            });
          } else {
            const { student: updated } = processPositiveBehavior(student, amount, config.backLevels, config.heartDemonClearRules);
            studentMap.set(student.id, updated);
            updateStudent(student.id, () => updated);
            addBehaviorRecord({
              studentId: student.id,
              direction: 'positive',
              weight: amount as PositiveWeight,
              category: '品行',
              description,
              autoRuleId: rule.id,
              settledWeek: settledWeek.weekNumber,
              occurredDate: settledWeek.endDate,
              recordedBy: '系统',
              verified: true,
              shieldsConsumed: 0,
              isHighSensitivity: false,
              studentCardSide: 'back',
              isAutoRule: true,
            });
          }
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const frontCount = students.filter((s) => s.cardSide === 'front').length;
  const backCount = students.filter((s) => s.cardSide === 'back').length;

  // ===== 共用工具：获取记录时学生的卡面 =====
  const getSide = (r: BehaviorRecord): 'front' | 'back' | undefined => {
    if (r.studentCardSide) return r.studentCardSide;
    return students.find(s => s.id === r.studentId)?.cardSide;
  };

  // ===== 4个事件型指标的统一定义 =====
  type IndicatorKey = 'negWeight1' | 'heartDemon' | 'shield' | 'fireSeed';
  const indicatorDefs: Record<IndicatorKey, {
    label: string; icon: React.ReactNode; color: string;
    historyFn: () => number;
    currentFn: () => number;
    filter: (r: BehaviorRecord) => boolean;
    aggregate: (recs: BehaviorRecord[]) => number;
  }> = {
    negWeight1: {
      label: '星蚀总数', icon: <StarEclipseStatIcon size={20} />, color: D.cinnabar,
      historyFn: () => students.reduce((sum, s) => sum + s.totalBlanksEverFilled, 0),
      currentFn: () => students.filter(s => s.cardSide === 'front').reduce((sum, s) => sum + s.blanksFilled, 0),
      filter: (r) => r.direction === 'negative' && getSide(r) === 'front',
      aggregate: (recs) => recs.reduce((sum: number, r: BehaviorRecord) => sum + (r.weight as number) - Math.floor((r.shieldsConsumed ?? 0) / 2), 0),
    },
    heartDemon: {
      label: '心魔印记总数', icon: <HeartDemonStatIcon size={20} />, color: '#8B5C8A',
      historyFn: () => students.reduce((sum, s) => sum + s.totalHeartDemonsEverGained, 0),
      currentFn: () => students.filter(s => s.cardSide === 'back').reduce((sum, s) => sum + s.heartDemonMarks, 0),
      filter: (r) => r.direction === 'negative' && getSide(r) === 'back',
      aggregate: (recs) => recs.length,
    },
    shield: {
      label: '护盾总数', icon: <ShieldStatIcon size={20} />, color: D.blue,
      historyFn: () => students.reduce((sum, s) => sum + s.totalShieldsEverEarned, 0),
      currentFn: () => students.filter(s => s.cardSide === 'front').reduce((sum, s) => sum + s.starShields, 0),
      filter: (r) => r.direction === 'positive' && getSide(r) === 'front' && !r.description.startsWith('完成回升任务'),
      aggregate: (recs) => recs.reduce((sum: number, r: BehaviorRecord) => sum + (r.weight as number), 0),
    },
    fireSeed: {
      label: '火种总数', icon: <FireSeedStatIcon size={20} />, color: '#D47A28',
      historyFn: () => students.reduce((sum, s) => sum + s.totalChecksEverEarned, 0),
      currentFn: () => students.filter(s => s.cardSide === 'back').reduce((sum, s) => sum + s.cumulativeChecks, 0),
      filter: (r) => r.direction === 'positive' && getSide(r) === 'back' && !r.description.includes('心魔消除'),
      aggregate: (recs) => recs.reduce((sum: number, r: BehaviorRecord) => sum + (r.weight as number), 0),
    },
  };

  const teacherStats = useMemo(() => {
    const frontLevels: Record<string, number> = {};
    const backLevels: Record<string, number> = {};
    for (const s of students) {
      const key = getLevelName(s.cardSide, s.currentLevel, config.frontLevels, config.backLevels);
      if (s.cardSide === 'front') frontLevels[key] = (frontLevels[key] ?? 0) + 1;
      else backLevels[key] = (backLevels[key] ?? 0) + 1;
    }
    const negRecords = records.filter(r => r.direction === 'negative' && !r.isAutoRule);
    const posRecords = records.filter(r => r.direction === 'positive' && !r.description.includes('反选') && !r.isAutoRule);
    const behaviorCounts: Record<string, { name: string; count: number }> = {};
    for (const r of negRecords) {
      const key = r.description;
      if (!behaviorCounts[key]) behaviorCounts[key] = { name: key, count: 0 };
      behaviorCounts[key].count++;
    }
    const topViolations = Object.values(behaviorCounts).sort((a, b) => b.count - a.count).slice(0, 5);
    const posBehaviorCounts: Record<string, { name: string; count: number }> = {};
    for (const r of posRecords) {
      const key = r.description;
      if (!posBehaviorCounts[key]) posBehaviorCounts[key] = { name: key, count: 0 };
      posBehaviorCounts[key].count++;
    }
    const topPositive = Object.values(posBehaviorCounts).sort((a, b) => b.count - a.count).slice(0, 5);
    const studentsWithNeg = new Set(negRecords.map(r => r.studentId));
    const zeroViolationCount = students.filter(s => !studentsWithNeg.has(s.id)).length;

    // 细分统计（使用indicatorDefs.historyFn从学生累计字段计算，确保历史>=当前）
    const negWeight1Count = indicatorDefs.negWeight1.historyFn();
    const heartDemonRecordCount = indicatorDefs.heartDemon.historyFn();
    const shieldRecordCount = indicatorDefs.shield.historyFn();
    const fireSeedRecordCount = indicatorDefs.fireSeed.historyFn();
    const starParadigmCount = students.filter(s => s.cardSide === 'front' && s.currentLevel === 1).length;
    const immortalDawnCount = students.filter(s => s.cardSide === 'back' && s.currentLevel === 6).length;

    return { frontLevels, backLevels, negCount: negRecords.length, posCount: posRecords.length, topViolations, topPositive, zeroViolationCount, negWeight1Count, heartDemonRecordCount, shieldRecordCount, fireSeedRecordCount, starParadigmCount, immortalDawnCount };
  }, [students, records]);

  // ===== 行为频次总览数据 =====
  const behaviorOverviewData = useMemo(() => {
    const allBehaviors = [...config.negativeBehaviors, ...config.positiveBehaviors];
    const behaviorRecordCounts: Record<string, number> = {};
    for (const r of records.filter(r => !r.isAutoRule)) {
      const key = r.description;
      behaviorRecordCounts[key] = (behaviorRecordCounts[key] ?? 0) + 1;
    }
    const categories: Record<string, { name: string; direction: 'positive' | 'negative'; count: number; behaviorId: string; weight: number; extraWeight: number }[]> = {};
    const positiveBehaviorCounts: { name: string; count: number; behaviorId: string; weight: number }[] = [];
    for (const b of allBehaviors) {
      const cat = b.category;
      if (!categories[cat]) categories[cat] = [];
      const count = behaviorRecordCounts[b.name] ?? 0;
      categories[cat].push({ name: b.name, direction: b.direction as 'positive' | 'negative', count, behaviorId: b.id, weight: b.weight as number, extraWeight: b.extraWeight ?? 0 });
      if (b.direction === 'positive') {
        positiveBehaviorCounts.push({ name: b.name, count, behaviorId: b.id, weight: b.weight as number });
      }
    }
    const leastUsedPositive = positiveBehaviorCounts.length > 0
      ? positiveBehaviorCounts.reduce((min, b) => b.count < min.count ? b : min, positiveBehaviorCounts[0])
      : null;
    return { categories, leastUsedPositive };
  }, [config.negativeBehaviors, config.positiveBehaviors, records]);

  const handleIncreaseExtraWeight = useCallback((behaviorId: string, direction: 'positive' | 'negative') => {
    const list = direction === 'positive' ? config.positiveBehaviors : config.negativeBehaviors;
    const target = list.find(b => b.id === behaviorId);
    if (!target) return;
    const newExtra = (target.extraWeight ?? 0) + 1;
    const effectiveWeight = (target.weight as number) + newExtra;
    toast.showToast(`"${target.name}" 额外权重 +1，有效权重：${effectiveWeight}`);
    updateConfig(prev => {
      const prevList = direction === 'positive' ? prev.positiveBehaviors : prev.negativeBehaviors;
      return {
        ...prev,
        [direction === 'positive' ? 'positiveBehaviors' : 'negativeBehaviors']: prevList.map(b =>
          b.id === behaviorId ? { ...b, extraWeight: (b.extraWeight ?? 0) + 1 } : b
        ),
      };
    });
  }, [updateConfig, config, toast]);

  const handleDecreaseExtraWeight = useCallback((behaviorId: string, direction: 'positive' | 'negative') => {
    const list = direction === 'positive' ? config.positiveBehaviors : config.negativeBehaviors;
    const target = list.find(b => b.id === behaviorId);
    if (!target || (target.extraWeight ?? 0) <= 0) return;
    const newExtra = (target.extraWeight ?? 0) - 1;
    const effectiveWeight = (target.weight as number) + newExtra;
    toast.showToast(`"${target.name}" 额外权重 -1，有效权重：${effectiveWeight}`);
    updateConfig(prev => {
      const prevList = direction === 'positive' ? prev.positiveBehaviors : prev.negativeBehaviors;
      return {
        ...prev,
        [direction === 'positive' ? 'positiveBehaviors' : 'negativeBehaviors']: prevList.map(b =>
          b.id === behaviorId ? { ...b, extraWeight: Math.max(0, (b.extraWeight ?? 0) - 1) } : b
        ),
      };
    });
  }, [updateConfig, config, toast]);

  // ===== 折线图数据 =====
  const chartData = useMemo(() => {
    if (!chartIndicator) return null;
    const def = indicatorDefs[chartIndicator.key as IndicatorKey];
    if (!def) return null;

    // 获取教学日列表
    const today = toLocalDateStr();
    const tw = config.teachingWeeks;
    const teachingDays: string[] = [];
    if (tw && tw.length > 0) {
      for (const w of tw) {
        const start = new Date(w.startDate);
        const end = new Date(w.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          teachingDays.push(toLocalDateStr(d));
        }
      }
      // 追加今天（保证周末也能在图表中显示）
      if (!teachingDays.includes(today)) {
        teachingDays.push(today);
      }
    } else {
      // 回退：最近21个自然日
      const todayDate = new Date();
      for (let i = 20; i >= 0; i--) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        teachingDays.push(d.toISOString().slice(0, 10));
      }
    }

    // 只取到今天为止的教学日，再取最近15个
    const recentDays = teachingDays.sort().filter(d => d <= today).slice(-15);

    // 按日聚合（使用indicatorDefs.aggregate确保与dashboard统计一致）
    return recentDays.map(day => {
      const dayRecords = records.filter(r => def.filter(r) && behaviorRecordLocalDate(r) === day);
      return { date: day, count: def.aggregate(dayRecords) };
    });
  }, [chartIndicator, records, students, config.teachingWeeks]);

  const mobileStudents = useMemo(() => {
    const query = mobileSearch.trim().toLowerCase();
    return sortedStudents.filter(student => {
      if (mobileFilter === 'front' && student.cardSide !== 'front') return false;
      if (mobileFilter === 'back' && student.cardSide !== 'back') return false;
      if (mobileFilter === 'attention') {
        const needsAttention =
          student.cardSide === 'back' ||
          student.currentLevel >= 5 ||
          student.blanksFilled > 0 ||
          student.heartDemonMarks > 0 ||
          !!(student.lastLevelChange && !student.lastLevelChange.viewed);
        if (!needsAttention) return false;
      }
      if (!query) return true;
      return student.name.toLowerCase().includes(query) || String(student.number).includes(query);
    });
  }, [mobileFilter, mobileSearch, sortedStudents]);

  if (isMobile) {
    const frontCount = students.filter(student => student.cardSide === 'front').length;
    const backCount = students.length - frontCount;
    const todayRecordCount = records.filter(record => behaviorRecordLocalDate(record) === toLocalDateStr()).length;
    const urgentCount = students.filter(student => student.cardSide === 'back' || student.currentLevel >= 5 || student.heartDemonMarks > 0).length;
    const statItems = [
      { label: '全班', value: students.length, color: D.gold },
      { label: '正面', value: frontCount, color: D.blue },
      { label: '背面', value: backCount, color: D.ember },
      { label: '今日记录', value: todayRecordCount, color: D.success },
    ];

    return (
      <MobilePage>
        <MobileSection>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
            {statItems.map(item => (
              <div key={item.label} style={{ minHeight: 58, borderRadius: D.radiusXs, background: 'rgba(255,255,255,0.035)', border: `1px solid ${D.border}`, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: item.color, lineHeight: 1.1 }}>{item.value}</div>
                <div style={{ fontSize: 10, color: D.textDim, marginTop: 5, whiteSpace: 'nowrap' }}>{item.label}</div>
              </div>
            ))}
          </div>
          {isTeacher && (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => setChartIndicator({ key: 'negWeight1', label: '星蚀总数', color: D.cinnabar, icon: <StarEclipseStatIcon size={14} color={D.cinnabar} /> })}
                style={{ minHeight: 42, borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: D.cinnabarDim, color: D.cinnabar, fontSize: 12, fontWeight: 700, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}
              >
                星蚀累计 {teacherStats.negWeight1Count}
              </button>
              <button
                type="button"
                onClick={() => setChartIndicator({ key: 'heartDemon', label: '心魔印记总数', color: '#8B5C8A', icon: <HeartDemonStatIcon size={14} color="#8B5C8A" /> })}
                style={{ minHeight: 42, borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: 'rgba(139,92,138,0.14)', color: '#b985b7', fontSize: 12, fontWeight: 700, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}
              >
                心魔累计 {teacherStats.heartDemonRecordCount}
              </button>
            </div>
          )}
          {canRecord && (
            <button
              type="button"
              onClick={() => setShowSlideshow(true)}
              style={{
                width: '100%',
                minHeight: 42,
                marginTop: 10,
                borderRadius: D.radiusXs,
                border: `1px solid ${D.borderGlow}`,
                background: D.goldDim,
                color: D.gold,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Play size={14} /> 逐个展示
            </button>
          )}
        </MobileSection>

        <MobileSection title="学生检索" subtitle={`当前筛出 ${mobileStudents.length} 人，重点关注 ${urgentCount} 人`}>
          <input
            value={mobileSearch}
            onChange={event => setMobileSearch(event.target.value)}
            placeholder="搜索姓名或序号"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              height: 42,
              borderRadius: D.radiusXs,
              border: `1px solid ${D.border}`,
              background: D.bgInput,
              color: D.text,
              padding: '0 12px',
              outline: 'none',
              fontSize: 14,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              marginBottom: 8,
            }}
          />
          <MobileSegmentedControl
            value={mobileFilter}
            onChange={setMobileFilter}
            columns={4}
            options={[
              { value: 'all', label: '全部', tone: 'gold' },
              { value: 'front', label: '正面', tone: 'blue' },
              { value: 'back', label: '背面', tone: 'red' },
              { value: 'attention', label: '关注', tone: 'green' },
            ]}
          />
        </MobileSection>

        <MobileSection title="学生卡片">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {mobileStudents.map(student => {
              const isFront = student.cardSide === 'front';
              const levelName = getLevelName(student.cardSide, student.currentLevel, config.frontLevels, config.backLevels);
              const accent = isFront ? D.blue : D.ember;
              const progressTotal = isFront
                ? Math.max(1, getFrontBlanks(student.currentLevel, config.frontLevels))
                : Math.max(1, getBackChecksRequired(student.currentLevel + 1, student.heartDemonMarks, config.backLevels));
              const progressNow = isFront ? student.blanksFilled : student.cumulativeChecks;
              const progress = Math.min(100, (progressNow / progressTotal) * 100);
              const isLevelOne = isFront && student.currentLevel === 1;
              const isImmortal = !isFront && student.currentLevel === 6;
              const levelTitle = isLevelOne ? getLevelOneTitle(getLevelOneTitleWeeksFromHistory(student, records, config), config.levelOneTitles) : null;
              const totalHeritageEarned = Math.max(student.totalHeritageEarned || 0, student.heritagePoints + (student.totalHeritageDonated || 0));
              const immortalTitle = isImmortal ? getImmortalTitle(totalHeritageEarned, config.immortalTitles) : null;
              const TITLE_TIER_COLORS = ['#d4c080', '#e8c55a', '#e8a040', '#f0e8d8'];
              const titleIdx = levelTitle ? config.levelOneTitles.findIndex(t => t.name === levelTitle) : -1;
              const titleColor = titleIdx >= 0 ? TITLE_TIER_COLORS[Math.min(titleIdx, TITLE_TIER_COLORS.length - 1)] : null;
              const honorTitle = levelTitle || immortalTitle;
              const honorColor = titleColor || (immortalTitle ? '#E8A030' : null);
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => navigate(`/card/${student.id}`)}
                  style={{
                    width: '100%',
                    minHeight: 70,
                    textAlign: 'left',
                    borderRadius: D.radiusSm,
                    border: `1px solid ${student.lastLevelChange && !student.lastLevelChange.viewed ? D.borderGlow : D.border}`,
                    background: isFront ? 'rgba(123,139,181,0.07)' : 'rgba(212,122,40,0.08)',
                    padding: 10,
                    display: 'grid',
                    gridTemplateColumns: '38px minmax(0, 1fr)',
                    gap: 10,
                    cursor: 'pointer',
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: D.radiusXs, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.24)' }}>
                    <LevelIcon side={student.cardSide} level={student.currentLevel} size={30} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                          <span className="student-name" style={{ fontSize: 15, fontWeight: 800, color: D.text }}>{student.name}</span>
                          <span style={{ fontSize: 11, color: D.textDim }}>#{student.number}</span>
                        </div>
                        <div style={{ fontSize: 12, color: accent, marginTop: 2, overflowWrap: 'break-word' }}>
                          {isFront ? '正面' : '背面'} L{student.currentLevel} · {levelName}
                        </div>
                        {honorTitle && honorColor && (
                          <div style={{ marginTop: 4, maxWidth: '100%' }}>
                            <HonorTitleBadge title={honorTitle} color={honorColor} fontSize={10} padding="1px 6px" marginBottom={0} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, maxWidth: 96 }}>
                        {isFront && student.starShields > 0 && <span style={{ fontSize: 10, color: D.blue, background: D.blueDim, borderRadius: 3, padding: '2px 5px' }}>护盾{student.starShields}</span>}
                        {student.heartDemonMarks > 0 && <span style={{ fontSize: 10, color: D.cinnabar, background: D.cinnabarDim, borderRadius: 3, padding: '2px 5px' }}>心魔{student.heartDemonMarks}</span>}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: accent, borderRadius: 99 }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </MobileSection>

        <MobileSheet open={!!chartIndicator && !!chartData} title={chartIndicator ? `${chartIndicator.label}趋势` : ''} onClose={() => setChartIndicator(null)}>
          {chartIndicator && chartData && (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <SparkLineChart data={chartData} color={chartIndicator.color} label={chartIndicator.label} icon={chartIndicator.icon} />
            </div>
          )}
        </MobileSheet>

        <MobileSheet open={!!honorRollKey} title={honorRollKey === 'starParadigm' ? '星辉典范' : '不朽晨辉'} onClose={() => setHonorRollKey(null)}>
          {(() => {
            const isStar = honorRollKey === 'starParadigm';
            const honorStudents = isStar
              ? students.filter(student => student.cardSide === 'front' && student.currentLevel === 1)
              : students.filter(student => student.cardSide === 'back' && student.currentLevel === 6);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 6 }}>
                {honorStudents.map(student => (
                  <button key={student.id} type="button" onClick={() => navigate(`/card/${student.id}`)} className="student-name" style={{ padding: '9px 4px', borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: D.bgCard, color: D.text, fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    {student.name}
                  </button>
                ))}
              </div>
            );
          })()}
        </MobileSheet>

        <AnimatePresence>
          {showExport && (
            <ExportModal
              students={students}
              records={records}
              onClose={() => setShowExport(false)}
            />
          )}
        </AnimatePresence>
      </MobilePage>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', fontFamily: "'LXGW WenKai', 'Cinzel', serif", background: 'transparent' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: D.radiusSm,
            background: D.bgCard,
            backdropFilter: D.glassBlur,
            border: D.glassBorder,
            boxShadow: D.goldGlow,
          }}>
            <Users size={22} color={D.gold} />
          </div>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '1px',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              background: `linear-gradient(135deg, ${D.gold}, ${D.flameGold})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 16px rgba(212,168,83,0.35))',
            }}>
              星火燎原
              <span style={{ fontSize: 11, color: D.textDim, marginLeft: 10, fontFamily: "'Cinzel', serif", WebkitTextFillColor: D.textDim, background: 'none' }}>v{APP_VERSION}</span>
            </h1>
            <p style={{ fontSize: 13, color: D.textDim, margin: 0, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              星光21班班级管理系统
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            padding: '8px 16px', borderRadius: D.radiusSm,
            background: D.bgCard, backdropFilter: D.glassBlur,
            border: `1px solid ${D.borderGlow}`,
            fontSize: 13, color: D.gold, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            transition: 'box-shadow 0.2s, border-color 0.2s',
            boxShadow: '0 0 0 rgba(212,168,83,0)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.boxShadow = D.goldGlow;
            el.style.borderColor = 'rgba(212,168,83,0.3)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.boxShadow = '0 0 0 rgba(212,168,83,0)';
            el.style.borderColor = D.borderGlow;
          }}
          >
            <Star size={14} /> 正面 {frontCount} 人
          </div>
          <div style={{
            padding: '8px 16px', borderRadius: D.radiusSm,
            background: D.bgCard, backdropFilter: D.glassBlur,
            border: `1px solid ${D.cinnabarDim}`,
            fontSize: 13, color: D.ember, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            transition: 'box-shadow 0.2s, border-color 0.2s',
            boxShadow: '0 0 0 rgba(196,65,37,0)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.boxShadow = D.cinnabarGlow;
            el.style.borderColor = 'rgba(196,65,37,0.3)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.boxShadow = '0 0 0 rgba(196,65,37,0)';
            el.style.borderColor = D.cinnabarDim;
          }}
          >
            <Flame size={14} /> 背面 {backCount} 人
          </div>
          {canRecord && (
            <>
              <button
                onClick={() => setShowSlideshow(true)}
                style={{
                  padding: '8px 16px', borderRadius: D.radiusSm,
                  background: D.bgCard, backdropFilter: D.glassBlur,
                  border: `1px solid ${D.borderGlow}`,
                  fontSize: 13, color: D.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  boxShadow: '0 0 0 rgba(212,168,83,0)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.boxShadow = D.goldGlow;
                  el.style.borderColor = 'rgba(212,168,83,0.3)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.boxShadow = '0 0 0 rgba(212,168,83,0)';
                  el.style.borderColor = D.borderGlow;
                }}
              >
                <Play size={14} /> 逐个展示
              </button>
              {isTeacher && (
              <button
                onClick={() => setShowExport(true)}
                style={{
                  padding: '8px 16px', borderRadius: D.radiusSm,
                  background: D.bgCard, backdropFilter: D.glassBlur,
                  border: `1px solid ${D.blueDim}`,
                  fontSize: 13, color: D.blue, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  boxShadow: '0 0 0 rgba(123,139,181,0)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.boxShadow = '0 0 16px rgba(123,139,181,0.25)';
                  el.style.borderColor = 'rgba(123,139,181,0.3)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.boxShadow = '0 0 0 rgba(123,139,181,0)';
                  el.style.borderColor = D.blueDim;
                }}
              >
                <Download size={14} /> 导出数据
              </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Teacher stats — Bento Grid */}
      {isTeacher && (
        <div style={{ maxWidth: 1200, margin: '0 auto 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <BarChart3 size={18} style={{ color: D.gold }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: D.text, margin: 0, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>统计面板</h3>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}>
            {/* Front level distribution */}
            <div style={{
              gridColumn: 'span 1',
              background: D.bgCard,
              backdropFilter: D.glassBlur,
              borderRadius: D.radius,
              border: D.glassBorder,
              padding: 20,
              transition: 'background 0.2s, box-shadow 0.2s',
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = D.bgCardHover;
              el.style.boxShadow = D.goldGlow;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = D.bgCard;
              el.style.boxShadow = 'none';
            }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: D.textMid, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                <Star size={14} color={D.gold} /> 正面等级分布
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
                {config.frontLevels.map(lvl => {
                  const count = teacherStats.frontLevels[lvl.name] ?? 0;
                  const pct = students.length > 0 ? (count / students.length) * 100 : 0;
                  return (
                    <div key={lvl.level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: D.textDim, width: 70, flexShrink: 0, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{lvl.name}</span>
                      <div style={{ flex: 1, height: 20, borderRadius: D.radiusXs, background: D.border, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: D.radiusXs, background: `linear-gradient(90deg, ${D.blue}, ${D.gold})`, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 13, color: D.gold, width: 28, textAlign: 'right', flexShrink: 0, fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: D.textDim, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                <span>正面人数</span>
                <span style={{ color: D.gold, fontWeight: 600 }}>{Object.values(teacherStats.frontLevels).reduce((a, b) => a + b, 0)}</span>
              </div>
            </div>

            {/* Back level distribution */}
            <div style={{
              gridColumn: 'span 1',
              background: D.bgCard,
              backdropFilter: D.glassBlur,
              borderRadius: D.radius,
              border: D.glassBorder,
              padding: 20,
              transition: 'background 0.2s, box-shadow 0.2s',
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = D.bgCardHover;
              el.style.boxShadow = D.cinnabarGlow;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = D.bgCard;
              el.style.boxShadow = 'none';
            }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: D.textMid, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                <Flame size={14} color={D.ember} /> 背面等级分布
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
                {config.backLevels.map(lvl => {
                  const count = teacherStats.backLevels[lvl.name] ?? 0;
                  const pct = students.length > 0 ? (count / students.length) * 100 : 0;
                  return (
                    <div key={lvl.level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: D.textDim, width: 70, flexShrink: 0, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{lvl.name}</span>
                      <div style={{ flex: 1, height: 20, borderRadius: D.radiusXs, background: D.border, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: D.radiusXs, background: `linear-gradient(90deg, ${D.ember}, ${D.flameGold})`, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 13, color: D.ember, width: 28, textAlign: 'right', flexShrink: 0, fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: D.textDim, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                <span>背面人数</span>
                <span style={{ color: D.ember, fontWeight: 600 }}>{Object.values(teacherStats.backLevels).reduce((a, b) => a + b, 0)}</span>
              </div>
            </div>

            {/* Behavior stats — slightly taller */}
            <div style={{
              gridColumn: 'span 1',
              background: D.bgCard,
              backdropFilter: D.glassBlur,
              borderRadius: D.radius,
              border: D.glassBorder,
              padding: 20,
              transition: 'background 0.2s, box-shadow 0.2s',
              minHeight: 200,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = D.bgCardHover;
              el.style.boxShadow = '0 0 20px rgba(123,139,181,0.2)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = D.bgCard;
              el.style.boxShadow = 'none';
            }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: D.textMid, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                <TrendingUp size={14} color={D.blue} /> 行为记录统计
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  { key: 'negWeight1' as IndicatorKey, label: '星蚀', icon: <StarEclipseStatIcon size={12} color={D.cinnabar} />, color: D.cinnabar, hasChart: true, history: teacherStats.negWeight1Count, current: indicatorDefs.negWeight1.currentFn() },
                  { key: 'heartDemon' as IndicatorKey, label: '心魔印记', icon: <HeartDemonStatIcon size={12} color="#8B5C8A" />, color: '#8B5C8A', hasChart: true, history: teacherStats.heartDemonRecordCount, current: indicatorDefs.heartDemon.currentFn() },
                  { key: 'shield' as IndicatorKey, label: '护盾', icon: <ShieldStatIcon size={12} color={D.blue} />, color: D.blue, hasChart: true, history: teacherStats.shieldRecordCount, current: indicatorDefs.shield.currentFn() },
                  { key: 'fireSeed' as IndicatorKey, label: '火种', icon: <FireSeedStatIcon size={12} color="#D47A28" />, color: '#D47A28', hasChart: true, history: teacherStats.fireSeedRecordCount, current: indicatorDefs.fireSeed.currentFn() },
                  { key: 'starParadigm' as string, label: '星辉典范', icon: <EclipseIcon size={12} color={D.gold} />, color: D.gold, hasChart: false, hasHonorRoll: true, history: teacherStats.starParadigmCount, current: teacherStats.starParadigmCount },
                  { key: 'immortalDawn' as string, label: '不朽晨辉', icon: <HeritageIcon size={12} />, color: '#E8A030', hasChart: false, hasHonorRoll: true, history: teacherStats.immortalDawnCount, current: teacherStats.immortalDawnCount },
                ]).map(item => (
                  <div
                    key={item.label}
                    onClick={() => { if (item.hasChart) setChartIndicator({ key: item.key, label: item.label + '总数', color: item.color, icon: item.icon }); else if ((item as any).hasHonorRoll) setHonorRollKey(item.key); }}
                    style={{
                      padding: '6px 8px', borderRadius: D.radiusXs,
                      background: 'rgba(255,255,255,0.02)',
                      cursor: (item.hasChart || (item as any).hasHonorRoll) ? 'pointer' : 'default',
                      transition: 'background 0.2s, border-color 0.2s',
                      borderBottom: (item.hasChart || (item as any).hasHonorRoll) ? '2px solid transparent' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!item.hasChart && !(item as any).hasHonorRoll) return;
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLDivElement).style.borderBottomColor = item.color;
                    }}
                    onMouseLeave={(e) => {
                      if (!item.hasChart && !(item as any).hasHonorRoll) return;
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
                      (e.currentTarget as HTMLDivElement).style.borderBottomColor = 'transparent';
                    }}
                  >
                    <div style={{ fontSize: 11, color: item.color, display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'LXGW WenKai', 'Cinzel', serif", marginBottom: 2 }}>
                      {item.icon} {item.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: item.color, fontFamily: "'LXGW WenKai', 'Cinzel', serif", fontVariantNumeric: 'tabular-nums' }}>{item.history}</div>
                    {item.hasChart && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'LXGW WenKai', 'Cinzel', serif", marginTop: 1 }}>
                        累计 {item.history} · 当前 {item.current}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Flowing Red Flag + Top violations — full-width row */}
            <div style={{
              gridColumn: 'span 3',
              display: 'flex', gap: 14,
              alignItems: 'stretch',
            }}>
              {/* Flowing Red Flag */}
              {(() => {
                const localDateStr = (d: Date) =>
                  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

                const todayStr = localDateStr(new Date());

                const currentWeek = config.teachingWeeks?.find((w: any) =>
                  todayStr >= w.startDate && todayStr <= w.endDate
                ) ?? config.teachingWeeks
                  ?.filter((w: any) => todayStr >= w.startDate)
                  .sort((a: any, b: any) => b.endDate.localeCompare(a.endDate))[0];
                if (!currentWeek) return null;

                const allBehaviors = [...config.negativeBehaviors, ...config.positiveBehaviors];
                const hasFlagBehaviors = allBehaviors.some((b: any) => b.affectsFlag);

                // Generate all school days in the week
                const weekDays: string[] = [];
                const wd = new Date(currentWeek.startDate + 'T00:00:00');
                while (true) {
                  const ds = localDateStr(wd);
                  if (ds > currentWeek.endDate) break;
                  weekDays.push(ds);
                  wd.setDate(wd.getDate() + 1);
                }
                const totalDays = weekDays.length;

                const isConfigured = hasFlagBehaviors;
                const isWeekViolation = (r: any) =>
                  r.affectsFlag &&
                  behaviorRecordLocalDate(r) >= currentWeek.startDate &&
                  behaviorRecordLocalDate(r) <= currentWeek.endDate;

                const hasViolation = isConfigured && records.some(isWeekViolation);

                const cleanDays = !isConfigured ? 0 : hasViolation ? 0 : weekDays.filter(d =>
                  d <= todayStr && !records.some(r =>
                    r.affectsFlag && behaviorRecordLocalDate(r) === d
                  )
                ).length;

                // hasViolation: flag turns grayscale. Otherwise: show progress.
                void (todayStr > currentWeek.endDate && !hasViolation);

                return (
                  <div style={{
                    width: 200, flexShrink: 0,
                    background: D.bgCard,
                    backdropFilter: D.glassBlur,
                    borderRadius: D.radius,
                    border: D.glassBorder,
                    padding: 14,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: D.textMid, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                      🚩 流动红旗 · 第{currentWeek.weekNumber}周
                    </div>
                    {/* Flag — base64 embedded, fills remaining space in panel */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '1', maxHeight: '100%', overflow: 'hidden', borderRadius: D.radiusSm, background: '#2a1015' }}>
                      {/* Bottom: grayscale flag, always visible */}
                      <img
                        src={FLAG_DATA_URL}
                        alt="流动红旗"
                        style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: 'cover', objectPosition: 'center',
                          filter: 'grayscale(1) brightness(0.5)',
                        }}
                      />
                      {/* Top: color flag, revealed left-to-right based on progress */}
                      {isConfigured && !hasViolation && (() => {
                        const progress = cleanDays / totalDays;
                        return (
                          <div style={{
                            position: 'absolute', top: 0, left: 0, bottom: 0,
                            width: `${progress * 100}%`,
                            overflow: 'hidden',
                          }}>
                            <img
                              src={FLAG_DATA_URL}
                              alt=""
                              style={{
                                position: 'absolute', top: 0, left: 0,
                                height: '100%',
                                width: progress > 0 ? `${(1 / progress) * 100}%` : '100%',
                                maxWidth: 'none',
                                objectFit: 'cover', objectPosition: 'center',
                              }}
                            />
                          </div>
                        );
                      })()}
                      {/* Progress or violation text — bottom-left */}
                      <div style={{
                        position: 'absolute', bottom: 6, left: 8,
                        fontSize: 11, fontWeight: 600,
                        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                        color: '#fff',
                        textShadow: '0 0 6px #000, 0 0 12px rgba(0,0,0,0.8), 0 1px 3px #000',
                      }}>
                        {!isConfigured
                          ? '请在行为管理中勾选「影响流动红旗」'
                          : hasViolation
                            ? '已错失流动红旗'
                            : cleanDays >= totalDays
                              ? '本周获得流动红旗！'
                              : `当前进度：${cleanDays}/${totalDays}`
                        }
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Top violations */}
              <div style={{
                  flex: 1,
                  background: D.bgCard,
                  backdropFilter: D.glassBlur,
                  borderRadius: D.radius,
                  border: D.glassBorder,
                  padding: 16,
                  transition: 'background 0.2s, box-shadow 0.2s',
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = D.bgCardHover;
                  el.style.boxShadow = D.cinnabarGlow;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = D.bgCard;
                  el.style.boxShadow = 'none';
                }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, color: D.textMid, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    <AlertCircle size={13} color={D.cinnabar} /> 负面行为 Top 5
                  </div>
                  {teacherStats.topViolations.length === 0 ? (
                    <div style={{ fontSize: 12, color: D.textDim, textAlign: 'center', padding: 4, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>暂无记录</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px 10px' }}>
                      {teacherStats.topViolations.map((v, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px',
                          background: i < 3 ? D.cinnabarDim : D.border,
                          borderRadius: D.radiusSm,
                        }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%', fontSize: 9, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: i < 3 ? D.cinnabarDim : D.border,
                            color: i < 3 ? D.cinnabar : D.textDim,
                            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                            flexShrink: 0,
                          }}>{i + 1}</span>
                          <span style={{ fontSize: 11, color: D.silver, fontFamily: "'LXGW WenKai', 'Cinzel', serif", flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: D.cinnabar, fontFamily: "'LXGW WenKai', 'Cinzel', serif", flexShrink: 0 }}>{v.count}次</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top positive */}
                <div style={{
                  flex: 1,
                  background: D.bgCard,
                  backdropFilter: D.glassBlur,
                  borderRadius: D.radius,
                  border: D.glassBorder,
                  padding: 16,
                  transition: 'background 0.2s, box-shadow 0.2s',
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = D.bgCardHover;
                  el.style.boxShadow = '0 0 20px rgba(123,139,181,0.2)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = D.bgCard;
                  el.style.boxShadow = 'none';
                }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, color: D.textMid, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    <ShieldStatIcon size={13} color={D.blue} /> 正面行为 Top 5
                  </div>
                  {teacherStats.topPositive.length === 0 ? (
                    <div style={{ fontSize: 12, color: D.textDim, textAlign: 'center', padding: 4, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>暂无记录</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px 10px' }}>
                      {teacherStats.topPositive.map((v, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px',
                          background: i < 3 ? D.blueDim : D.border,
                          borderRadius: D.radiusSm,
                        }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%', fontSize: 9, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: i < 3 ? D.blueDim : D.border,
                            color: i < 3 ? D.blue : D.textDim,
                            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                            flexShrink: 0,
                          }}>{i + 1}</span>
                          <span style={{ fontSize: 11, color: D.silver, fontFamily: "'LXGW WenKai', 'Cinzel', serif", flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: D.blue, fontFamily: "'LXGW WenKai', 'Cinzel', serif", flexShrink: 0 }}>{v.count}次</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Behavior frequency overview — collapsible */}
      {isTeacher && (
        <div style={{ maxWidth: 1200, margin: '0 auto 20px' }}>
          <button
            onClick={() => setShowBehaviorOverview(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: D.radiusSm,
              background: D.bgCard, backdropFilter: D.glassBlur,
              border: D.glassBorder,
              fontSize: 13, color: D.textMid, cursor: 'pointer',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              transition: 'background 0.2s, border-color 0.2s',
              boxShadow: '0 0 0 rgba(123,139,181,0)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = D.bgCardHover;
              el.style.borderColor = 'rgba(123,139,181,0.3)';
              el.style.boxShadow = '0 0 16px rgba(123,139,181,0.15)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = D.bgCard;
              el.style.borderColor = D.borderGlow;
              el.style.boxShadow = '0 0 0 rgba(123,139,181,0)';
            }}
          >
            <BarChart3 size={14} color={D.blue} />
            行为频次总览
            {showBehaviorOverview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <AnimatePresence>
            {showBehaviorOverview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  marginTop: 10,
                  background: D.bgCard,
                  backdropFilter: D.glassBlur,
                  borderRadius: D.radius,
                  border: D.glassBorder,
                  padding: 16,
                }}>
                  {Object.entries(behaviorOverviewData.categories).sort(([a], [b]) => a.localeCompare(b)).map(([category, behaviors]) => (
                    <div key={category} style={{ marginBottom: 12 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: D.textMid, marginBottom: 6,
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                      }}>
                        {category}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 4 }}>
                        {behaviors.sort((a, b) => {
                          if (a.direction !== b.direction) return a.direction === 'negative' ? -1 : 1;
                          return b.count - a.count;
                        }).map(b => {
                          const isLeastUsedPositive = behaviorOverviewData.leastUsedPositive?.behaviorId === b.behaviorId;
                          const extra = b.extraWeight ?? 0;
                          return (
                            <div key={b.behaviorId} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '4px 8px',
                              borderRadius: D.radiusXs,
                              background: b.direction === 'negative' ? D.cinnabarDim : D.blueDim,
                              border: isLeastUsedPositive ? '1px solid rgba(255,120,40,0.4)' : 'none',
                            }}>
                              {b.direction === 'positive' ? <CheckCircle size={10} color={D.blue} /> : <AlertCircle size={10} color={D.cinnabar} />}
                              <span title={b.name} style={{
                                fontSize: 11, color: D.silver, flex: 1,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                              }}>{b.name}</span>
                              {extra > 0 && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: '1px 4px',
                                  borderRadius: 3,
                                  background: 'rgba(232,160,48,0.2)',
                                  border: '1px solid rgba(232,160,48,0.4)',
                                  color: '#E8A030',
                                  flexShrink: 0,
                                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                                }}>+{extra}</span>
                              )}
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: isLeastUsedPositive ? '#e87040' : b.direction === 'negative' ? D.cinnabar : D.blue,
                                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                                flexShrink: 0,
                              }}>{b.count}次</span>
                              <button
                                onClick={() => handleDecreaseExtraWeight(b.behaviorId, b.direction)}
                                title="额外权重-1"
                                disabled={extra <= 0}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  minWidth: 18, height: 18, borderRadius: 4,
                                  background: extra > 0 ? 'rgba(100,140,200,0.15)' : 'rgba(255,255,255,0.03)',
                                  border: extra > 0 ? '1px solid rgba(100,140,200,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                  color: extra > 0 ? '#6A8EC0' : D.textDim, cursor: extra > 0 ? 'pointer' : 'default',
                                  fontSize: 9, padding: '0 3px', flexShrink: 0,
                                  transition: 'background 0.15s, color 0.15s',
                                  fontWeight: 600, opacity: extra > 0 ? 1 : 0.4,
                                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                                }}
                                onMouseEnter={(e) => {
                                  if (extra > 0) {
                                    const el = e.currentTarget as HTMLButtonElement;
                                    el.style.background = 'rgba(100,140,200,0.25)';
                                    el.style.color = '#8AB0E0';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget as HTMLButtonElement;
                                  el.style.background = extra > 0 ? 'rgba(100,140,200,0.15)' : 'rgba(255,255,255,0.03)';
                                  el.style.color = extra > 0 ? '#6A8EC0' : D.textDim;
                                }}
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleIncreaseExtraWeight(b.behaviorId, b.direction)}
                                title="额外权重+1"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  minWidth: 18, height: 18, borderRadius: 4,
                                  background: extra > 0 ? 'rgba(232,160,48,0.15)' : 'rgba(255,255,255,0.06)',
                                  border: extra > 0 ? '1px solid rgba(232,160,48,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                  color: extra > 0 ? '#E8A030' : D.textDim, cursor: 'pointer',
                                  fontSize: 9, padding: '0 3px', flexShrink: 0,
                                  transition: 'background 0.15s, color 0.15s',
                                  fontWeight: 600,
                                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                                }}
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget as HTMLButtonElement;
                                  el.style.background = 'rgba(232,160,48,0.25)';
                                  el.style.color = '#E8A030';
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget as HTMLButtonElement;
                                  el.style.background = extra > 0 ? 'rgba(232,160,48,0.15)' : 'rgba(255,255,255,0.06)';
                                  el.style.color = extra > 0 ? '#E8A030' : D.textDim;
                                }}
                              >
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sorting controls */}
      <div style={{ maxWidth: 1200, margin: '0 auto 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: D.textDim, marginRight: 4 }}>排序：</span>
        {([['number', '按序号'], ['level-asc', '等级高→低'], ['level-desc', '等级低→高']] as const).map(([mode, label]) => (
          <button key={mode} onClick={() => updateSortMode(mode as SortMode)} style={{
            padding: '4px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
            background: sortMode === mode ? D.goldDim : D.bgCard,
            border: sortMode === mode ? `1px solid ${D.borderGlow}` : `1px solid ${D.border}`,
            color: sortMode === mode ? D.gold : D.textDim,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            transition: 'all 0.2s ease',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Student grid */}
      <div className="student-grid" style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
      }}>
        {sortedStudents.map(student => (
          <StudentCardThumbnail key={student.id} student={student} records={records} />
        ))}
      </div>

      {/* Slideshow overlay */}
      <AnimatePresence>
        {showSlideshow && slideshowStudents.length > 0 && (() => {
          const ss = slideshowStudents;
          const idx = Math.min(slideIndex, ss.length - 1);
          const student = ss[idx];
          const isFront = student.cardSide === 'front';
          const lvl = student.currentLevel;
          const levelName = getLevelName(student.cardSide, lvl, config.frontLevels, config.backLevels);
          const isImmortal = !isFront && lvl === 6;
          const gradient = isFront ? FRONT_GRADIENTS[lvl] : BACK_GRADIENTS[lvl];
          const borderColor = isFront ? FRONT_BORDER_COLORS[lvl] : BACK_BORDER_COLORS[lvl];
          const glow = isFront ? FRONT_GLOWS[lvl] : BACK_GLOWS[lvl];
          const maxBlanks = isFront
            ? getFrontBlanks(lvl, config.frontLevels)
            : getBackChecksRequired(lvl + 1, student.heartDemonMarks, config.backLevels);
          const currentFilled = isFront ? student.blanksFilled : student.cumulativeChecks;
          const isLevelOne = isFront && lvl === 1;
          const levelTitle = isLevelOne ? getLevelOneTitle(getLevelOneTitleWeeksFromHistory(student, records, config), config.levelOneTitles) : null;
          const totalHeritageEarned = Math.max(student.totalHeritageEarned || 0, student.heritagePoints + (student.totalHeritageDonated || 0));
          const immortalTitle = isImmortal ? getImmortalTitle(totalHeritageEarned, config.immortalTitles) : null;
          const TITLE_TIER_COLORS = ['#d4c080', '#e8c55a', '#e8a040', '#f0e8d8'];
          const titleIdx = levelTitle ? config.levelOneTitles.findIndex(t => t.name === levelTitle) : -1;
          const titleColor = titleIdx >= 0 ? TITLE_TIER_COLORS[Math.min(titleIdx, TITLE_TIER_COLORS.length - 1)] : null;
          const honorTitle = levelTitle || immortalTitle;
          const honorColor = titleColor || (immortalTitle ? '#E8A030' : null);
          const progress = maxBlanks > 0 ? currentFilled / maxBlanks : 0;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.92)', zIndex: 1000,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setShowSlideshow(false)}
                style={{
                  position: 'absolute', top: 74, right: 20,
                  background: D.bgCard, backdropFilter: D.glassBlur,
                  border: D.glassBorder,
                  borderRadius: D.radiusSm, padding: '8px 12px', cursor: 'pointer', color: D.textMid,
                  fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = D.bgCardHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = D.bgCard; }}
              >
                <X size={16} /> 关闭
              </button>

              {/* Sort buttons + restart */}
              <div style={{ position: 'absolute', top: 74, left: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
                {([['number', '序号'], ['level-desc', '等级低→高'], ['level-asc', '等级高→低']] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => { setSlideSortMode(mode as typeof slideSortMode); setSlideIndex(0); }} style={{
                    padding: '5px 12px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
                    background: slideSortMode === mode ? D.goldDim : D.bgCard,
                    border: slideSortMode === mode ? `1px solid ${D.borderGlow}` : `1px solid ${D.border}`,
                    color: slideSortMode === mode ? D.gold : D.textDim,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  }}>
                    {label}
                  </button>
                ))}
                <button onClick={() => setSlideIndex(0)} style={{
                  padding: '5px 12px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
                  background: D.bgCard, border: `1px solid ${D.border}`, color: D.textDim,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                }}>
                  从头开始
                </button>
              </div>

              <div style={{ fontSize: 12, color: D.textDim, marginBottom: 16, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                {idx + 1} / {ss.length}
              </div>

              {/* Full card display */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    onClick={() => navigate(`/card/${student.id}`)}
                    style={{
                      width: 380, minHeight: 480,
                      background: gradient,
                      border: `1px solid ${titleColor ? `${titleColor}88` : borderColor}`,
                      borderRadius: D.radius,
                      padding: 28,
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: titleColor ? `0 0 12px ${titleColor}44, ${glow}` : glow,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    {/* Level illustration background */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                      <LevelIllustration side={student.cardSide} level={lvl} size={300} style={{ width: '100%', height: '100%', borderRadius: 0, opacity: 0.3 }} />
                    </div>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: isFront
                        ? 'linear-gradient(180deg, rgba(10,12,20,0.6) 0%, rgba(10,12,20,0.3) 50%, rgba(10,12,20,0.7) 100%)'
                        : 'linear-gradient(180deg, rgba(20,14,18,0.6) 0%, rgba(20,14,18,0.3) 50%, rgba(20,14,18,0.7) 100%)',
                      backdropFilter: 'blur(2px)', pointerEvents: 'none', zIndex: 0, borderRadius: D.radius,
                    }} />

                    {/* Level icon - centered */}
                    <div style={{ position: 'relative', zIndex: 1, marginBottom: 10, animation: isFront ? 'star-twinkle 4s ease-in-out infinite' : 'ember-pulse 3s ease-in-out infinite' }}>
                      <LevelIcon side={student.cardSide} level={lvl} size={48} />
                    </div>

                    {/* Student name - centered */}
                    <div className="student-name" style={{ position: 'relative', zIndex: 1, fontSize: 26, fontWeight: 700, color: isFront ? D.text : D.gold, fontFamily: "'LXGW WenKai', 'Cinzel', serif", marginBottom: 2 }}>
                      {student.name}
                    </div>
                    <div style={{ position: 'relative', zIndex: 1, fontSize: 13, color: isFront ? 'rgba(123,139,181,0.6)' : 'rgba(212,122,40,0.6)', fontFamily: "'LXGW WenKai', 'Cinzel', serif", marginBottom: 16 }}>
                      #{student.number}
                    </div>

                    {/* Level name + tag */}
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: isFront ? (lvl === 1 ? D.gold : D.silver) : D.ember, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                        {levelName}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: D.radiusXs, background: isFront ? D.goldDim : D.cinnabarDim, color: isFront ? D.gold : D.ember, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                        等级 {lvl} / 6
                      </span>
                    </div>

                    {/* Level description */}
                    <div style={{ position: 'relative', zIndex: 1, fontSize: 13, color: isFront ? 'rgba(184,192,212,0.8)' : 'rgba(232,197,90,0.8)', lineHeight: 1.8, fontFamily: "'LXGW WenKai', 'Cinzel', serif", marginBottom: 14, textAlign: 'left', width: '100%' }}>
                      {getLevelDescription(student.cardSide, lvl, config.frontLevels, config.backLevels)}
                    </div>

                    {/* Honor title badge */}
                    {honorTitle && honorColor && (
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <HonorTitleBadge title={honorTitle} color={honorColor} fontSize={12} padding="3px 10px" marginBottom={10} />
                      </div>
                    )}

                    {/* Stats grid - 3 columns */}
                    <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: isFront && lvl === 1 ? '1fr 1fr 1fr 1fr' : !isFront && lvl === 6 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 8, width: '100%', marginTop: 8, marginBottom: 14 }}>
                      {(isFront ? (lvl === 1 ? [
                        { icon: <ShieldStatIcon size={14} color={D.gold} />, label: '累计', value: student.starShields + (student.totalShieldsExchanged || 0), color: D.gold },
                        { icon: <ShieldStatIcon size={14} color={D.blue} />, label: '可用', value: student.starShields, color: D.blue },
                        { icon: <EclipseIcon size={14} color={D.cinnabar} />, label: config.blankMarkName, value: student.blanksFilled, color: D.cinnabar },
                        { icon: <CheckCircle size={14} color="#7B8BB5" />, label: '零违纪', value: student.consecutiveNoViolationDays, color: '#7B8BB5', suffix: '天' },
                      ] : [
                        { icon: <ShieldStatIcon size={14} color={D.gold} />, label: '护盾', value: student.starShields, color: D.gold },
                        { icon: <EclipseIcon size={14} color={D.cinnabar} />, label: config.blankMarkName, value: student.blanksFilled, color: D.cinnabar },
                        { icon: <CheckCircle size={14} color="#7B8BB5" />, label: '零违纪', value: student.consecutiveNoViolationDays, color: '#7B8BB5', suffix: '天' },
                      ]) : isImmortal ? [
                        { icon: <HeritageIcon size={14} color="#E8A030" />, label: '累计', value: student.heritagePoints + student.totalHeritageDonated, color: '#E8A030' },
                        { icon: <HeritageIcon size={14} color="#8baa7a" />, label: '可用', value: student.heritagePoints, color: '#8baa7a' },
                        { icon: <HeritageIcon size={14} color={D.blue} />, label: '已捐赠', value: student.totalHeritageDonated, color: D.blue },
                        { icon: <HeartDemonInlineIcon size={14} color="#e07060" />, label: '心魔', value: student.heartDemonMarks, color: '#e07060' },
                      ] : [
                        { icon: <FireSeedStatIcon size={14} color={D.ember} />, label: config.checkMarkName, value: student.cumulativeChecks, color: D.ember },
                        { icon: <HeartDemonInlineIcon size={14} color="#e07060" />, label: '心魔印记', value: student.heartDemonMarks, color: '#e07060' },
                        { icon: <CheckCircle size={14} color="#7B8BB5" />, label: '零违纪', value: student.consecutiveNoViolationDays, color: '#7B8BB5', suffix: '天' },
                      ]).map((stat, i) => {
                        const isFourCol = (isFront && lvl === 1) || isImmortal;
                        return (
                        <div key={i} style={{
                          padding: isFourCol ? '10px 4px' : '10px 8px', borderRadius: D.radiusSm,
                          background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                          minWidth: 0,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2, maxWidth: '100%' }}>
                            <span style={{ display: 'inline-flex', flexShrink: 0, width: 14, justifyContent: 'center' }}>{stat.icon}</span>
                            <span style={{ fontSize: 10, color: D.textDim, fontFamily: "'LXGW WenKai', 'Cinzel', serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</span>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: stat.color, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{stat.value}{(stat as any).suffix || ''}</div>
                        </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    {!isImmortal && (
                      <div style={{ position: 'relative', zIndex: 1, width: '100%', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: D.textDim, marginBottom: 5, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                          <span>{isFront ? `${config.blankMarkName}填充` : `${config.checkMarkName}累积`}</span>
                          <span>{currentFilled}/{maxBlanks}</span>
                        </div>
                        <div style={{ height: 7, borderRadius: D.radiusSm, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(progress * 100, 100)}%`, height: '100%', borderRadius: D.radiusSm, background: isFront ? `linear-gradient(90deg, ${D.gold}, ${D.flameGold})` : `linear-gradient(90deg, ${D.cinnabar}, ${D.ember})`, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    )}

                    {/* Side pill - bottom center */}
                    <div style={{
                      position: 'relative', zIndex: 1,
                      padding: '5px 14px', borderRadius: 20,
                      background: isFront ? D.goldDim : 'rgba(212,122,40,0.15)',
                      border: isFront ? '1px solid rgba(212,168,83,0.3)' : '1px solid rgba(212,122,40,0.3)',
                      fontSize: 13, fontWeight: 600, color: isFront ? D.gold : D.ember,
                      fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      {isFront ? <Star size={12} /> : <Flame size={12} />}
                      {isFront ? '正面' : '背面'}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center' }}>
                <button
                  onClick={() => setSlideIndex(Math.max(0, idx - 1))}
                  disabled={idx === 0}
                  style={{
                    padding: '10px 20px', borderRadius: D.radiusSm, cursor: idx === 0 ? 'not-allowed' : 'pointer',
                    background: D.bgCard, backdropFilter: D.glassBlur,
                    border: D.glassBorder,
                    color: idx === 0 ? D.textDim : D.text, fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { if (idx !== 0) (e.currentTarget as HTMLButtonElement).style.background = D.bgCardHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = D.bgCard; }}
                >
                  <ChevronLeft size={16} /> 上一位
                </button>
                <button
                  onClick={() => setIsAutoPlaying(prev => !prev)}
                  style={{
                    padding: '10px 16px', borderRadius: D.radiusSm, cursor: 'pointer',
                    background: isAutoPlaying ? D.goldDim : D.bgCard, backdropFilter: D.glassBlur,
                    border: isAutoPlaying ? `1px solid ${D.borderGlow}` : D.glassBorder,
                    color: isAutoPlaying ? D.gold : D.textMid, fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    boxShadow: isAutoPlaying ? D.goldGlow : 'none',
                  }}
                >
                  {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isAutoPlaying ? '暂停' : '自动'}
                </button>
                <button
                  onClick={() => setSlideIndex(Math.min(ss.length - 1, idx + 1))}
                  disabled={idx === ss.length - 1}
                  style={{
                    padding: '10px 20px', borderRadius: D.radiusSm, cursor: idx === ss.length - 1 ? 'not-allowed' : 'pointer',
                    background: D.bgCard, backdropFilter: D.glassBlur,
                    border: `1px solid ${D.borderGlow}`,
                    color: idx === ss.length - 1 ? D.textDim : D.gold, fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  }}
                  onMouseEnter={(e) => { if (idx !== ss.length - 1) (e.currentTarget as HTMLButtonElement).style.background = D.bgCardHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = D.bgCard; }}
                >
                  下一位 <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <style>{`
        @media (max-width: 1024px) { .student-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 768px) { .student-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .student-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Export modal */}
      <AnimatePresence>
        {showExport && (
          <ExportModal
            students={students}
            records={records}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>

      {/* Chart floating window */}
      <AnimatePresence>
        {chartIndicator && chartData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChartIndicator(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', zIndex: 1000,
              display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center',
              overflowY: 'auto', padding: isMobile ? '20px 0' : 0,
              cursor: 'pointer',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: D.bgElevated,
                borderRadius: D.radius,
                border: D.glassBorder,
                backdropFilter: D.glassBlur,
                padding: isMobile ? 16 : 24,
                cursor: 'default',
                width: isMobile ? '95vw' : undefined,
                maxWidth: isMobile ? '100%' : 800,
                maxHeight: isMobile ? '90vh' : undefined,
                overflowY: isMobile ? 'auto' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 600, color: chartIndicator.color, fontFamily: "'LXGW WenKai', 'Cinzel', serif", whiteSpace: 'nowrap' }}>
                  {chartIndicator.icon} {chartIndicator.label}趋势
                </span>
                <button
                  onClick={() => setChartIndicator(null)}
                  style={{
                    background: D.bgCard, border: D.glassBorder, borderRadius: D.radiusSm,
                    padding: isMobile ? '6px 10px' : '4px 8px', cursor: 'pointer', color: D.textMid, fontSize: isMobile ? 13 : 12,
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  }}
                >
                  <X size={14} /> 关闭
                </button>
              </div>
              <div style={isMobile ? { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } : {}}>
              {(() => {
                const key = chartIndicator.key as IndicatorKey;
                const def = indicatorDefs[key];
                if (!def) return null;
                return (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    累计 <span style={{ color: chartIndicator.color, fontWeight: 700 }}>{def.historyFn()}</span> · 当前 <span style={{ color: chartIndicator.color, fontWeight: 700 }}>{def.currentFn()}</span>
                  </div>
                );
              })()}
              <SparkLineChart
                data={chartData}
                color={chartIndicator.color}
                label={chartIndicator.label}
                icon={chartIndicator.icon}
              />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Honor Roll floating window */}
      <AnimatePresence>
        {honorRollKey && (() => {
          const isStar = honorRollKey === 'starParadigm';
          const title = isStar ? '星辉典范' : '不朽晨辉';
          const color = isStar ? D.gold : '#E8A030';
          const icon = isStar ? <EclipseIcon size={18} color={color} /> : <HeritageIcon size={18} />;
          const honorStudents = isStar
            ? students.filter(s => s.cardSide === 'front' && s.currentLevel === 1)
            : students.filter(s => s.cardSide === 'back' && s.currentLevel === 6);
          return (
            <motion.div
              key="honor-roll"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHonorRollKey(null)}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.7)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: D.bgElevated,
                  borderRadius: D.radius,
                  border: D.glassBorder,
                  backdropFilter: D.glassBlur,
                  padding: 28,
                  cursor: 'default',
                  minWidth: 320,
                  maxWidth: 480,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'LXGW WenKai', 'Cinzel', serif", display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icon} {title}
                  </span>
                  <button
                    onClick={() => setHonorRollKey(null)}
                    style={{
                      background: D.bgCard, border: D.glassBorder, borderRadius: D.radiusSm,
                      padding: '4px 8px', cursor: 'pointer', color: D.textMid, fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <X size={14} /> 关闭
                  </button>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  当前共 <span style={{ color, fontWeight: 700 }}>{honorStudents.length}</span> 人
                </div>
                {honorStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: D.textDim, fontSize: 14, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    暂无同学达到此等级
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6 }}>
                    {honorStudents.sort((a, b) => a.number - b.number).map(s => (
                      <div key={s.id} className="student-name" style={{
                        padding: '8px 0', borderRadius: D.radiusSm,
                        background: isStar ? D.goldDim : 'rgba(232,160,48,0.1)',
                        border: `1px solid ${isStar ? 'rgba(212,168,83,0.3)' : 'rgba(232,160,48,0.3)'}`,
                        fontSize: 14, fontWeight: 600, color,
                        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                        textAlign: 'center',
                      }}>
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
