import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, CheckCircle2, AlertTriangle, Shield, Search, X, Users, Trash2, ShieldCheck, Edit3, TrendingUp, Flame } from 'lucide-react';
import { useStudents } from '../lib/store';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useConfig } from '../contexts/ConfigContext';
import { useMobile } from '../hooks/useMobile';
import { D, INK } from '../data/theme';
import { getSeatPriority } from '../data/config';
import { HeritageIcon, HeartDemonInlineIcon } from '../components/LevelIcon';
import { MobileActionBar, MobilePage, MobileSection, MobileSegmentedControl } from '../components/mobile/MobileUI';
import { processNegativeBehavior, processPositiveBehavior, processPositiveBehaviorFront, processRise, addStarShield, getLevelName, donateHeritage, checkHeartDemonAutoClear } from '../lib/cardLogic';
import { calculateNegativePenalty } from '../lib/negativePenalty';
import { behaviorRecordLocalDate, toLocalDateStr } from '../lib/utils';
import { buildWeekdayOptions, findBehaviorTeachingWeek, formatBehaviorRecordDateLabel } from '../lib/behaviorDate';
import { buildBehaviorGroupSignature, formatBehaviorBaseEffectLabel, formatBehaviorRecordTitle, formatRecordGroupExpandLabel, getBehaviorRemarkForDisplay, sortBehaviorsForDisplay, summarizeStudentBehaviorConsequences } from '../lib/behaviorDisplay';
import type { BehaviorRecord, Category, NegativeWeight, PositiveWeight } from '../types';

function getPinyinInitial(name: string): string {
  const char = name.charAt(0);
  const PINYIN_MAP: Record<string, string> = {
    '赵':'Z','钱':'Q','孙':'S','李':'L','周':'Z','吴':'W','郑':'Z','王':'W',
    '冯':'F','陈':'C','褚':'C','卫':'W','蒋':'J','沈':'S','韩':'H','杨':'Y',
    '朱':'Z','秦':'Q','尤':'Y','许':'X','何':'H','吕':'L','施':'S','张':'Z',
    '孔':'K','曹':'C','严':'Y','华':'H','金':'J','魏':'W','陶':'T','姜':'J',
    '戚':'Q','谢':'X','邹':'Z','喻':'Y','柏':'B','水':'S','窦':'D','章':'Z',
    '云':'Y','苏':'S','潘':'P','葛':'G','奚':'X','范':'F','彭':'P','郎':'L',
    '鲁':'L','韦':'W','昌':'C','马':'M','苗':'M','凤':'F','花':'H','方':'F',
    '俞':'Y','任':'R','袁':'Y','柳':'L','酆':'F','鲍':'B','史':'S','唐':'T',
    '费':'F','廉':'L','岑':'C','薛':'X','雷':'L','贺':'H','倪':'N','汤':'T',
    '滕':'T','殷':'Y','罗':'L','毕':'B','郝':'H','邬':'W','安':'A','常':'C',
    '乐':'L','于':'Y','时':'S','傅':'F','皮':'P','齐':'Q','康':'K','伍':'W',
    '余':'Y','元':'Y','卜':'B','顾':'G','孟':'M','平':'P','黄':'H','和':'H',
    '穆':'M','萧':'X','尹':'Y','姚':'Y','邵':'S','湛':'Z','汪':'W','祁':'Q',
    '毛':'M','禹':'Y','狄':'D','米':'M','贝':'B','明':'M','臧':'Z','计':'J',
    '伏':'F','成':'C','戴':'D','谈':'T','宋':'S','茅':'M','庞':'P','熊':'X',
    '纪':'J','舒':'S','屈':'Q','项':'X','祝':'Z','董':'D','梁':'L','杜':'D',
    '阮':'R','蓝':'L','闵':'M','席':'X','季':'J','麻':'M','强':'Q','贾':'J',
    '路':'L','娄':'L','危':'W','江':'J','童':'T','颜':'Y','郭':'G','梅':'M',
    '盛':'S','林':'L','刁':'D','钟':'Z','徐':'X','丘':'Q','骆':'L','高':'G',
    '夏':'X','蔡':'C','田':'T','樊':'F','胡':'H','凌':'L','霍':'H','虞':'Y',
    '万':'W','支':'Z','柯':'K','昝':'Z','管':'G','卢':'L','莫':'M','经':'J',
    '房':'F','裘':'Q','缪':'M','干':'G','解':'X','应':'Y','宗':'Z','丁':'D',
    '宣':'X','贲':'B','邓':'D','郁':'Y','单':'S','杭':'H','洪':'H','包':'B',
    '诸':'Z','左':'Z','石':'S','崔':'C','吉':'J','钮':'N','龚':'G','程':'C',
    '嵇':'J','邢':'X','滑':'H','裴':'P','陆':'L','荣':'R','翁':'W','荀':'X',
    '羊':'Y','於':'Y','惠':'H','甄':'Z','曲':'Q','家':'J','封':'F','芮':'R',
    '羿':'Y','储':'C','靳':'J','汲':'J','邴':'B','糜':'M','松':'S','井':'J',
    '段':'D','富':'F','巫':'W','乌':'W','焦':'J','巴':'B','弓':'G','牧':'M',
    '隗':'K','山':'S','谷':'G','车':'C','侯':'H','宓':'M','蓬':'P','全':'Q',
    '郗':'X','班':'B','仰':'Y','秋':'Q','仲':'Z','伊':'Y','宫':'G','宁':'N',
    '仇':'Q','栾':'L','暴':'B','甘':'G','钭':'T','厉':'L','戎':'R','祖':'Z',
    '武':'W','符':'F','刘':'L','景':'J','詹':'Z','束':'S','龙':'L','叶':'Y',
    '幸':'X','司':'S','韶':'S','郜':'G','黎':'L','蓟':'J','薄':'B','印':'Y',
    '宿':'S','白':'B','怀':'H','蒲':'P','台':'T','从':'C','鄂':'E','索':'S',
    '咸':'X','籍':'J','赖':'L','卓':'Z','蔺':'L','屠':'T','蒙':'M','池':'C',
    '乔':'Q','阴':'Y','胥':'X','能':'N','苍':'C','双':'S','闻':'W',
    '莘':'S','党':'D','翟':'Z','谭':'T','贡':'G','劳':'L','逄':'P','姬':'J',
    '申':'S','扶':'F','堵':'D','冉':'R','宰':'Z','郦':'L','雍':'Y','却':'Q',
    '璩':'Q','桑':'S','桂':'G','濮':'P','牛':'N','寿':'S','通':'T','边':'B',
    '扈':'H','燕':'Y','冀':'J','浦':'P','尚':'S','农':'N','温':'W','别':'B',
    '庄':'Z','晏':'Y','柴':'C','瞿':'Q','阎':'Y','充':'C','慕':'M','连':'L',
    '茹':'R','习':'X','宦':'H','艾':'A','鱼':'Y','容':'R','向':'X','古':'G',
    '易':'Y','慎':'S','戈':'G','廖':'L','庾':'Y','终':'Z','暨':'J','居':'J',
    '衡':'H','步':'B','都':'D','耿':'G','满':'M','弘':'H','匡':'K','国':'G',
    '文':'W','寇':'K','广':'G','禄':'L','阙':'Q','东':'D','欧':'O','殳':'S',
    '沃':'W','利':'L','蔚':'W','越':'Y','夔':'K','隆':'L','师':'S','巩':'G',
    '厍':'S','聂':'N','晁':'C','勾':'G','敖':'A','融':'R','冷':'L','訾':'Z',
    '辛':'X','阚':'K','那':'N','简':'J','饶':'R','空':'K','曾':'Z','母':'M',
    '沙':'S','乜':'N','养':'Y','鞠':'J','须':'X','丰':'F','巢':'C','关':'G',
    '蒯':'K','相':'X','查':'Z','后':'H','荆':'J','红':'H','游':'Y','竺':'Z',
    '权':'Q','逯':'L','盖':'G','益':'Y','桓':'H','公':'G','俟':'Q',
  };
  if (PINYIN_MAP[char]) return PINYIN_MAP[char];
  if (/[A-Za-z]/.test(char)) return char.toUpperCase();
  return '#';
}

function compactRepeatedNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return Array.from(counts.entries()).map(([name, count]) => count > 1 ? `${name}×${count}` : name);
}

const CATEGORY_COLORS: Record<string, string> = {
  '纪律': INK.starBlue,
  '学习': '#8baa7a',
  '卫生': INK.flameEmber,
  '品行': INK.flameCinnabar,
};

const CATEGORY_ORDER = ['纪律', '学习', '卫生', '品行'];

function joinRemarkParts(...parts: Array<string | undefined | null | false>): string {
  return parts.map(part => typeof part === 'string' ? part.trim() : '').filter(Boolean).join('；');
}

interface BatchResult {
  studentId: string;
  studentName: string;
  message: string;
  levelChanged: boolean;
  flipped: boolean;
  shieldUsed: boolean;
  reachedImmortal: boolean;
  shieldsGained: number;
}

export default function RecordPage() {
  const navigate = useNavigate();
  const { students, records, updateStudent, addBehaviorRecord: addRawBehaviorRecord, deleteBehaviorRecord } = useStudents();
  const { canDeleteRecord } = useAuth();
  const config = useConfig();
  const isMobile = useMobile();
  const { showToast } = useToast();

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const [direction, setDirection] = useState<'negative' | 'positive' | 'rise'>('negative');
  const [selectedCategory, setSelectedCategory] = useState<Category>('纪律');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState('');
  const [description, setDescription] = useState('');
  const [recordedBy, setRecordedBy] = useState(() => localStorage.getItem('last_recorder') || '');
  const [selectedBehaviorDate, setSelectedBehaviorDate] = useState(() => toLocalDateStr());
  const [selectedBehaviorWeekNumber, setSelectedBehaviorWeekNumber] = useState<number | undefined>(undefined);

  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);
  const [shieldResults, setShieldResults] = useState<BatchResult[] | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [showShieldAdjust, setShowShieldAdjust] = useState(false);
  const [shieldAdjustAmount, setShieldAdjustAmount] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null);
  const [showHeritageDonate, setShowHeritageDonate] = useState(false);
  const [heritageDonorId, setHeritageDonorId] = useState('');
  const [heritageRecipientId, setHeritageRecipientId] = useState('');
  const [heritageConfirm, setHeritageConfirm] = useState(false);
  const [enableInverse, setEnableInverse] = useState(true);
  const [selectedInitial, setSelectedInitial] = useState<string>('');
  const [isLimitedCategory, setIsLimitedCategory] = useState(false);
  const [selectedTimePeriodId, setSelectedTimePeriodId] = useState('');
  const [selectedHomeworkSubjectId, setSelectedHomeworkSubjectId] = useState('');
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const timePeriods = config.timePeriods || [];
  const homeworkSubjects = config.homeworkSubjects || [];
  const addBehaviorRecord = useCallback((record: Parameters<typeof addRawBehaviorRecord>[0]) => {
    return addRawBehaviorRecord({ ...record, occurredDate: selectedBehaviorDate });
  }, [addRawBehaviorRecord, selectedBehaviorDate]);

  // Directional sliding transition
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [slidePhase, setSlidePhase] = useState<'idle' | 'out' | 'entering' | 'idle2'>('idle');
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);
  const handleCategoryChange = useCallback((cat: Category) => {
    const oldIdx = CATEGORY_ORDER.indexOf(selectedCategory);
    const newIdx = CATEGORY_ORDER.indexOf(cat);
    if (newIdx === oldIdx) return;
    setSlideDirection(newIdx > oldIdx ? 'right' : 'left');
    setPendingCategory(cat);
    setSlidePhase('out');
    setSelectedBehaviorId('');
  }, [selectedCategory]);

  useEffect(() => {
    if (slidePhase === 'out' && pendingCategory) {
      const timer = setTimeout(() => {
        setSelectedCategory(pendingCategory);
        setPendingCategory(null);
        setSlidePhase('entering');
      }, 180);
      return () => clearTimeout(timer);
    }
    if (slidePhase === 'entering') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlidePhase('idle2');
        });
      });
    }
    if (slidePhase === 'idle2') {
      const timer = setTimeout(() => setSlidePhase('idle'), 250);
      return () => clearTimeout(timer);
    }
  }, [slidePhase, pendingCategory]);

  const displayedRecords = records.slice(0, 200);

  const groupedRecords = useMemo(() => {
    const groupMap = new Map<string, typeof displayedRecords>();
    for (const record of displayedRecords) {
      const date = new Date(record.createdAt);
      const minuteKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
      const groupKey = `${buildBehaviorGroupSignature(record)}|${behaviorRecordLocalDate(record)}|${record.direction}|${minuteKey}`;
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
      groupMap.get(groupKey)!.push(record);
    }
    return Array.from(groupMap.entries()).map(([key, recs]) => {
      const getStudentName = (studentId: string) => students.find(s => s.id === studentId)?.name ?? '未知';
      const studentNames = recs.map(r => getStudentName(r.studentId));
      const impactOptions = {
        blankMarkName: config.blankMarkName,
        checkMarkName: config.checkMarkName,
        negativeWeightNames: config.negativeWeightNames,
        positiveWeightNames: config.positiveWeightNames,
      };
      const specialConsequenceRows = summarizeStudentBehaviorConsequences(recs, impactOptions, getStudentName);
      const recorders = [...new Set(recs.map(r => r.recordedBy).filter(Boolean))];
      return {
        key,
        records: recs,
        studentNames,
        compactStudentNames: compactRepeatedNames(studentNames),
        uniqueStudentCount: new Set(recs.map(r => r.studentId)).size,
        description: formatBehaviorRecordTitle(recs[0], homeworkSubjects),
        direction: recs[0].direction,
        weight: recs[0].weight,
        extraWeight: recs[0].extraWeight ?? 0,
        baseEffectLabel: formatBehaviorBaseEffectLabel(recs[0], impactOptions),
        specialConsequenceRows,
        createdAt: recs[0].createdAt,
        occurredDate: behaviorRecordLocalDate(recs[0]),
        remark: recs[0].remark,
        cleanRemark: getBehaviorRemarkForDisplay(recs[0]),
        hasShields: recs.some(r => r.shieldsConsumed > 0),
        totalShields: recs.reduce((s, r) => s + r.shieldsConsumed, 0),
        hasHighSensitivity: recs.some(r => r.isHighSensitivity),
        allIds: recs.map(r => r.id),
        recordedBy: recorders.join('、'),
      };
    });
  }, [displayedRecords, students, homeworkSubjects, config.negativeWeightNames, config.positiveWeightNames, config.blankMarkName, config.checkMarkName]);

  const allDisplayedSelected = displayedRecords.length > 0 && displayedRecords.every(r => selectedRecordIds.has(r.id));

  const toggleAllRecords = () => {
    if (allDisplayedSelected) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(displayedRecords.map(r => r.id)));
    }
  };

  const syncAfterChange = async (successMessage: string, options?: { explicitDeletedRecordIds?: string[] }): Promise<boolean> => {
    setIsSyncing(true);
    setSyncError('');
    try {
      await window.xinghuoSync?.saveNow(options);
      showToast(successMessage);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setSyncError(message);
      showToast('同步失败：请检查网络后点“重试同步”');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const retrySync = async () => {
    const synced = await syncAfterChange('同步成功');
    if (synced) setSyncError('');
  };

  const handleBatchDelete = async () => {
    const count = selectedRecordIds.size;
    const deletedIds = Array.from(selectedRecordIds);
    for (const id of deletedIds) {
      deleteBehaviorRecord(id);
    }
    const synced = await syncAfterChange(`已删除并同步 ${count} 条记录`, { explicitDeletedRecordIds: deletedIds });
    if (synced) {
      setSelectedRecordIds(new Set());
      setBatchDeleteConfirm(false);
    }
  };

  const today = toLocalDateStr();
  const behaviorWeek = useMemo(
    () => selectedBehaviorWeekNumber
      ? config.teachingWeeks.find(week => week.weekNumber === selectedBehaviorWeekNumber)
      : findBehaviorTeachingWeek(config.teachingWeeks, selectedBehaviorDate),
    [config.teachingWeeks, selectedBehaviorDate, selectedBehaviorWeekNumber],
  );
  const behaviorDateOptions = useMemo(
    () => buildWeekdayOptions(config.teachingWeeks, selectedBehaviorDate, today, behaviorWeek?.weekNumber),
    [config.teachingWeeks, selectedBehaviorDate, today, behaviorWeek?.weekNumber],
  );
  const behaviorDateTitle = behaviorWeek ? `行为日期 · 第${behaviorWeek.weekNumber}周` : '行为日期';
  const handleBehaviorWeekChange = useCallback((weekNumber: number) => {
    const week = config.teachingWeeks.find(item => item.weekNumber === weekNumber);
    if (!week) return;
    setSelectedBehaviorWeekNumber(week.weekNumber);
    setSelectedBehaviorDate(today >= week.startDate && today <= week.endDate ? today : week.startDate);
  }, [config.teachingWeeks, today]);

  useEffect(() => {
    if (!selectedBehaviorWeekNumber) {
      const week = findBehaviorTeachingWeek(config.teachingWeeks, today);
      if (week) setSelectedBehaviorWeekNumber(week.weekNumber);
    }
  }, [config.teachingWeeks, selectedBehaviorWeekNumber, today]);

  useEffect(() => {
    if (behaviorWeek && (selectedBehaviorDate < behaviorWeek.startDate || selectedBehaviorDate > behaviorWeek.endDate)) {
      setSelectedBehaviorDate(today >= behaviorWeek.startDate && today <= behaviorWeek.endDate ? today : behaviorWeek.startDate);
    }
  }, [behaviorWeek, selectedBehaviorDate, today]);
  const activeLimitedEvents = useMemo(() =>
    config.limitedEvents.filter(e => e.isActive && e.startDate <= today && e.endDate >= today),
    [config.limitedEvents, today]
  );

  const behaviors = isLimitedCategory
    ? activeLimitedEvents.filter(e => e.direction === direction).map(e => ({
        id: e.id,
        direction: e.direction,
        category: '限时活动' as Category,
        weight: e.weight,
        name: e.name,
        description: e.description,
        aliases: e.aliases,
        seriesId: e.seriesId ?? e.id,
        isHighSensitivity: false,
        isComposite: false,
        isInverseSelectable: false,
        extraWeight: 0,
      }))
    : direction === 'negative'
      ? sortBehaviorsForDisplay(config.negativeBehaviors.filter(b => b.category === selectedCategory))
      : sortBehaviorsForDisplay(config.positiveBehaviors.filter(b => b.category === selectedCategory));

  const selectedLimitedEvent = isLimitedCategory ? activeLimitedEvents.find(e => e.id === selectedBehaviorId) : undefined;
  const selectedBehavior = isLimitedCategory && selectedLimitedEvent
    ? {
        id: selectedLimitedEvent.id,
        direction: selectedLimitedEvent.direction,
        category: '限时活动' as Category,
        weight: selectedLimitedEvent.weight,
        name: selectedLimitedEvent.name,
        description: selectedLimitedEvent.description,
        aliases: selectedLimitedEvent.aliases,
        seriesId: selectedLimitedEvent.seriesId ?? selectedLimitedEvent.id,
        isHighSensitivity: false,
        isComposite: false,
        isInverseSelectable: false,
        extraWeight: 0,
      }
    : [...config.negativeBehaviors, ...config.positiveBehaviors].find(b => b.id === selectedBehaviorId);

  const isInverseSelectable = selectedBehavior?.isInverseSelectable ?? false;
  const requiresTimePeriod = selectedBehavior?.requiresTimePeriod ?? false;
  const requiresHomeworkDetail = selectedBehavior?.requiresHomeworkDetail ?? false;

  // Reset behavior-specific detail fields when behavior changes
  useEffect(() => {
    setEnableInverse(true);
    setSelectedTimePeriodId('');
    setSelectedHomeworkSubjectId('');
    setHomeworkTitle('');
  }, [selectedBehaviorId]);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => {
      const pa = getSeatPriority(a.cardSide, a.currentLevel, config.seatPriorityMap);
      const pb = getSeatPriority(b.cardSide, b.currentLevel, config.seatPriorityMap);
      if (pa !== pb) return pa - pb;
      return a.number - b.number;
    }),
    [students, config.seatPriorityMap]
  );

  const availableInitials = useMemo(() => {
    const initialSet = new Set<string>();
    for (const s of sortedStudents) {
      initialSet.add(getPinyinInitial(s.name));
    }
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => initialSet.has(l));
    if (initialSet.has('#')) letters.push('#');
    return letters;
  }, [sortedStudents]);

  const filteredStudents = useMemo(() => {
    let result = sortedStudents;
    if (selectedInitial) {
      result = result.filter(s => getPinyinInitial(s.name) === selectedInitial);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) || String(s.number).includes(q)
      );
    }
    return result;
  }, [sortedStudents, searchQuery, selectedInitial]);

  const groupedStudents = useMemo(() => {
    const groups: Record<string, typeof sortedStudents> = {};
    for (const s of filteredStudents) {
      const key = `${s.cardSide === 'front' ? '正面' : '背面'}·${getLevelName(s.cardSide, s.currentLevel, config.frontLevels, config.backLevels)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return groups;
  }, [filteredStudents]);

  const toggleStudent = (id: string) => {
    const isAlreadySelected = selectedStudentIds.includes(id);
    if (isAlreadySelected) {
      // Already selected → increment count (no limit at selection time)
      setStudentCounts(prev => ({ ...prev, [id]: (prev[id] || 1) + 1 }));
    } else {
      setSelectedStudentIds(prev => [...prev, id]);
      setStudentCounts(prev => ({ ...prev, [id]: 1 }));
    }
    setBatchResults(null);
    setShieldResults(null);
  };

  const decrementStudentCount = (id: string) => {
    setStudentCounts(prev => {
      const count = (prev[id] || 1) - 1;
      if (count <= 0) {
        // Remove student
        setSelectedStudentIds(p => p.filter(x => x !== id));
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: count };
    });
    setBatchResults(null);
    setShieldResults(null);
  };

  const removeStudent = (id: string) => {
    setSelectedStudentIds(prev => prev.filter(x => x !== id));
    setStudentCounts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setBatchResults(null);
    setShieldResults(null);
  };

  const selectAll = () => {
    setSelectedStudentIds(filteredStudents.map(s => s.id));
    setStudentCounts(prev => {
      const next = { ...prev };
      for (const s of filteredStudents) {
        if (!next[s.id]) next[s.id] = 1;
      }
      return next;
    });
    setBatchResults(null);
    setShieldResults(null);
  };

  const deselectAll = () => {
    setSelectedStudentIds([]);
    setStudentCounts({});
    setBatchResults(null);
    setShieldResults(null);
  };

  const handleSubmit = async () => {
    if (isSyncing) return;
    if (syncError) { showToast('上次同步失败，请先重试同步'); return; }
    if (selectedStudentIds.length === 0 || !selectedBehaviorId) return;
    if (!recordedBy) { showToast('请选择记录人'); return; }
    if (requiresTimePeriod && !selectedTimePeriodId) { showToast('请选择行为发生时间'); return; }
    if (requiresHomeworkDetail && !selectedHomeworkSubjectId) { showToast('请选择未交作业学科'); return; }
    const homeworkTitleText = homeworkTitle.trim();
    if (requiresHomeworkDetail && !homeworkTitleText) { showToast('请填写未交作业名称'); return; }
    const homeworkRecordFields = requiresHomeworkDetail
      ? { homeworkSubjectId: selectedHomeworkSubjectId, homeworkTitle: homeworkTitleText }
      : {};

    const results: BatchResult[] = [];
    const autoShieldResults: BatchResult[] = [];

    for (const studentId of selectedStudentIds) {
      const student = students.find(s => s.id === studentId);
      if (!student) continue;

      // Blacklist check
      if (selectedBehavior?.behaviorBlacklist && selectedBehavior.behaviorBlacklist.includes(studentId)) {
        results.push({
          studentId, studentName: student.name,
          message: `该学生在「${selectedBehavior.name}」黑名单中，无法记录`,
          levelChanged: false, flipped: false, shieldUsed: false, reachedImmortal: false, shieldsGained: 0
        });
        continue;
      }

      // Determine how many times to apply this behavior
      const requestedCount = studentCounts[studentId] || 1;
      let applyCount = requestedCount;

      // Daily count check — silent truncation
      if (selectedBehavior?.maxDailyCount) {
        const todayCount = records.filter(r =>
          r.studentId === studentId &&
          r.description === selectedBehavior.name &&
          behaviorRecordLocalDate(r) === selectedBehaviorDate
        ).length;
        const remaining = selectedBehavior.maxDailyCount - todayCount;
        if (remaining <= 0) {
          results.push({
            studentId, studentName: student.name,
            message: `「${selectedBehavior.name}」今日已达上限（${selectedBehavior.maxDailyCount}次）`,
            levelChanged: false, flipped: false, shieldUsed: false, reachedImmortal: false, shieldsGained: 0
          });
          continue;
        }
        applyCount = Math.min(applyCount, remaining);
      }

      const effectiveDirection = isLimitedCategory ? selectedBehavior!.direction : direction;

      // Apply behavior applyCount times (with silent truncation from maxDailyCount)
      let currentStudent = student;
      let anyLevelChanged = false;
      let anyFlipped = false;
      let anyReachedImmortal = false;
      let totalShieldsConsumed = 0;
      let totalShieldsGained = 0;
      const sessionNegativeRecords: BehaviorRecord[] = [];
      const negativeEffectLabels: string[] = [];
      const negativePenaltyNotes = new Set<string>();

      for (let i = 0; i < applyCount; i++) {
        if (effectiveDirection === 'negative' && selectedBehavior) {
          const penalty = calculateNegativePenalty(currentStudent, selectedBehavior, [...records, ...sessionNegativeRecords], config.committeeNames ?? []);
          const isBackNegative = currentStudent.cardSide === 'back';
          const effectiveWeight = isBackNegative ? penalty.backHeartDemonAmount : penalty.effectiveFrontWeight;
          const { student: updated, shieldsConsumed, levelChanged, flipped, heritageOffsetCount } = processNegativeBehavior(currentStudent, effectiveWeight, currentStudent.starShields, config.shieldOffsetRatio, config.frontLevels, config.backLevels, config.immortalDemotionThreshold);

          if (levelChanged) anyLevelChanged = true;
          if (flipped) anyFlipped = true;
          totalShieldsConsumed += shieldsConsumed;
          negativeEffectLabels.push(`${effectiveWeight}${isBackNegative ? '心魔' : config.blankMarkName}`);
          if (penalty.remarkSuffix) negativePenaltyNotes.add(penalty.remarkSuffix);

          updateStudent(studentId, () => updated);
          const newRecord = addBehaviorRecord({
            studentId,
            direction: 'negative',
            weight: selectedBehavior.weight as NegativeWeight,
            behaviorId: selectedBehavior.id,
            behaviorSeriesId: selectedBehavior.seriesId,
            category: selectedBehavior.category,
            description: selectedBehavior.name,
            remark: joinRemarkParts(applyCount > 1 ? `第${i + 1}次` : '', description, penalty.remarkSuffix),
            recordedBy,
            verified: !selectedBehavior.isHighSensitivity,
            shieldsConsumed,
            extraWeight: penalty.extraWeight,
            penaltyReasons: penalty.penaltyReasons,
            isHighSensitivity: selectedBehavior.isHighSensitivity,
            studentCardSide: currentStudent.cardSide,
            affectsFlag: selectedBehavior.affectsFlag,
            timePeriodId: selectedTimePeriodId || undefined,
            ...homeworkRecordFields,
          });
          sessionNegativeRecords.push(newRecord);

          // 传承值自动抵消心魔记录
          if (heritageOffsetCount > 0) {
            addBehaviorRecord({
              studentId,
              direction: 'positive',
              weight: 1 as PositiveWeight,
              category: '品行',
              description: `传承值抵消·心魔消除（-${heritageOffsetCount}）`,
              remark: `heartDemonClear:heritage,count:${heritageOffsetCount}，${heritageOffsetCount}传承值抵消${heritageOffsetCount}心魔`,
              recordedBy,
              verified: true,
              shieldsConsumed: 0,
              isHighSensitivity: false,
              studentCardSide: currentStudent.cardSide,
            timePeriodId: selectedTimePeriodId || undefined,
            });
          }

          currentStudent = updated;
        } else if (effectiveDirection === 'positive' && selectedBehavior) {
          const effectiveWeight = (selectedBehavior.weight as number) + (selectedBehavior.extraWeight ?? 0);
          const baseWeight = selectedBehavior.weight as PositiveWeight;

          if (currentStudent.cardSide === 'front') {
            const { student: updated, shieldsGained } = processPositiveBehaviorFront(currentStudent, effectiveWeight);
            totalShieldsGained += shieldsGained;

            updateStudent(studentId, () => updated);
            addBehaviorRecord({
              studentId,
              direction: 'positive',
              weight: baseWeight,
              behaviorId: selectedBehavior.id,
              behaviorSeriesId: selectedBehavior.seriesId,
              category: selectedBehavior.category,
              description: selectedBehavior.name,
              remark: (applyCount > 1 ? `第${i + 1}次` : '') + (description || (selectedBehavior.extraWeight ? `额外+${selectedBehavior.extraWeight}` : '')),
              recordedBy,
              verified: true,
              shieldsConsumed: 0,
              extraWeight: selectedBehavior.extraWeight ?? 0,
              isHighSensitivity: false,
              studentCardSide: currentStudent.cardSide,
              timePeriodId: selectedTimePeriodId || undefined,
              ...homeworkRecordFields,
            });

            currentStudent = updated;
          } else {
            const { student: updated, levelChanged, reachedImmortal, heartDemonsCleared } = processPositiveBehavior(currentStudent, effectiveWeight, config.backLevels, config.heartDemonClearRules);

            if (levelChanged) anyLevelChanged = true;
            if (reachedImmortal) anyReachedImmortal = true;

            updateStudent(studentId, () => updated);
            addBehaviorRecord({
              studentId,
              direction: 'positive',
              weight: baseWeight,
              behaviorId: selectedBehavior.id,
              behaviorSeriesId: selectedBehavior.seriesId,
              category: selectedBehavior.category,
              description: selectedBehavior.name,
              remark: (applyCount > 1 ? `第${i + 1}次` : '') + (description || (selectedBehavior.extraWeight ? `额外+${selectedBehavior.extraWeight}` : '')),
              recordedBy,
              verified: true,
              shieldsConsumed: 0,
              extraWeight: selectedBehavior.extraWeight ?? 0,
              isHighSensitivity: false,
              studentCardSide: currentStudent.cardSide,
              timePeriodId: selectedTimePeriodId || undefined,
              ...homeworkRecordFields,
            });

            // 心魔消除记录
            if (heartDemonsCleared > 0) {
              const shiningThreshold = config.heartDemonClearRules?.shiningBehavior?.minWeight ?? 3;
              const reason = effectiveWeight >= shiningThreshold ? '闪耀行为·心魔消除' : '传承值抵消·心魔消除';
              addBehaviorRecord({
                studentId,
                direction: 'positive',
                weight: 1 as PositiveWeight,
                category: '品行',
                description: `${reason}（-${heartDemonsCleared}）`,
                remark: `heartDemonClear:${effectiveWeight >= shiningThreshold ? 'shiningBehavior' : 'heritage'},count:${heartDemonsCleared}`,
                recordedBy,
                verified: true,
                shieldsConsumed: 0,
                isHighSensitivity: false,
                studentCardSide: currentStudent.cardSide,
              timePeriodId: selectedTimePeriodId || undefined,
              });
            }

            currentStudent = updated;
          }
        }
      }

      // Auto-rule penalty check: weekly_behavior_count rules with blank/heartDemon effect
      if (effectiveDirection === 'negative' && selectedBehavior) {
        const currentWeek = findBehaviorTeachingWeek(config.teachingWeeks, selectedBehaviorDate);
        if (currentWeek) {
          const penaltyRules = config.autoRules.filter(r =>
            r.isActive &&
            r.triggerCondition.type === 'weekly_behavior_count' &&
            r.triggerCondition.behaviorId === selectedBehavior.id &&
            r.effectType === 'blankAndHeartDemon'
          );
          for (const rule of penaltyRules) {
            const threshold = rule.triggerCondition.threshold ?? 3;
            const penalty = rule.effectAmount;
            // Count weekly occurrences (existing records + just created)
            const weeklyCount = records.filter(r =>
              r.studentId === studentId &&
              r.direction === 'negative' &&
              r.description === selectedBehavior.name &&
              !r.isAutoRule &&
              behaviorRecordLocalDate(r) >= currentWeek.startDate &&
              behaviorRecordLocalDate(r) <= currentWeek.endDate
            ).length + applyCount;
            // Only trigger when exactly reaching threshold, not beyond
            if (weeklyCount >= threshold) {
              // Check if already triggered this rule for this student this week
              const alreadyTriggered = records.some(r =>
                r.studentId === studentId &&
                r.isAutoRule &&
                (r.autoRuleId === rule.id || Boolean(r.remark && r.remark.includes(`ruleId:${rule.id}`))) &&
                behaviorRecordLocalDate(r) >= currentWeek.startDate &&
                behaviorRecordLocalDate(r) <= currentWeek.endDate
              );
              if (!alreadyTriggered) {
                if (rule.effectType === 'blankAndHeartDemon') {
                  if (currentStudent.cardSide === 'front') {
                    // Front-side: add 星蚀 (amount)
                    const { student: penaltyStudent, shieldsConsumed: penaltyShields, levelChanged: penaltyLevelChanged, flipped: penaltyFlipped, heritageOffsetCount: penaltyHeritage } = processNegativeBehavior(currentStudent, penalty, currentStudent.starShields, config.shieldOffsetRatio, config.frontLevels, config.backLevels, config.immortalDemotionThreshold);
                    if (penaltyLevelChanged) anyLevelChanged = true;
                    if (penaltyFlipped) anyFlipped = true;
                    totalShieldsConsumed += penaltyShields;
                    updateStudent(studentId, () => penaltyStudent);
                    addBehaviorRecord({
                      studentId,
                      direction: 'negative',
                      weight: penalty as NegativeWeight,
                      category: selectedBehavior.category,
                      description: `自动规则：一周内${weeklyCount}次「${selectedBehavior.name}」`,
                      autoRuleId: rule.id,
                      settledWeek: currentWeek.weekNumber,
                      recordedBy: '系统',
                      verified: true,
                      shieldsConsumed: penaltyShields,
                      isHighSensitivity: false,
                      studentCardSide: 'front',
                      affectsFlag: false,
                      isAutoRule: true,
                    timePeriodId: selectedTimePeriodId || undefined,
                    });
                    if (penaltyHeritage > 0) {
                      addBehaviorRecord({
                        studentId,
                        direction: 'positive',
                        weight: 1 as PositiveWeight,
                        category: '品行',
                        description: `传承值抵消·心魔消除（-${penaltyHeritage}）`,
                        remark: `heartDemonClear:heritage,count:${penaltyHeritage}，${penaltyHeritage}传承值抵消${penaltyHeritage}心魔`,
                        recordedBy: '系统',
                        verified: true,
                        shieldsConsumed: 0,
                        isHighSensitivity: false,
                        studentCardSide: 'front',
                        isAutoRule: true,
                      timePeriodId: selectedTimePeriodId || undefined,
                      });
                    }
                    currentStudent = penaltyStudent;
                  } else {
                    // Back-side: add +1 心魔 (always 1, regardless of amount)
                    const penaltyStudent = { ...currentStudent, heartDemonMarks: currentStudent.heartDemonMarks + 1, totalHeartDemonsEverGained: currentStudent.totalHeartDemonsEverGained + 1, updatedAt: new Date().toISOString() };
                    updateStudent(studentId, () => penaltyStudent);
                    addBehaviorRecord({
                      studentId,
                      direction: 'negative',
                      weight: 1 as NegativeWeight,
                      category: selectedBehavior.category,
                      description: `自动规则：一周内${weeklyCount}次「${selectedBehavior.name}」`,
                      autoRuleId: rule.id,
                      settledWeek: currentWeek.weekNumber,
                      recordedBy: '系统',
                      verified: true,
                      shieldsConsumed: 0,
                      isHighSensitivity: false,
                      studentCardSide: 'back',
                      affectsFlag: false,
                      isAutoRule: true,
                    timePeriodId: selectedTimePeriodId || undefined,
                    });
                    currentStudent = penaltyStudent;
                  }
                }
              }
            }
          }
        }
      }

      // Build result message
      if (effectiveDirection === 'negative' && selectedBehavior) {
        const baseWeight = selectedBehavior.weight as NegativeWeight;
        const uniqueEffectLabels = Array.from(new Set(negativeEffectLabels));
        const effectLabel = uniqueEffectLabels.length === 1
          ? uniqueEffectLabels[0]
          : uniqueEffectLabels.join('、');
        let msg = `${config.negativeWeightNames[baseWeight]} ${effectLabel || `${baseWeight}${config.blankMarkName}`}`;
        if (applyCount > 1 && uniqueEffectLabels.length <= 1) msg = `${applyCount}次 ${msg}`;
        if (negativePenaltyNotes.size > 0) msg += `（${Array.from(negativePenaltyNotes).join('；')}）`;
        if (totalShieldsConsumed > 0) msg += ` — 消耗${totalShieldsConsumed}护盾`;
        if (anyLevelChanged && !anyFlipped) msg += ` → 降至${getLevelName(currentStudent.cardSide, currentStudent.currentLevel, config.frontLevels, config.backLevels)}`;
        if (anyFlipped) msg += ' → 已翻面！';
        if (applyCount < requestedCount) msg += `（今日上限${selectedBehavior.maxDailyCount}次，已截断）`;
        results.push({ studentId, studentName: student.name, message: msg, levelChanged: anyLevelChanged, flipped: anyFlipped, shieldUsed: totalShieldsConsumed > 0, reachedImmortal: false, shieldsGained: 0 });
      } else if (effectiveDirection === 'positive' && selectedBehavior) {
        const baseWeight = selectedBehavior.weight as PositiveWeight;
        const effectiveWeight = (selectedBehavior.weight as number) + (selectedBehavior.extraWeight ?? 0);
        if (currentStudent.cardSide === 'front') {
          let msg = selectedBehavior.extraWeight
            ? `${config.positiveWeightNames[baseWeight]} ${effectiveWeight}护盾（含额外+${selectedBehavior.extraWeight}）`
            : `${config.positiveWeightNames[baseWeight]} ${baseWeight}护盾`;
          if (applyCount > 1) msg = `${applyCount}次 ${msg}`;
          msg += ` → 护盾${currentStudent.starShields}`;
          if (applyCount < requestedCount) msg += `（今日上限${selectedBehavior.maxDailyCount}次，已截断）`;
          results.push({ studentId, studentName: student.name, message: msg, levelChanged: false, reachedImmortal: false, flipped: false, shieldUsed: false, shieldsGained: totalShieldsGained });
        } else {
          let msg = `${config.positiveWeightNames[baseWeight] || `${baseWeight}级`} ${effectiveWeight}${config.checkMarkName}`;
          if (selectedBehavior.extraWeight) msg += `（含额外+${selectedBehavior.extraWeight}，有效${effectiveWeight}）`;
          if (applyCount > 1) msg = `${applyCount}次 ${msg}`;
          if (anyLevelChanged) msg += ` → 升至${getLevelName(currentStudent.cardSide, currentStudent.currentLevel, config.frontLevels, config.backLevels)}`;
          if (anyReachedImmortal) msg += ' → 不朽晨辉！';
          if (applyCount < requestedCount) msg += `（今日上限${selectedBehavior.maxDailyCount}次，已截断）`;
          results.push({ studentId, studentName: student.name, message: msg, levelChanged: anyLevelChanged, reachedImmortal: anyReachedImmortal, flipped: false, shieldUsed: false, shieldsGained: 0 });
        }
      }
    }

    // 反选自动化：未选中的正面卡片学生自动获得1个护盾
    if (isInverseSelectable && direction === 'negative' && enableInverse) {
      const unselectedFrontStudents = students.filter(
        s => !selectedStudentIds.includes(s.id) && s.cardSide === 'front'
      );
      for (const student of unselectedFrontStudents) {
        updateStudent(student.id, (s) => addStarShield(s));
        addBehaviorRecord({
          studentId: student.id,
          direction: 'positive',
          weight: 1 as PositiveWeight,
          category: '品行',
          description: `因「${selectedBehavior!.name}」反选，自动获得护盾`,
          recordedBy,
          verified: true,
          shieldsConsumed: 0,
          isHighSensitivity: false,
          studentCardSide: 'front',
        timePeriodId: selectedTimePeriodId || undefined,
        });
        autoShieldResults.push({
          studentId: student.id,
          studentName: student.name,
          message: '自动获得1个护盾',
          levelChanged: false, flipped: false, shieldUsed: false, reachedImmortal: false, shieldsGained: 1,
        });
      }
    }

    // 心魔自动消除检测：对背面学生检查连续2教学周零违纪
    for (const studentId of selectedStudentIds) {
      const currentStudent = students.find(s => s.id === studentId);
      if (!currentStudent || currentStudent.cardSide !== 'back') continue;
      const { student: clearedStudent, cleared, clearedCount, reason } = checkHeartDemonAutoClear(currentStudent, records, config.teachingWeeks, config.heartDemonClearRules);
      if (cleared) {
        updateStudent(studentId, () => clearedStudent);
        addBehaviorRecord({
          studentId,
          direction: 'positive',
          weight: 1 as PositiveWeight,
          category: '品行',
          description: `心魔消除·${reason}（-${clearedCount}）`,
          remark: `heartDemonClear:zeroViolation,count:${clearedCount}`,
          recordedBy,
          verified: true,
          shieldsConsumed: 0,
          isHighSensitivity: false,
          studentCardSide: currentStudent.cardSide,
        timePeriodId: selectedTimePeriodId || undefined,
        });
        showToast(`${currentStudent.name}：心魔消除·${reason}，心魔-${clearedCount}`);
        const existResult = results.find(r => r.studentId === studentId);
        if (existResult) {
          existResult.message += ` — ${reason}，心魔-${clearedCount}`;
        }
      }
    }

    setBatchResults(results);
    setShieldResults(autoShieldResults.length > 0 ? autoShieldResults : null);
    localStorage.setItem('last_recorder', recordedBy);
    const synced = await syncAfterChange('已记录并同步');
    if (!synced) return;
    setSelectedBehaviorId('');
    setDescription('');
    setSelectedTimePeriodId('');
    setSelectedHomeworkSubjectId('');
    setHomeworkTitle('');
    setStudentCounts({});
    setSelectedStudentIds([]);
  };

  const handleRiseSubmit = async () => {
    if (isSyncing) return;
    if (syncError) { showToast('上次同步失败，请先重试同步'); return; }
    if (selectedStudentIds.length === 0) return;
    if (!recordedBy) { showToast('请选择记录人'); return; }

    const results: BatchResult[] = [];

    for (const studentId of selectedStudentIds) {
      const student = students.find(s => s.id === studentId);
      if (!student || student.cardSide !== 'front' || student.currentLevel <= 1) continue;

      const riseTask = config.riseTasks.find(t => t.side === 'front' && t.level === student.currentLevel);
      if (!riseTask) continue;

      const daysRequired = riseTask.riseDaysRequired ?? 0;
      const { student: updated, rose } = processRise(student, student.consecutiveNoViolationDays, daysRequired, student.riseTaskCompleted ?? false);

      if (rose) {
        const oldName = getLevelName('front', student.currentLevel, config.frontLevels, config.backLevels);
        const newName = getLevelName('front', updated.currentLevel, config.frontLevels, config.backLevels);
        updateStudent(studentId, () => updated);
        addBehaviorRecord({
          studentId,
          direction: 'positive',
          weight: 1 as PositiveWeight,
          category: '品行',
          description: `完成回升任务：${riseTask.riseTask}`,
          remark: `${oldName} → ${newName}`,
          recordedBy,
          verified: true,
          shieldsConsumed: 0,
          isHighSensitivity: false,
          studentCardSide: student.cardSide,
        timePeriodId: selectedTimePeriodId || undefined,
        });
        results.push({ studentId, studentName: student.name, message: `回升成功：${oldName} → ${newName}`, levelChanged: true, flipped: false, shieldUsed: false, reachedImmortal: false, shieldsGained: 0 });
      } else {
        const missing: string[] = [];
        if (student.consecutiveNoViolationDays < daysRequired) missing.push(`还需${daysRequired - student.consecutiveNoViolationDays}天无违纪`);
        if (!(student.riseTaskCompleted ?? false)) missing.push('请先标记回升任务完成');
        results.push({ studentId, studentName: student.name, message: `条件不满足：${missing.join('，') || '请检查回升条件'}`, levelChanged: false, flipped: false, shieldUsed: false, reachedImmortal: false, shieldsGained: 0 });
      }
    }

    setBatchResults(results);
    setShieldResults(null);
    localStorage.setItem('last_recorder', recordedBy);
    const synced = await syncAfterChange(results.some(r => r.levelChanged) ? `${results.filter(r => r.levelChanged).length}人回升成功并同步` : '已同步');
    if (!synced) return;
    setStudentCounts({});
    setSelectedStudentIds([]);

    if (results.some(r => r.levelChanged)) {
      showToast(`${results.filter(r => r.levelChanged).length}人回升成功！`);
    }
  };

  const summaryStats = useMemo(() => {
    if (!batchResults) return null;
    return {
      total: batchResults.length,
      levelChanged: batchResults.filter(r => r.levelChanged).length,
      flipped: batchResults.filter(r => r.flipped).length,
      shieldUsed: batchResults.filter(r => r.shieldUsed).length,
      reachedImmortal: batchResults.filter(r => r.reachedImmortal).length,
      shieldsGained: batchResults.reduce((sum, r) => sum + r.shieldsGained, 0),
      autoShields: shieldResults?.length ?? 0,
    };
  }, [batchResults, shieldResults]);

  const renderBehaviorDateButtons = (compact = false) => (
    <div style={{
      display: 'flex',
      gap: 6,
      overflowX: compact ? 'auto' : undefined,
      flexWrap: compact ? 'nowrap' : 'wrap',
      paddingBottom: compact ? 2 : 0,
      WebkitOverflowScrolling: 'touch',
    }}>
      {behaviorDateOptions.map(option => {
        const selected = option.date === selectedBehaviorDate;
        return (
          <button
            key={option.date}
            type="button"
            onClick={() => setSelectedBehaviorDate(option.date)}
            style={{
              minWidth: compact ? 74 : 78,
              minHeight: compact ? 38 : 36,
              padding: compact ? '5px 8px' : '5px 10px',
              borderRadius: D.radiusXs,
              border: `1px solid ${selected ? D.borderGlow : D.border}`,
              background: selected ? D.goldDim : 'rgba(255,255,255,0.025)',
              color: selected ? D.gold : D.textMid,
              fontSize: 12,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              cursor: 'pointer',
              flex: compact ? '0 0 auto' : '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
              boxShadow: selected ? '0 0 14px rgba(212,168,83,0.10)' : 'none',
            }}
          >
            <span style={{ fontWeight: selected ? 700 : 500 }}>{option.weekdayName}</span>
            <span style={{ opacity: selected ? 0.95 : 0.72 }}>{option.shortDate}</span>
            {option.isToday && (
              <span style={{ fontSize: 10, lineHeight: 1, padding: '1px 4px', borderRadius: 3, background: selected ? 'rgba(212,168,83,0.18)' : 'rgba(255,255,255,0.06)', color: selected ? D.gold : D.textDim }}>
                今
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderBehaviorWeekSelect = (compact = false) => (
    <select
      value={behaviorWeek?.weekNumber ?? ''}
      onChange={event => handleBehaviorWeekChange(Number(event.target.value))}
      style={{
        height: compact ? 34 : 32,
        minWidth: compact ? 108 : 116,
        borderRadius: D.radiusXs,
        border: `1px solid ${D.border}`,
        background: D.bgInput,
        color: D.text,
        padding: '0 9px',
        fontSize: 12,
        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
        outline: 'none',
      }}
    >
      {config.teachingWeeks.map(week => (
        <option key={week.weekNumber} value={week.weekNumber}>
          第{week.weekNumber}周
        </option>
      ))}
    </select>
  );

  const renderRecordTimeChips = (
    record: Pick<BehaviorRecord, 'createdAt' | 'occurredDate'>,
    createdAt: string,
    recordedBy?: string,
    remark?: string,
  ) => {
    const cleanedRemark = remark?.replace(/^ruleId:[^,，]+[,，]\s*/, '');
    const behaviorDate = behaviorRecordLocalDate(record);
    const createdDate = toLocalDateStr(new Date(createdAt));
    const registeredAtLabel = isMobile && createdDate === behaviorDate
      ? new Date(createdAt).toLocaleTimeString('zh-CN', { hour: 'numeric', minute: '2-digit', hour12: false })
      : new Date(createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    if (isMobile) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'nowrap', width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 5px', borderRadius: D.radiusXs, border: '1px solid rgba(212,168,83,0.24)', background: 'rgba(212,168,83,0.08)', color: D.gold, fontSize: 10.5, lineHeight: 1.35, whiteSpace: 'nowrap', flex: '0 0 auto' }}>
            <span style={{ color: D.textDim }}>日期</span>
            <span>{formatBehaviorRecordDateLabel(record, config.teachingWeeks)}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 5px', borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.03)', color: D.textMid, fontSize: 10.5, lineHeight: 1.35, whiteSpace: 'nowrap', flex: '0 0 auto' }}>
            <span style={{ color: D.textDim }}>登记</span>
            <span>{registeredAtLabel}</span>
            {recordedBy && <span style={{ color: D.text }}>{recordedBy}</span>}
          </span>
          {cleanedRemark && (
            <span style={{ color: D.textDim, fontSize: 11, lineHeight: 1.45, whiteSpace: 'nowrap', flex: '0 0 auto' }}>
              {cleanedRemark}
            </span>
          )}
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: isMobile ? 4 : 5, flexWrap: isMobile ? 'nowrap' : 'wrap', minWidth: 0, width: isMobile ? '100%' : undefined }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: isMobile ? '2px 5px' : '2px 7px', borderRadius: D.radiusXs, border: '1px solid rgba(212,168,83,0.24)', background: 'rgba(212,168,83,0.08)', color: D.gold, fontSize: 11, lineHeight: 1.35, whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ color: D.textDim }}>行为日期</span>
          <span>{formatBehaviorRecordDateLabel(record, config.teachingWeeks)}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: isMobile ? '2px 5px' : '2px 7px', borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.03)', color: D.textMid, fontSize: 11, lineHeight: 1.35, whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ color: D.textDim }}>登记</span>
          <span>{registeredAtLabel}</span>
          {recordedBy && <span style={{ color: D.text }}>{recordedBy}</span>}
        </span>
        {cleanedRemark && (
          <span style={{ color: D.textDim, fontSize: 11, lineHeight: 1.35 }}>
            {cleanedRemark}
          </span>
        )}
      </div>
    );
  };

  if (isMobile) {
    const selectedStudents = selectedStudentIds
      .map(id => students.find(student => student.id === id))
      .filter(Boolean) as typeof students;
    const submitDisabled = isSyncing || (direction === 'rise'
      ? selectedStudentIds.length === 0
      : (selectedStudentIds.length === 0 || !selectedBehaviorId || (requiresTimePeriod && !selectedTimePeriodId) || (requiresHomeworkDetail && (!selectedHomeworkSubjectId || !homeworkTitle.trim()))));
    const submitLabel = isSyncing
      ? '正在同步...'
      : direction === 'rise'
        ? '确认完成回升任务'
        : isLimitedCategory
          ? '记录限时活动'
          : direction === 'negative'
            ? `记录${config.blankMarkName}行为`
            : '记录正面行为';

    return (
      <MobilePage>
        <MobileSection title={behaviorDateTitle} subtitle="切换后，本轮登记沿用这个日期">
          <div style={{ marginBottom: 8 }}>
            {renderBehaviorWeekSelect(true)}
          </div>
          {renderBehaviorDateButtons(true)}
        </MobileSection>

        <MobileSection title="选学生" subtitle={selectedStudentIds.length > 0 ? `已选 ${selectedStudentIds.length} 人` : '可多次点击同一学生增加次数'}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: D.textDim }} />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="姓名或序号"
                style={{
                  width: '100%',
                  height: 38,
                  boxSizing: 'border-box',
                  padding: '0 10px 0 32px',
                  borderRadius: D.radiusXs,
                  border: `1px solid ${D.border}`,
                  background: D.bgInput,
                  color: D.text,
                  outline: 'none',
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                }}
              />
            </div>
            <button type="button" onClick={selectAll} style={{ borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: D.bgCard, color: D.textMid, padding: '0 10px', fontSize: 12 }}>全选</button>
            <button type="button" onClick={deselectAll} style={{ borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: D.bgCard, color: D.textDim, padding: '0 10px', fontSize: 12 }}>清空</button>
          </div>

          {selectedStudents.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {selectedStudents.map(student => {
                const count = studentCounts[student.id] || 1;
                return (
                  <span key={student.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%', padding: '5px 8px', borderRadius: D.radiusXs, background: D.goldDim, border: `1px solid ${D.borderGlow}`, color: D.gold, fontSize: 12 }}>
                    <span className="student-name" style={{ overflowWrap: 'break-word' }}>{student.name}</span>
                    {count > 1 && <b>×{count}</b>}
                    {count > 1 && <button type="button" onClick={() => decrementStudentCount(student.id)} style={{ border: 0, background: 'transparent', color: D.gold, padding: 0, fontSize: 14 }}>−</button>}
                    <button type="button" onClick={() => removeStudent(student.id)} style={{ border: 0, background: 'transparent', color: D.gold, padding: 0, display: 'flex' }}><X size={12} /></button>
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ maxHeight: 264, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, paddingRight: 2 }}>
            {filteredStudents.map(student => {
              const selected = selectedStudentIds.includes(student.id);
              const count = studentCounts[student.id] || 1;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  style={{
                    minHeight: 48,
                    borderRadius: D.radiusXs,
                    border: `1px solid ${selected ? D.borderGlow : D.border}`,
                    background: selected ? D.goldDim : (student.cardSide === 'back' ? 'rgba(212,122,40,0.08)' : 'rgba(255,255,255,0.025)'),
                    color: selected ? D.gold : D.text,
                    fontSize: 12,
                    fontWeight: selected ? 700 : 500,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    minWidth: 0,
                  }}
                >
                  <span className="student-name" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</span>
                  <span style={{ fontSize: 10, color: selected ? D.gold : D.textDim }}>#{student.number}{selected && count > 1 ? ` ×${count}` : ''}</span>
                </button>
              );
            })}
          </div>
        </MobileSection>

        <MobileSection title="记录人和方向">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {(config.committeeNames ?? ['王老师']).map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setRecordedBy(name)}
                style={{
                  minHeight: 34,
                  padding: '6px 10px',
                  borderRadius: D.radiusXs,
                  border: `1px solid ${recordedBy === name ? D.borderGlow : D.border}`,
                  background: recordedBy === name ? D.goldDim : D.bgCard,
                  color: recordedBy === name ? D.gold : D.textMid,
                  fontSize: 12,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <MobileSegmentedControl
            value={direction}
            onChange={value => {
              setDirection(value);
              setSelectedBehaviorId('');
              setBatchResults(null);
              setShieldResults(null);
              setIsLimitedCategory(false);
            }}
            columns={3}
            options={[
              { value: 'negative', label: '负面', tone: 'red' },
              { value: 'positive', label: '正面', tone: 'gold' },
              { value: 'rise', label: '回升', tone: 'green' },
            ]}
          />
        </MobileSection>

        {direction !== 'rise' ? (
          <MobileSection title="选行为" subtitle={selectedBehavior ? selectedBehavior.name : '先选类别，再选具体行为'}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
              {config.categories.map(cat => {
                const selected = !isLimitedCategory && selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setIsLimitedCategory(false); handleCategoryChange(cat as Category); }}
                    style={{
                      flexShrink: 0,
                      minHeight: 34,
                      padding: '6px 12px',
                      borderRadius: D.radiusXs,
                      border: `1px solid ${selected ? D.borderGlow : D.border}`,
                      background: selected ? D.goldDim : D.bgCard,
                      color: selected ? D.gold : D.textMid,
                      fontSize: 12,
                      fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
              {activeLimitedEvents.filter(event => event.direction === direction).length > 0 && (
                <button
                  type="button"
                  onClick={() => { setIsLimitedCategory(true); setSelectedBehaviorId(''); }}
                  style={{
                    flexShrink: 0,
                    minHeight: 34,
                    padding: '6px 12px',
                    borderRadius: D.radiusXs,
                    border: `1px solid ${isLimitedCategory ? 'rgba(232,160,48,0.55)' : D.border}`,
                    background: isLimitedCategory ? 'rgba(232,160,48,0.16)' : D.bgCard,
                    color: isLimitedCategory ? '#E8A030' : D.textMid,
                    fontSize: 12,
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  }}
                >
                  限时活动
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {behaviors.map(behavior => {
                const selected = selectedBehaviorId === behavior.id;
                const behaviorDirection = isLimitedCategory ? behavior.direction : direction;
                const isNeg = behaviorDirection === 'negative';
                const weightName = isNeg
                  ? config.negativeWeightNames[behavior.weight as NegativeWeight]
                  : config.positiveWeightNames[behavior.weight as PositiveWeight];
                return (
                  <button
                    key={behavior.id}
                    type="button"
                    onClick={() => setSelectedBehaviorId(behavior.id)}
                    style={{
                      textAlign: 'left',
                      borderRadius: D.radiusSm,
                      border: `1px solid ${selected ? D.borderGlow : D.border}`,
                      background: selected ? D.bgCardHover : D.bgCard,
                      padding: 10,
                      color: D.text,
                      fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <span style={{ flex: '1 1 180px', minWidth: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45, overflowWrap: 'break-word' }}>{behavior.name}</span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: isNeg ? D.cinnabar : D.blue, background: isNeg ? D.cinnabarDim : D.blueDim, borderRadius: D.radiusXs, padding: '3px 7px' }}>
                        {weightName}
                      </span>
                    </div>
                    {selected && behavior.description && behavior.description !== behavior.name && (
                      <div style={{ marginTop: 7, paddingTop: 7, borderTop: `1px solid ${D.border}`, color: D.textMid, fontSize: 12, lineHeight: 1.55, overflowWrap: 'break-word' }}>
                        {behavior.description}
                      </div>
                    )}
                    {selected && isInverseSelectable && isNeg && (
                      <label style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: D.blue, fontSize: 12 }}>
                        <input type="checkbox" checked={enableInverse} onChange={event => setEnableInverse(event.target.checked)} />
                        本次启用反选护盾
                      </label>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedBehaviorId && requiresTimePeriod && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: D.textMid, marginBottom: 6 }}>行为发生时间</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {timePeriods.map(period => (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => setSelectedTimePeriodId(period.id)}
                      style={{
                        minHeight: 32,
                        padding: '5px 10px',
                        borderRadius: D.radiusXs,
                        border: `1px solid ${selectedTimePeriodId === period.id ? D.borderGlow : D.border}`,
                        background: selectedTimePeriodId === period.id ? D.goldDim : D.bgCard,
                        color: selectedTimePeriodId === period.id ? D.gold : D.textMid,
                        fontSize: 12,
                      }}
                    >
                      {period.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedBehaviorId && requiresHomeworkDetail && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: D.radiusSm, background: 'rgba(139,170,122,0.08)', border: '1px solid rgba(139,170,122,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#b7d1a8', fontWeight: 700 }}>未交作业详情</span>
                  <span style={{ fontSize: 10, color: '#b7d1a8', padding: '2px 6px', borderRadius: D.radiusXs, background: 'rgba(139,170,122,0.12)' }}>必填</span>
                </div>
                <div style={{ fontSize: 12, color: D.textMid, marginBottom: 6 }}>学科</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {homeworkSubjects.map(subject => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => setSelectedHomeworkSubjectId(subject.id)}
                      style={{
                        minHeight: 30,
                        padding: '5px 9px',
                        borderRadius: D.radiusXs,
                        border: `1px solid ${selectedHomeworkSubjectId === subject.id ? 'rgba(139,170,122,0.65)' : D.border}`,
                        background: selectedHomeworkSubjectId === subject.id ? 'rgba(139,170,122,0.16)' : D.bgCard,
                        color: selectedHomeworkSubjectId === subject.id ? '#cbe6b8' : D.textMid,
                        fontSize: 12,
                      }}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
                <input
                  value={homeworkTitle}
                  onChange={event => setHomeworkTitle(event.target.value)}
                  placeholder="作业名称，例如：练习册第12页"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: 38,
                    borderRadius: D.radiusXs,
                    border: `1px solid ${D.border}`,
                    background: D.bgInput,
                    color: D.text,
                    padding: '0 10px',
                    outline: 'none',
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  }}
                />
              </div>
            )}

            <input
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="备注，可选"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 38,
                marginTop: 10,
                borderRadius: D.radiusXs,
                border: `1px solid ${D.border}`,
                background: D.bgInput,
                color: D.text,
                padding: '0 10px',
                outline: 'none',
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              }}
            />
          </MobileSection>
        ) : (
          <MobileSection title="回升确认" subtitle="必须先满足零违纪天数，并手动标记任务完成">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedStudents.length === 0 ? (
                <div style={{ padding: 16, borderRadius: D.radiusXs, background: D.bgCard, border: `1px solid ${D.border}`, color: D.textDim, fontSize: 13, textAlign: 'center' }}>请先选择需要确认回升的学生</div>
              ) : selectedStudents.map(student => {
                const riseTask = config.riseTasks.find(task => task.side === 'front' && task.level === student.currentLevel);
                const daysRequired = riseTask?.riseDaysRequired ?? 0;
                const progress = daysRequired > 0 ? Math.min(100, (student.consecutiveNoViolationDays / daysRequired) * 100) : 100;
                return (
                  <div key={student.id} style={{ borderRadius: D.radiusSm, border: `1px solid ${D.border}`, background: D.bgCard, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div>
                        <div className="student-name" style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{student.name}</div>
                        <div style={{ fontSize: 12, color: D.textMid, marginTop: 2 }}>{riseTask?.riseTask ?? '当前等级没有回升任务'}</div>
                      </div>
                      <span style={{ fontSize: 11, color: student.riseTaskCompleted ? D.success : D.textDim }}>{student.riseTaskCompleted ? '任务已完成' : '任务未标记'}</span>
                    </div>
                    <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: student.consecutiveNoViolationDays >= daysRequired ? D.success : D.gold }} />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: D.textDim }}>
                      零违纪 {student.consecutiveNoViolationDays}/{daysRequired} 天
                    </div>
                  </div>
                );
              })}
            </div>
          </MobileSection>
        )}

        {(isSyncing || syncError) && (
          <MobileSection style={{ borderColor: syncError ? 'rgba(196,65,37,0.35)' : 'rgba(212,168,83,0.35)', background: syncError ? D.cinnabarDim : D.goldDim }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span style={{ color: syncError ? D.cinnabar : D.gold, fontSize: 13 }}>{isSyncing ? '正在同步，请不要立即关闭页面' : '同步失败，请检查网络后重试'}</span>
              {syncError && <button type="button" onClick={retrySync} style={{ borderRadius: D.radiusXs, border: `1px solid rgba(196,65,37,0.4)`, background: 'rgba(0,0,0,0.16)', color: D.cinnabar, padding: '5px 10px' }}>重试</button>}
            </div>
          </MobileSection>
        )}

        {batchResults && summaryStats && (
          <MobileSection title={`记录完成 · ${summaryStats.total}人`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {batchResults.map(result => (
                <div key={`${result.studentId}-${result.message}`} style={{ padding: 8, borderRadius: D.radiusXs, background: D.bgCard, border: `1px solid ${D.border}` }}>
                  <div className="student-name" style={{ fontSize: 13, color: D.text, fontWeight: 700 }}>{result.studentName}</div>
                  <div style={{ fontSize: 12, color: D.textMid, lineHeight: 1.5, marginTop: 3 }}>{result.message}</div>
                  {result.flipped && (
                    <button type="button" onClick={() => navigate(`/card/${result.studentId}?flipped=true`)} style={{ marginTop: 6, borderRadius: D.radiusXs, border: `1px solid rgba(212,122,40,0.35)`, background: 'rgba(212,122,40,0.12)', color: D.flameGold, padding: '4px 8px', fontSize: 12 }}>
                      查看翻面仪式
                    </button>
                  )}
                </div>
              ))}
            </div>
          </MobileSection>
        )}

        <MobileSection title="最近记录">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {groupedRecords.slice(0, 20).map(group => {
              const isNeg = group.direction === 'negative';
              const isExpanded = expandedGroups.has(group.key);
              const names = group.compactStudentNames;
              const hasHiddenNames = names.length > 4;
              const showExpand = hasHiddenNames || group.specialConsequenceRows.length > 0;
              const displayNames = hasHiddenNames && !isExpanded ? names.slice(0, 4) : names;
              const timePeriodName = group.records[0].timePeriodId ? timePeriods.find(tp => tp.id === group.records[0].timePeriodId)?.name : '';
              const effectColor = isNeg ? D.cinnabar : D.blue;
              const effectBg = isNeg ? 'rgba(196,65,37,0.10)' : 'rgba(123,139,181,0.10)';
              const expandLabel = group.specialConsequenceRows.length > 0
                ? (isExpanded ? '收起明细' : '查看处理明细')
                : (isExpanded ? '收起名单' : `查看全部${group.uniqueStudentCount}人`);
              return (
                <div
                  key={group.key}
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '28px minmax(0, 1fr)',
                    gap: 10,
                    alignItems: 'start',
                    padding: '12px 0',
                    borderBottom: `1px solid ${D.border}`,
                    minWidth: 0,
                  }}
                >
                  <span style={{ width: 28, height: 28, borderRadius: D.radiusXs, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isNeg ? D.cinnabarDim : D.blueDim, color: effectColor }}>
                    {isNeg ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                  </span>

                  <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                    <div style={{ display: 'grid', gap: 3, minWidth: 0, paddingRight: canDeleteRecord ? 30 : 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: D.text, lineHeight: 1.45, wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                        {group.description}
                        {timePeriodName && <span style={{ color: D.gold, fontSize: 12, marginLeft: 5, whiteSpace: 'nowrap' }}>@{timePeriodName}</span>}
                      </div>
                      <div className="student-name" style={{ fontSize: 13, color: D.textMid, lineHeight: 1.45, wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', marginRight: 6, borderRadius: D.radiusXs, border: `1px solid ${isNeg ? 'rgba(196,65,37,0.16)' : 'rgba(123,139,181,0.16)'}`, background: effectBg, color: effectColor, fontSize: 11, lineHeight: 1.35, fontWeight: 600, verticalAlign: 'baseline' }}>
                          {group.baseEffectLabel}
                        </span>
                        {displayNames.join('、')}{hasHiddenNames && !isExpanded ? ` 等${group.uniqueStudentCount}人` : ''}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: D.textDim, lineHeight: 1.45 }}>
                      {renderRecordTimeChips(group.records[0], group.createdAt, group.recordedBy)}
                    </div>
                    {group.cleanRemark && (
                      <div style={{ fontSize: 12, color: D.textMid, lineHeight: 1.45, wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                        备注：{group.cleanRemark}
                      </div>
                    )}

                    {(group.hasShields || showExpand) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'nowrap', width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 1, lineHeight: 1.45 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                        {group.hasShields && <span style={{ fontSize: 11, color: D.blue, background: 'rgba(123,139,181,0.10)', border: '1px solid rgba(123,139,181,0.16)', borderRadius: D.radiusXs, padding: '1px 6px', lineHeight: 1.45 }}>护盾-{group.totalShields}</span>}
                      </div>
                      {showExpand && (
                        <span
                          tabIndex={0}
                          onClick={() => setExpandedGroups(prev => {
                            const next = new Set(prev);
                            if (next.has(group.key)) next.delete(group.key);
                            else next.add(group.key);
                            return next;
                          })}
                          onKeyDown={event => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            setExpandedGroups(prev => {
                              const next = new Set(prev);
                              if (next.has(group.key)) next.delete(group.key);
                              else next.add(group.key);
                              return next;
                            });
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 22,
                            padding: '1px 7px',
                            borderRadius: D.radiusXs,
                            border: '1px solid rgba(212,168,83,0.24)',
                            background: 'rgba(212,168,83,0.07)',
                            color: D.gold,
                            fontSize: 12,
                            lineHeight: 1.45,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            outline: 'none',
                            maxWidth: '100%',
                          }}
                        >
                          {expandLabel}
                        </span>
                      )}
                    </div>
                    )}

                    {isExpanded && group.specialConsequenceRows.length > 0 && (
                      <div style={{ display: 'grid', gap: 6, padding: '8px 9px', borderRadius: D.radiusXs, background: 'rgba(255,255,255,0.025)', border: `1px solid ${D.border}`, lineHeight: 1.45 }}>
                        <div style={{ fontSize: 11, color: D.textDim, lineHeight: 1.45 }}>处理明细</div>
                        {group.specialConsequenceRows.map(row => (
                          <div key={`${row.studentId}-${row.consequence.fullLabel}`} style={{ display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr)', gap: 8, alignItems: 'baseline', fontSize: 12, lineHeight: 1.45 }}>
                            <span className="student-name" style={{ color: D.text, fontWeight: 600, minWidth: 0 }}>{row.name}</span>
                            <span style={{ color: row.consequence.resultLabel.includes('心魔') ? D.cinnabar : D.gold, minWidth: 0, overflowWrap: 'break-word' }}>{row.consequence.fullLabel}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {canDeleteRecord && (
                    <div style={{ position: 'absolute', top: 12, right: 0, zIndex: 2 }}>
                    {showDeleteConfirm === group.allIds[0] ? (
                      <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
                        <span onClick={async () => { const deletedIds = [...group.allIds]; deletedIds.forEach(id => deleteBehaviorRecord(id)); const synced = await syncAfterChange(`已删除并同步 ${group.allIds.length} 条记录`, { explicitDeletedRecordIds: deletedIds }); if (synced) setShowDeleteConfirm(null); }} style={{ borderRadius: D.radiusXs, border: `1px solid rgba(196,65,37,0.4)`, background: D.cinnabarDim, color: D.cinnabar, padding: '2px 6px', fontSize: 11, lineHeight: 1.45, cursor: 'pointer', whiteSpace: 'nowrap' }}>确认</span>
                        <span onClick={() => setShowDeleteConfirm(null)} style={{ borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: D.bgCard, color: D.textDim, padding: '2px 6px', fontSize: 11, lineHeight: 1.45, cursor: 'pointer', whiteSpace: 'nowrap' }}>取消</span>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowDeleteConfirm(group.allIds[0])} style={{ width: 26, height: 26, minWidth: 26, minHeight: 26, padding: 0, borderRadius: D.radiusXs, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.025)', color: D.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    )
                    }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </MobileSection>

        <MobileActionBar>
          <button
            type="button"
            onClick={direction === 'rise' ? handleRiseSubmit : handleSubmit}
            disabled={submitDisabled}
            style={{
              width: '100%',
              minHeight: 48,
              borderRadius: D.radiusSm,
              border: 'none',
              background: submitDisabled
                ? D.bgCard
                : direction === 'negative'
                  ? `linear-gradient(135deg, #9a3820, ${D.cinnabar})`
                  : direction === 'rise'
                    ? 'linear-gradient(135deg, #3d8a4f, #68c87a)'
                    : `linear-gradient(135deg, #b8942e, ${D.flameGold})`,
              color: submitDisabled ? D.textDim : '#fff',
              fontSize: 15,
              fontWeight: 800,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              boxShadow: submitDisabled ? 'none' : D.goldGlow,
            }}
          >
            {submitLabel}{selectedStudentIds.length > 0 ? `（${selectedStudentIds.length}人）` : ''}
          </button>
        </MobileActionBar>
      </MobilePage>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px 48px', position: 'relative', background: 'transparent' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{
            fontSize: 24, fontWeight: 700, color: D.text, margin: 0,
            letterSpacing: '0.02em',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            行为录入
          </h2>
        </div>

        <div style={{
          marginBottom: 18,
          padding: '11px 12px',
          borderRadius: D.radiusSm,
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${D.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 9, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: D.text, fontWeight: 700 }}>{behaviorDateTitle}</span>
              {renderBehaviorWeekSelect(false)}
            </div>
            <span style={{ fontSize: 11, color: D.textDim }}>
              本轮登记沿用：{formatBehaviorRecordDateLabel({ createdAt: new Date().toISOString(), occurredDate: selectedBehaviorDate }, config.teachingWeeks)}
            </span>
          </div>
          {renderBehaviorDateButtons(false)}
        </div>

        {/* Student multi-select */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: D.textMid, fontWeight: 500, letterSpacing: '0.02em' }}>选择学生</span>
            <span style={{ fontSize: 11, color: selectedStudentIds.length > 0 ? D.gold : D.textDim }}>
              已选 {selectedStudentIds.length} 人
            </span>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.textDim }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入姓名或学号快速定位..."
              style={{
                width: '100%', padding: '10px 14px 10px 36px', borderRadius: D.radiusSm,
                background: D.bgInput, border: `1px solid ${D.border}`,
                color: D.text, fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Pinyin initial jump bar */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {availableInitials.map(letter => {
              const isActive = selectedInitial === letter;
              return (
                <button
                  key={letter}
                  onClick={() => setSelectedInitial(prev => prev === letter ? '' : letter)}
                  style={{
                    padding: '2px 4px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer',
                    background: isActive ? D.goldDim : 'transparent',
                    border: isActive ? `1px solid ${D.borderGlow}` : '1px solid transparent',
                    color: isActive ? D.gold : D.textDim,
                    fontWeight: isActive ? 600 : 400,
                    minWidth: 18, textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={selectAll} style={{ padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', background: D.goldDim, border: `1px solid ${D.borderGlow}`, color: D.gold, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.25s ease' }}>
              <Users size={12} /> 全选
            </button>
            <button onClick={deselectAll} style={{ padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', background: D.bgCard, border: `1px solid ${D.border}`, color: D.textMid, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.25s ease' }}>
              <X size={12} /> 取消全选
            </button>
          </div>

          <div style={{ maxHeight: 240, overflowY: 'auto', borderRadius: D.radius, background: D.bgGlass, border: D.glassBorder, padding: 8 }}>
            {Object.entries(groupedStudents).map(([groupLabel, groupStudents]) => (
              <div key={groupLabel} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: D.textDim, padding: '2px 4px', fontWeight: 500 }}>{groupLabel}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {groupStudents.map(s => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    const count = studentCounts[s.id] || 0;
                    const isBlacklisted = !!(selectedBehavior?.behaviorBlacklist && selectedBehavior.behaviorBlacklist.includes(s.id));
                    return (
                      <button key={s.id} onClick={() => !isBlacklisted && toggleStudent(s.id)} onContextMenu={(e) => { e.preventDefault(); if (isSelected) decrementStudentCount(s.id); }} style={{
                        padding: '4px 10px', borderRadius: D.radiusSm, fontSize: 12,
                        cursor: isBlacklisted ? 'not-allowed' : 'pointer',
                        background: isBlacklisted ? D.bgCard : (isSelected ? D.goldDim : D.bgCard),
                        border: isBlacklisted ? `1px solid ${D.border}` : (isSelected ? `1px solid ${D.borderGlow}` : `1px solid ${D.border}`),
                        color: isBlacklisted ? D.textDim : (isSelected ? D.gold : D.textMid),
                        textDecoration: isBlacklisted ? 'line-through' : 'none',
                        opacity: isBlacklisted ? 0.5 : 1,
                        transition: 'all 0.15s ease',
                        boxShadow: isBlacklisted ? 'none' : (isSelected ? D.goldGlow : 'none'),
                        position: 'relative',
                      }}>
                        <span className="student-name">{s.number}.{s.name}</span>
                        {isSelected && count > 1 && (
                          <span style={{
                            position: 'absolute', top: -6, right: -6,
                            background: D.cinnabar, color: '#fff', borderRadius: '50%',
                            width: 16, height: 16, fontSize: 10, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1,
                          }}>×{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedStudentIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {selectedStudentIds.map(id => {
                const s = students.find(st => st.id === id);
                if (!s) return null;
                const count = studentCounts[id] || 1;
                return (
                  <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: D.radiusSm, fontSize: 12, background: D.goldDim, border: `1px solid ${D.borderHover}`, color: D.gold }}>
                    <span className="student-name">{s.name}</span>
                    {count > 1 && <span style={{ background: D.cinnabar, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>×{count}</span>}
                    {count > 1 && (
                      <button onClick={() => decrementStudentCount(id)} style={{ background: 'none', border: 'none', color: D.gold, cursor: 'pointer', padding: 0, display: 'flex', fontSize: 14, lineHeight: 1 }} title="减少次数">
                        −
                      </button>
                    )}
                    <button onClick={() => removeStudent(id)} style={{ background: 'none', border: 'none', color: D.gold, cursor: 'pointer', padding: 0, display: 'flex' }}>
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Recorder selector */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: D.textDim, whiteSpace: 'nowrap' }}>记录人</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(config.committeeNames ?? ['王老师']).map(name => (
              <button
                key={name}
                onClick={() => setRecordedBy(name)}
                style={{
                  padding: '4px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
                  background: recordedBy === name ? D.goldDim : D.bgCard,
                  border: `1px solid ${recordedBy === name ? D.borderGlow : D.border}`,
                  color: recordedBy === name ? D.gold : D.textDim,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  transition: 'all 0.25s ease',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Direction toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => { setDirection('negative'); setSelectedBehaviorId(''); setBatchResults(null); setShieldResults(null); setIsLimitedCategory(false); }}
            style={{
              flex: 1, padding: '12px', borderRadius: D.radiusSm, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: direction === 'negative' ? D.bgGlass : D.bgCard,
              border: direction === 'negative' ? `1px solid rgba(196,65,37,0.4)` : `1px solid ${D.border}`,
              color: direction === 'negative' ? D.cinnabar : D.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.25s ease',
              boxShadow: direction === 'negative' ? D.cinnabarGlow : 'none',
            }}
          >
            <XCircle size={16} /> 负面行为（星蚀/心魔）
          </button>
          <button
            onClick={() => { setDirection('positive'); setSelectedBehaviorId(''); setBatchResults(null); setShieldResults(null); setIsLimitedCategory(false); }}
            style={{
              flex: 1, padding: '12px', borderRadius: D.radiusSm, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: direction === 'positive' ? D.bgGlass : D.bgCard,
              border: direction === 'positive' ? `1px solid ${D.borderGlow}` : `1px solid ${D.border}`,
              color: direction === 'positive' ? D.gold : D.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.25s ease',
              boxShadow: direction === 'positive' ? D.goldGlow : 'none',
            }}
          >
            <CheckCircle2 size={16} /> 正面行为（护盾/火种）
          </button>
          <button
            onClick={() => { setDirection('rise'); setSelectedBehaviorId(''); setBatchResults(null); setShieldResults(null); setIsLimitedCategory(false); }}
            style={{
              flex: 1, padding: '12px', borderRadius: D.radiusSm, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: direction === 'rise' ? D.bgGlass : D.bgCard,
              border: direction === 'rise' ? `1px solid rgba(100,200,130,0.4)` : `1px solid ${D.border}`,
              color: direction === 'rise' ? '#68c87a' : D.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.25s ease',
              boxShadow: direction === 'rise' ? '0 0 16px rgba(100,200,130,0.15)' : 'none',
            }}
          >
            <TrendingUp size={16} /> 完成回升任务
          </button>
        </div>

        {/* Positive behavior hint */}
        {direction === 'positive' && selectedStudentIds.length > 0 && (
          <div style={{
            padding: '8px 12px', borderRadius: D.radiusSm, marginBottom: 10, fontSize: 12,
            background: D.blueDim, border: `1px solid rgba(123,139,181,0.2)`,
            color: D.blue, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Shield size={14} />
            正面卡片学生获得护盾，背面卡片学生获得火种
          </div>
        )}

        {/* Rise task hint */}
        {direction === 'rise' && (
          <div style={{
            padding: '8px 12px', borderRadius: D.radiusSm, marginBottom: 10, fontSize: 12,
            background: 'rgba(100,200,130,0.08)', border: '1px solid rgba(100,200,130,0.25)',
            color: '#68c87a', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <TrendingUp size={14} />
            选择正面等级2-6的学生，确认其已完成回升任务。需满足连续无违纪天数要求。
          </div>
        )}

        {/* Category selection — only for negative/positive */}
        {direction !== 'rise' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {config.categories.map(cat => {
            const color = CATEGORY_COLORS[cat];
            const isSelected = !isLimitedCategory && selectedCategory === cat;
            return (
              <button key={cat} onClick={() => { setIsLimitedCategory(false); handleCategoryChange(cat as Category); }} style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                background: isSelected ? `${color}33` : D.bgCard,
                border: `1px solid ${isSelected ? `${color}80` : D.border}`,
                color: isSelected ? color : D.textDim,
                boxShadow: isSelected ? `0 0 12px ${color}25` : 'none',
                transition: 'all 0.25s ease',
              }}>
                {cat}
              </button>
            );
          })}
          {activeLimitedEvents.filter(e => e.direction === direction).length > 0 && (
            <button onClick={() => { setIsLimitedCategory(true); setSelectedBehaviorId(''); }} style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: isLimitedCategory ? 'rgba(232,160,48,0.2)' : D.bgCard,
              border: isLimitedCategory ? '1px solid rgba(232,160,48,0.6)' : `1px solid ${D.border}`,
              color: isLimitedCategory ? '#E8A030' : D.textDim,
              boxShadow: isLimitedCategory ? '0 0 12px rgba(232,160,48,0.2)' : 'none',
              transition: 'all 0.25s ease',
              display: 'flex', alignItems: 'center', gap: 4,
              animation: isLimitedCategory ? 'none' : 'limitedPulse 2s ease-in-out infinite',
            }}>
              <Flame size={14} style={{ color: isLimitedCategory ? '#E8A030' : undefined }} />
              限时活动
            </button>
          )}
          <style>{`
            @keyframes limitedPulse {
              0%, 100% { box-shadow: 0 0 4px rgba(232,160,48,0.1); border-color: ${D.border}; }
              50% { box-shadow: 0 0 12px rgba(232,160,48,0.25); border-color: rgba(232,160,48,0.4); }
            }
          `}</style>
        </div>
        )}

        {/* Behavior list — only for negative/positive */}
        {direction !== 'rise' && (
        <div style={{
          transform: slidePhase === 'out'
            ? `translateX(${slideDirection === 'right' ? '-24px' : '24px'})`
            : slidePhase === 'entering'
            ? `translateX(${slideDirection === 'right' ? '24px' : '-24px'})`
            : 'translateX(0)',
          opacity: slidePhase === 'out' ? 0 : slidePhase === 'entering' ? 0 : 1,
          transition: slidePhase === 'out'
            ? 'transform 0.18s ease-in, opacity 0.18s ease-in'
            : slidePhase === 'idle2'
            ? 'transform 0.22s ease-out, opacity 0.22s ease-out'
            : 'none',
        }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {behaviors.map(b => {
            const isSelected = selectedBehaviorId === b.id;
            const bDirection = isLimitedCategory ? b.direction : direction;
            const weightName = bDirection === 'negative'
              ? config.negativeWeightNames[b.weight as NegativeWeight]
              : config.positiveWeightNames[b.weight as PositiveWeight];
            const symbol = bDirection === 'negative' ? `${b.weight}星蚀/心魔` : (bDirection === 'positive' ? `${b.weight}护盾/火种` : '');
            const limitedEvent = isLimitedCategory ? activeLimitedEvents.find(e => e.id === b.id) : undefined;

            return (
              <button
                key={b.id}
                onClick={() => setSelectedBehaviorId(b.id)}
                style={{
                  padding: '12px 16px', borderRadius: D.radiusSm, cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? D.bgCardHover : D.bgCard,
                  border: isSelected ? `1px solid ${D.borderGlow}` : `1px solid ${D.border}`,
                  color: isSelected ? D.text : D.textMid,
                  display: 'flex', flexDirection: 'column',
                  boxShadow: isSelected ? D.goldGlow : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 500, wordBreak: 'break-word' }}>{b.name}</span>
                    {(b.extraWeight ?? 0) > 0 && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 4px', marginLeft: 4,
                        borderRadius: 3,
                        background: 'rgba(232,160,48,0.2)',
                        border: '1px solid rgba(232,160,48,0.4)',
                        color: '#E8A030',
                        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                      }}>+{b.extraWeight}</span>
                    )}
                    {b.isInverseSelectable && bDirection === 'negative' && (
                      <span style={{ fontSize: 11, color: D.blue, marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <ShieldCheck size={10} /> 反选
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {b.isHighSensitivity && (
                      <span style={{ color: D.cinnabar, fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AlertTriangle size={10} /> 高敏感
                      </span>
                    )}
                    <span style={{
                      padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 12,
                      background: bDirection === 'negative' ? D.cinnabarDim : D.blueDim,
                      color: bDirection === 'negative' ? D.cinnabar : D.blue,
                    }}>
                      {weightName} {symbol}
                    </span>
                  </div>
                </div>
                {isSelected && (b.description && b.description !== b.name || limitedEvent) && (
                  <div style={{
                    fontSize: 12, color: D.textMid, marginTop: 8, paddingTop: 8,
                    borderTop: `1px solid ${D.border}`,
                    lineHeight: 1.5,
                  }}>
                    {b.description && b.description !== b.name && <div>{b.description}</div>}
                    {limitedEvent && (
                      <div style={{ fontSize: 11, color: '#E8A030', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Flame size={10} /> 活动时间：{limitedEvent.startDate} ~ {limitedEvent.endDate}
                      </div>
                    )}
                  </div>
                )}
                {isSelected && isInverseSelectable && bDirection === 'negative' && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: D.radiusSm, fontSize: 12,
                    background: D.blueDim, border: `1px solid rgba(123,139,181,0.3)`,
                    color: D.blue, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={14} />
                      {enableInverse ? '反选模式：未选中的正面卡片学生将自动获得1个护盾' : '反选模式已关闭'}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: enableInverse ? D.blue : D.textDim, flexShrink: 0 }}>
                      <input type="checkbox" checked={enableInverse} onChange={e => setEnableInverse(e.target.checked)} />
                      此次反选
                    </label>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        </div>
        )}

        {/* Time period selector — only when behavior requires it */}
        {direction !== 'rise' && selectedBehaviorId && requiresTimePeriod && (
          <div style={{
            marginBottom: 20,
            padding: '18px 18px 14px',
            borderRadius: D.radiusSm,
            background: 'linear-gradient(135deg, rgba(212,168,83,0.04), rgba(212,168,83,0.01))',
            border: `1px solid ${D.borderGlow}`,
            boxShadow: '0 0 30px rgba(212,168,83,0.06), inset 0 1px 0 rgba(212,168,83,0.04)',
            animation: 'fadeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              paddingBottom: 10,
              borderBottom: `1px solid rgba(255,255,255,0.04)`,
            }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>🕐</span>
              <span style={{ fontSize: 14, color: D.text, fontWeight: 500, letterSpacing: '0.02em' }}>选择行为发生时间</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: D.radiusXs,
                background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.25)',
                color: D.gold, letterSpacing: '0.05em',
              }}>必选</span>
            </div>
            {(() => {
              const subjectPeriods = timePeriods.filter(tp => tp.group !== 'other');
              const otherPeriods = timePeriods.filter(tp => tp.group === 'other');
              return (
                <>
                  <div style={{ fontSize: 10, color: D.textDim, letterSpacing: '0.08em', marginBottom: 7, textTransform: 'uppercase' }}>
                    学科课程
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {subjectPeriods.map(tp => {
                      const isSelected = selectedTimePeriodId === tp.id;
                      return (
                        <span key={tp.id}
                          onClick={() => setSelectedTimePeriodId(tp.id)}
                          style={{
                            padding: '7px 15px', borderRadius: D.radiusXs, fontSize: 13,
                            cursor: 'pointer', userSelect: 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: isSelected ? D.goldDim : 'rgba(255,255,255,0.02)',
                            border: isSelected ? `1px solid rgba(212,168,83,0.35)` : `1px solid ${D.border}`,
                            color: isSelected ? D.gold : D.textMid,
                            boxShadow: isSelected ? '0 0 12px rgba(212,168,83,0.15)' : 'none',
                            animation: isSelected ? 'chipSelect 0.25s ease' : 'none',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) {
                              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                              (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) {
                              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                              (e.target as HTMLElement).style.borderColor = D.border;
                            }
                          }}
                        >{tp.name}</span>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: D.textDim, letterSpacing: '0.08em', marginBottom: 7, textTransform: 'uppercase' }}>
                    其他时段
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {otherPeriods.map(tp => {
                      const isSelected = selectedTimePeriodId === tp.id;
                      return (
                        <span key={tp.id}
                          onClick={() => setSelectedTimePeriodId(tp.id)}
                          style={{
                            padding: '7px 15px', borderRadius: D.radiusXs, fontSize: 13,
                            cursor: 'pointer', userSelect: 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: isSelected ? D.goldDim : 'rgba(255,255,255,0.02)',
                            border: isSelected ? `1px solid rgba(212,168,83,0.35)` : `1px solid ${D.border}`,
                            color: isSelected ? D.gold : D.textMid,
                            boxShadow: isSelected ? '0 0 12px rgba(212,168,83,0.15)' : 'none',
                            animation: isSelected ? 'chipSelect 0.25s ease' : 'none',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) {
                              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                              (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) {
                              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                              (e.target as HTMLElement).style.borderColor = D.border;
                            }
                          }}
                        >{tp.name}</span>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Rise task list — only for rise direction */}
        {direction === 'rise' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {(() => {
            const riseStudents = selectedStudentIds
              .map(id => students.find(s => s.id === id))
              .filter((s): s is NonNullable<typeof s> => !!s && s.cardSide === 'front' && s.currentLevel >= 2);

            if (riseStudents.length === 0) {
              return (
                <div style={{ padding: 24, textAlign: 'center', color: D.textDim, fontSize: 14, background: D.bgCard, borderRadius: D.radiusSm, border: `1px solid ${D.border}` }}>
                  请选择正面等级2-6的学生
                </div>
              );
            }

            return riseStudents.map(student => {
              const riseTask = config.riseTasks.find(t => t.side === 'front' && t.level === student.currentLevel);
              if (!riseTask) return null;
              const daysRequired = riseTask.riseDaysRequired ?? 0;
              const currentDays = student.consecutiveNoViolationDays;
              const taskDone = student.riseTaskCompleted ?? false;
              const canRise = currentDays >= daysRequired && taskDone;
              const progress = daysRequired > 0 ? Math.min(100, (currentDays / daysRequired) * 100) : 0;

              return (
                <div key={student.id} style={{
                  padding: '12px 16px', borderRadius: D.radiusSm,
                  background: canRise ? 'rgba(100,200,130,0.06)' : D.bgCard,
                  border: canRise ? '1px solid rgba(100,200,130,0.3)' : `1px solid ${D.border}`,
                  transition: 'all 0.25s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <span className="student-name" style={{ fontWeight: 500, color: D.text }}>{student.name}</span>
                      <span style={{ fontSize: 12, color: D.textMid, marginLeft: 8 }}>
                        {getLevelName(student.cardSide, student.currentLevel, config.frontLevels, config.backLevels)}
                      </span>
                    </div>
                    {canRise && (
                      <span style={{ fontSize: 11, color: '#68c87a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={12} /> 条件已满足
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: currentDays >= daysRequired ? '#68c87a' : D.gold, transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color: currentDays >= daysRequired ? '#68c87a' : D.textDim, whiteSpace: 'nowrap' }}>
                      {currentDays}/{daysRequired}天零违纪
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: D.textMid }}>
                      回升任务：{riseTask.riseTask}
                    </span>
                    {taskDone ? (
                      <button
                        disabled={isSyncing}
                        onClick={async () => {
                          updateStudent(student.id, s => ({ ...s, riseTaskCompleted: false }));
                          await syncAfterChange('回升任务状态已同步');
                        }}
                        style={{
                          padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer',
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
                          // 先标记任务完成
                          updateStudent(student.id, s => ({ ...s, riseTaskCompleted: true }));
                          // 如果天数也达标，同时触发回升（与 handleRiseSubmit 逻辑一致）
                          if (currentDays >= daysRequired) {
                            const { student: updated, rose } = processRise(
                              student, currentDays, daysRequired, true
                            );
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
                                recordedBy: recordedBy || '系统',
                                verified: true,
                                shieldsConsumed: 0,
                                isHighSensitivity: false,
                                studentCardSide: student.cardSide,
                                timePeriodId: undefined,
                              });
                              await syncAfterChange(`${student.name} 回升成功并同步：${oldName} → ${newName}`);
                            } else {
                              await syncAfterChange(`${student.name}：任务已标记完成并同步`);
                            }
                          } else {
                            await syncAfterChange(`${student.name}：任务已标记完成并同步，还需 ${daysRequired - currentDays} 天零违纪`);
                          }
                        }}
                        style={{
                          padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer',
                          background: 'rgba(100,200,130,0.08)', border: '1px solid rgba(100,200,130,0.25)',
                          color: '#68c87a',
                        }}
                      >
                        标记完成
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
        )}
        {direction !== 'rise' && selectedBehaviorId && requiresHomeworkDetail && (
        <div style={{
          marginBottom: 20,
          padding: '18px 18px 16px',
          borderRadius: D.radiusSm,
          background: 'linear-gradient(135deg, rgba(139,170,122,0.08), rgba(139,170,122,0.02))',
          border: '1px solid rgba(139,170,122,0.28)',
          boxShadow: '0 0 26px rgba(139,170,122,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>📘</span>
            <span style={{ fontSize: 14, color: D.text, fontWeight: 600 }}>未交作业详情</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: D.radiusXs, background: 'rgba(139,170,122,0.14)', border: '1px solid rgba(139,170,122,0.28)', color: '#cbe6b8' }}>必填</span>
          </div>
          <div style={{ fontSize: 10, color: D.textDim, letterSpacing: '0.08em', marginBottom: 7, textTransform: 'uppercase' }}>
            学科
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {homeworkSubjects.map(subject => {
              const isSelected = selectedHomeworkSubjectId === subject.id;
              return (
                <span
                  key={subject.id}
                  onClick={() => setSelectedHomeworkSubjectId(subject.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: D.radiusXs,
                    fontSize: 13,
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: isSelected ? 'rgba(139,170,122,0.16)' : 'rgba(255,255,255,0.02)',
                    border: isSelected ? '1px solid rgba(139,170,122,0.55)' : `1px solid ${D.border}`,
                    color: isSelected ? '#cbe6b8' : D.textMid,
                    boxShadow: isSelected ? '0 0 12px rgba(139,170,122,0.12)' : 'none',
                  }}
                >
                  {subject.name}
                </span>
              );
            })}
          </div>
          <input
            type="text"
            value={homeworkTitle}
            onChange={(e) => setHomeworkTitle(e.target.value)}
            placeholder="作业名称，例如：练习册第12页、默写订正"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: D.radiusSm, background: D.bgInput, border: `1px solid ${D.border}`, color: D.text, fontSize: 14, outline: 'none', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}
          />
        </div>
        )}
        {direction !== 'rise' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: D.textMid, fontWeight: 500, letterSpacing: '0.02em' }}>备注</span>
            <span style={{ fontSize: 10, color: D.textDim }}>可选</span>
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="补充说明..." style={{ width: '100%', padding: '10px 14px', borderRadius: D.radiusSm, background: D.bgInput, border: `1px solid ${D.border}`, color: D.text, fontSize: 14, outline: 'none' }} />
        </div>
        )}

        {/* Batch result summary */}
        {batchResults && summaryStats && (
          <div style={{ padding: 16, borderRadius: D.radiusSm, marginBottom: 16, background: D.bgGlass, border: `1px solid ${D.borderGlow}`, boxShadow: D.goldGlow }}>
            <div style={{ fontSize: 14, color: D.gold, fontWeight: 600, marginBottom: 8 }}>
              批量录入完成 · 共 {summaryStats.total} 人
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
              {summaryStats.levelChanged > 0 && <span style={{ color: D.gold }}>等级变化: {summaryStats.levelChanged}人</span>}
              {summaryStats.flipped > 0 && <span style={{ color: D.cinnabar }}>翻面: {summaryStats.flipped}人</span>}
              {summaryStats.shieldUsed > 0 && <span style={{ color: D.blue }}>消耗护盾: {summaryStats.shieldUsed}人</span>}
              {summaryStats.shieldsGained > 0 && <span style={{ color: D.blue }}>获得护盾: {summaryStats.shieldsGained}护盾</span>}
              {summaryStats.reachedImmortal > 0 && <span style={{ color: D.ember }}>不朽晨辉: {summaryStats.reachedImmortal}人</span>}
              {summaryStats.autoShields > 0 && <span style={{ color: D.success }}>反选护盾: {summaryStats.autoShields}人</span>}
            </div>
            <div style={{ marginTop: 8, maxHeight: 120, overflowY: 'auto', fontSize: 12, color: D.textMid }}>
              {batchResults.map((r, i) => (
                <div key={i} style={{ padding: '2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="student-name" style={{ color: D.text, fontWeight: 500 }}>{r.studentName}</span>: {r.message}
                  </div>
                  {r.flipped && (
                    <button
                      onClick={() => navigate(`/card/${r.studentId}?flipped=true`)}
                      style={{
                        padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer',
                        background: 'rgba(212,122,40,0.15)', border: '1px solid rgba(212,122,40,0.3)',
                        color: D.flameGold,
                      }}
                    >
                      查看翻面仪式
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-shield results */}
        {shieldResults && shieldResults.length > 0 && (
          <div style={{ padding: 12, borderRadius: D.radiusSm, marginBottom: 16, background: D.bgGlass, border: '1px solid rgba(123,139,181,0.2)' }}>
            <div style={{ fontSize: 13, color: D.blue, fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} /> 反选自动化：{shieldResults.length}人自动获得护盾
            </div>
            <div style={{ maxHeight: 80, overflowY: 'auto', fontSize: 12, color: D.textDim }}>
              {shieldResults.map((r, i) => (
                <span key={i} className="student-name">{r.studentName}{i < shieldResults.length - 1 ? '、' : ''}</span>
              ))}
            </div>
          </div>
        )}

        {/* Sync status */}
        {(isSyncing || syncError) && (
          <div style={{
            marginBottom: 10,
            padding: '10px 12px',
            borderRadius: D.radiusSm,
            background: syncError ? D.cinnabarDim : D.goldDim,
            border: `1px solid ${syncError ? 'rgba(196,65,37,0.35)' : 'rgba(212,168,83,0.35)'}`,
            color: syncError ? D.cinnabar : D.gold,
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          }}>
            <span>{isSyncing ? '正在同步到云端，请不要立即关闭页面...' : '同步失败，请检查网络后重试。'}</span>
            {syncError && (
              <button
                onClick={retrySync}
                disabled={isSyncing}
                style={{
                  padding: '4px 10px',
                  borderRadius: D.radiusXs,
                  border: '1px solid rgba(196,65,37,0.4)',
                  background: 'rgba(196,65,37,0.08)',
                  color: D.cinnabar,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                重试同步
              </button>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={direction === 'rise' ? handleRiseSubmit : handleSubmit}
          disabled={isSyncing || (direction === 'rise' ? selectedStudentIds.length === 0 : (selectedStudentIds.length === 0 || !selectedBehaviorId))}
          style={{
            width: '100%', padding: '16px', borderRadius: D.radiusSm, fontSize: 15, fontWeight: 600,
            letterSpacing: '0.04em',
            background: isSyncing ? D.bgCard : direction === 'rise'
              ? (selectedStudentIds.length > 0 ? 'linear-gradient(135deg, #3d8a4f, #68c87a)' : D.bgCard)
              : (selectedStudentIds.length > 0 && selectedBehaviorId
                ? ((isLimitedCategory ? selectedBehavior?.direction : direction) === 'negative'
                  ? `linear-gradient(135deg, #9a3820, ${D.cinnabar})`
                  : `linear-gradient(135deg, #b8942e, ${D.flameGold})`)
                : D.bgCard),
            border: 'none',
            color: !isSyncing && (direction === 'rise' ? selectedStudentIds.length > 0 : (selectedStudentIds.length > 0 && selectedBehaviorId)) ? '#fff' : D.textDim,
            cursor: !isSyncing && (direction === 'rise' ? selectedStudentIds.length > 0 : (selectedStudentIds.length > 0 && selectedBehaviorId)) ? 'pointer' : 'not-allowed',
            boxShadow: direction === 'rise'
              ? (!isSyncing && selectedStudentIds.length > 0 ? '0 0 24px rgba(100,200,130,0.25)' : 'none')
              : (selectedStudentIds.length > 0 && selectedBehaviorId
                ? ((isLimitedCategory ? selectedBehavior?.direction : direction) === 'negative'
                  ? '0 0 24px rgba(196,65,37,0.3), 0 0 48px rgba(196,65,37,0.1)'
                  : '0 0 24px rgba(212,168,83,0.3), 0 0 48px rgba(212,168,83,0.1)')
                : 'none'),
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: !isSyncing && (direction === 'rise' ? selectedStudentIds.length > 0 : (selectedStudentIds.length > 0 && selectedBehaviorId))
              ? 'submitGlow 3s ease-in-out infinite' : 'none',
            transform: (direction === 'rise' ? selectedStudentIds.length > 0 : (selectedStudentIds.length > 0 && selectedBehaviorId)) ? 'translateY(0)' : 'translateY(0)',
          }}
          onMouseEnter={e => {
            const active = !isSyncing && (direction === 'rise' ? selectedStudentIds.length > 0 : (selectedStudentIds.length > 0 && selectedBehaviorId));
            if (active) (e.target as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          {isSyncing ? '正在同步...' : direction === 'rise' ? '确认完成回升任务' : (isLimitedCategory ? `记录限时活动` : (direction === 'negative' ? `记录 ${config.blankMarkName} 行为` : '记录正面行为'))}
          {selectedStudentIds.length > 0 && ` (${selectedStudentIds.length}人)`}
        </button>

        {/* 薪火传承 — 独立入口，不依赖选择学生 */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid rgba(255,255,255,0.04)` }}>
        <div style={{ padding: 16, borderRadius: D.radiusSm, background: D.bgGlass, border: D.glassBorder }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showHeritageDonate ? 12 : 0 }}>
            <div style={{ fontSize: 13, color: '#E8A030', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              <HeritageIcon size={13} /> 薪火传承
            </div>
            <button
              onClick={() => { setShowHeritageDonate(!showHeritageDonate); setHeritageDonorId(''); setHeritageRecipientId(''); setHeritageConfirm(false); }}
              style={{
                padding: '4px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
                background: showHeritageDonate ? 'rgba(232,160,48,0.2)' : 'rgba(232,160,48,0.08)',
                border: '1px solid rgba(232,160,48,0.3)',
                color: '#E8A030', fontWeight: 500, transition: 'all 0.25s ease',
              }}
            >
              {showHeritageDonate ? '收起' : '展开'}
            </button>
          </div>
          {showHeritageDonate && (
            <div>
              {/* Donor selection */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: D.textMid, marginBottom: 4 }}>选择捐赠者（不朽晨辉同学）</div>
                {(() => {
                  const immortals = students.filter(s => s.cardSide === 'back' && s.currentLevel === 6 && s.heritagePoints > 0);
                  if (immortals.length === 0) {
                    return <div style={{ fontSize: 12, color: D.textDim }}>暂无拥有传承值的不朽晨辉同学</div>;
                  }
                  return (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {immortals.map(s => (
                        <button key={s.id} onClick={() => { setHeritageDonorId(s.id); setHeritageRecipientId(''); setHeritageConfirm(false); }}
                          style={{
                            padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
                            background: heritageDonorId === s.id ? 'rgba(232,160,48,0.2)' : D.bgCard,
                            border: heritageDonorId === s.id ? '1px solid rgba(232,160,48,0.5)' : `1px solid ${D.border}`,
                            color: heritageDonorId === s.id ? '#E8A030' : D.textMid,
                            transition: 'all 0.15s ease',
                          }}>
                          <span className="student-name">{s.name}</span> <span style={{ color: '#E8A030', display: 'inline-flex', alignItems: 'center', gap: 1 }}><HeritageIcon size={10} />{s.heritagePoints}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {/* Recipient selection */}
              {heritageDonorId && (() => {
                const donor = students.find(s => s.id === heritageDonorId);
                if (!donor) return null;
                const recipients = students.filter(s => s.cardSide === 'back' && s.heartDemonMarks > 0 && s.id !== heritageDonorId);
                return (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: D.textMid, marginBottom: 4 }}>选择受助者（有心魔的背面同学）</div>
                    {recipients.length === 0 ? (
                      <div style={{ fontSize: 12, color: D.textDim }}>暂无有心魔的背面同学</div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {recipients.map(s => (
                          <button key={s.id} onClick={() => { setHeritageRecipientId(s.id); setHeritageConfirm(false); }}
                            style={{
                              padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
                              background: heritageRecipientId === s.id ? 'rgba(139,92,138,0.2)' : D.bgCard,
                              border: heritageRecipientId === s.id ? '1px solid rgba(139,92,138,0.5)' : `1px solid ${D.border}`,
                              color: heritageRecipientId === s.id ? '#8B5C8A' : D.textMid,
                              transition: 'all 0.15s ease',
                            }}>
                            <span className="student-name">{s.name}</span> <span style={{ color: '#e07060', display: 'inline-flex', alignItems: 'center', gap: 1 }}><HeartDemonInlineIcon size={10} />{s.heartDemonMarks}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Confirm */}
              {heritageDonorId && heritageRecipientId && (() => {
                const donor = students.find(s => s.id === heritageDonorId);
                const recipient = students.find(s => s.id === heritageRecipientId);
                if (!donor || !recipient) return null;
                return heritageConfirm ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: D.cinnabar }}>
                      确认{donor.name}捐赠1传承值帮{recipient.name}消除1心魔？
                    </span>
                    <button disabled={isSyncing} onClick={async () => {
                      const { donor: updatedDonor, recipient: updatedRecipient } = donateHeritage(donor, recipient);
                      updateStudent(heritageDonorId, () => updatedDonor);
                      updateStudent(heritageRecipientId, () => updatedRecipient);
                      addBehaviorRecord({
                        studentId: heritageRecipientId, direction: 'positive', weight: 1 as PositiveWeight,
                        category: '品行', description: '心魔消除·薪火传承',
                        remark: `${donor.name}捐赠1传承值`, recordedBy: recordedBy || '系统',
                        verified: true, shieldsConsumed: 0, isHighSensitivity: false,
                        studentCardSide: 'back',
                      timePeriodId: selectedTimePeriodId || undefined,
                      });
                      const synced = await syncAfterChange(`${donor.name}帮${recipient.name}消除了1个心魔并同步`);
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
                  <button onClick={() => setHeritageConfirm(true)} style={{
                    padding: '6px 14px', borderRadius: D.radiusSm, fontSize: 13, cursor: 'pointer',
                    background: 'rgba(232,160,48,0.15)', border: '1px solid rgba(232,160,48,0.3)',
                    color: '#E8A030', fontWeight: 500, transition: 'all 0.25s ease',
                  }}>
                    确认捐赠
                  </button>
                );
              })()}
            </div>
          )}
        </div>
        </div>

        {/* Quick actions */}
        {selectedStudentIds.length > 0 && (
          <div style={{ marginTop: 24, padding: 16, borderRadius: D.radiusSm, background: D.bgGlass, border: D.glassBorder }}>
            <div style={{ fontSize: 13, color: D.textMid, fontWeight: 500, letterSpacing: '0.02em', marginBottom: 10 }}>⚡ 快捷操作</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                disabled={isSyncing}
                onClick={async () => {
                  for (const id of selectedStudentIds) {
                    updateStudent(id, (s) => addStarShield(s));
                    const st = students.find(s => s.id === id);
                    addBehaviorRecord({
                      studentId: id,
                      direction: 'positive',
                      weight: 1 as PositiveWeight,
                      category: '品行',
                      description: '批量添加星光护盾',
                      recordedBy,
                      verified: true,
                      shieldsConsumed: 0,
                      isHighSensitivity: false,
                      studentCardSide: st?.cardSide ?? 'front',
                    timePeriodId: selectedTimePeriodId || undefined,
                    });
                  }
                  setBatchResults(selectedStudentIds.map(id => {
                    const s = students.find(st => st.id === id);
                    return { studentId: id, studentName: s?.name ?? '', message: '获得1个星光护盾', levelChanged: false, flipped: false, shieldUsed: false, reachedImmortal: false, shieldsGained: 1 };
                  }));
                  setShieldResults(null);
                  await syncAfterChange(`已为 ${selectedStudentIds.length} 人添加星光护盾并同步`);
                }}
                style={{
                  padding: '8px 14px', borderRadius: D.radiusSm, fontSize: 13,
                  background: D.blueDim, border: '1px solid rgba(123,139,181,0.3)',
                  color: D.blue, cursor: isSyncing ? 'wait' : 'pointer', opacity: isSyncing ? 0.65 : 1, display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all 0.25s ease',
                }}
              >
                <Shield size={14} /> 批量添加星光护盾
              </button>
              <button
                onClick={() => { setShowShieldAdjust(true); setShieldAdjustAmount(1); }}
                style={{
                  padding: '8px 14px', borderRadius: D.radiusSm, fontSize: 13,
                  background: D.bgCard, border: `1px solid ${D.border}`,
                  color: D.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all 0.25s ease',
                }}
              >
                <Edit3 size={14} /> 批量调整护盾
              </button>
            </div>

            {showShieldAdjust && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: D.radiusSm, background: D.bgGlass, border: D.glassBorder, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: D.textMid }}>护盾变化量</span>
                <input
                  type="number"
                  value={shieldAdjustAmount}
                  onChange={e => setShieldAdjustAmount(Number(e.target.value))}
                  style={{
                    width: 64, padding: '6px 8px', borderRadius: D.radiusSm, textAlign: 'center',
                    background: D.bgInput, border: `1px solid ${D.border}`,
                    color: shieldAdjustAmount < 0 ? D.cinnabar : D.blue, fontSize: 13, outline: 'none',
                  }}
                />
                <span style={{ fontSize: 11, color: D.textDim }}>负数=扣减</span>
                <div style={{ flex: 1 }} />
                <button
                  disabled={isSyncing}
                  onClick={async () => {
                    for (const id of selectedStudentIds) {
                      updateStudent(id, (s) => ({ ...s, starShields: Math.max(0, s.starShields + shieldAdjustAmount), totalShieldsEverEarned: shieldAdjustAmount > 0 ? s.totalShieldsEverEarned + shieldAdjustAmount : s.totalShieldsEverEarned }));
                      if (shieldAdjustAmount > 0) {
                        const st = students.find(s => s.id === id);
                        addBehaviorRecord({
                          studentId: id,
                          direction: 'positive',
                          weight: shieldAdjustAmount as PositiveWeight,
                          category: '品行',
                          description: `批量添加${shieldAdjustAmount}星光护盾`,
                          recordedBy,
                          verified: true,
                          shieldsConsumed: 0,
                          isHighSensitivity: false,
                          studentCardSide: st?.cardSide ?? 'front',
                        timePeriodId: selectedTimePeriodId || undefined,
                        });
                      }
                    }
                    setBatchResults(selectedStudentIds.map(id => {
                      const s = students.find(st => st.id === id);
                      return { studentId: id, studentName: s?.name ?? '', message: `护盾${shieldAdjustAmount > 0 ? '+' : ''}${shieldAdjustAmount} → ${Math.max(0, (s?.starShields ?? 0) + shieldAdjustAmount)}`, levelChanged: false, flipped: false, shieldUsed: false, reachedImmortal: false, shieldsGained: Math.max(0, shieldAdjustAmount) };
                    }));
                    setShieldResults(null);
                    const synced = await syncAfterChange(`已为 ${selectedStudentIds.length} 人调整护盾${shieldAdjustAmount > 0 ? '+' : ''}${shieldAdjustAmount}并同步`);
                    if (synced) setShowShieldAdjust(false);
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: D.radiusSm, fontSize: 12, cursor: isSyncing ? 'wait' : 'pointer',
                    opacity: isSyncing ? 0.65 : 1,
                    background: shieldAdjustAmount < 0 ? D.cinnabarDim : D.goldDim,
                    border: `1px solid ${shieldAdjustAmount < 0 ? 'rgba(196,65,37,0.3)' : 'rgba(212,168,83,0.3)'}`,
                    color: shieldAdjustAmount < 0 ? D.cinnabar : D.gold,
                    fontWeight: 500,
                    transition: 'all 0.25s ease',
                  }}
                >
                  确认
                </button>
                <button
                  onClick={() => setShowShieldAdjust(false)}
                  style={{
                    padding: '6px 14px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
                    background: D.bgCard, border: `1px solid ${D.border}`, color: D.textMid,
                    transition: 'all 0.25s ease',
                  }}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        )}

        {/* Behavior record history */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid rgba(255,255,255,0.04)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{
              width: 28,
              height: 28,
              borderRadius: D.radiusXs,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.035)',
              border: `1px solid ${D.border}`,
              color: D.textMid,
              flexShrink: 0,
            }}>
              <Edit3 size={14} />
            </span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: D.text, margin: 0, letterSpacing: '0.02em' }}>行为记录</h3>
              <div style={{ fontSize: 11, color: D.textDim, marginTop: 2 }}>按时间倒序显示，删除权限仅限班主任。</div>
            </div>
            <span style={{ fontSize: 11, color: D.textDim, padding: '1px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${D.border}` }}>最近 200 条</span>
            {canDeleteRecord && displayedRecords.length > 0 && (
              <>
                <div style={{ flex: 1 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: D.textMid, cursor: 'pointer', opacity: 0.7 }}>
                  <input type="checkbox" checked={allDisplayedSelected} onChange={toggleAllRecords} style={{ cursor: 'pointer' }} />
                  全选
                </label>
                {selectedRecordIds.size > 0 && (
                  batchDeleteConfirm ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span style={{ fontSize: 12, color: D.cinnabar }}>删除 {selectedRecordIds.size} 条？</span>
                      <button onClick={handleBatchDelete} style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer', background: D.cinnabarDim, border: '1px solid rgba(196,65,37,0.4)', color: D.cinnabar }}>确认</button>
                      <button onClick={() => setBatchDeleteConfirm(false)} style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer', background: D.bgCard, border: `1px solid ${D.border}`, color: D.textMid }}>取消</button>
                    </div>
                  ) : (
                    <button onClick={() => setBatchDeleteConfirm(true)} style={{ padding: '4px 10px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer', background: D.cinnabarDim, border: '1px solid rgba(196,65,37,0.25)', color: D.cinnabar, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s ease' }}>
                      <Trash2 size={12} /> 删除选中 ({selectedRecordIds.size})
                    </button>
                  )
                )}
              </>
            )}
          </div>

          {records.length === 0 ? (
            <div style={{
              padding: 32, textAlign: 'center',
              color: D.textDim, fontSize: 14,
              background: D.bgGlass, borderRadius: D.radiusSm,
              border: D.glassBorder,
            }}>
              <div style={{ width: 34, height: 34, margin: '0 auto 10px', borderRadius: D.radiusSm, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textDim, background: 'rgba(255,255,255,0.03)' }}>
                <Edit3 size={18} />
              </div>
              暂无行为记录
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>在上方选择学生和行为后提交，记录将显示在这里</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {groupedRecords.map(group => {
                const isNeg = group.direction === 'negative';
                const isExpanded = expandedGroups.has(group.key);
                const allGroupSelected = group.allIds.every(id => selectedRecordIds.has(id));
                const names = group.compactStudentNames;
                const showExpand = names.length > 5 || group.specialConsequenceRows.length > 0;
                const displayNames = showExpand && !isExpanded ? names.slice(0, 4) : names;

                return (
                  <div key={group.key} style={{
                    borderRadius: D.radiusSm,
                    background: allGroupSelected ? 'rgba(212,168,83,0.06)' : (hoveredGroupKey === group.key ? D.bgCardHover : D.bgCard),
                    border: `1px solid ${allGroupSelected ? 'rgba(212,168,83,0.15)' : (hoveredGroupKey === group.key ? 'rgba(255,255,255,0.1)' : D.border)}`,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={() => !allGroupSelected && setHoveredGroupKey(group.key)}
                  onMouseLeave={() => setHoveredGroupKey(null)}
                >
                    <div className="record-history-main" style={{ padding: isMobile ? '10px 12px' : '11px 14px', display: 'grid', gap: isMobile ? 8 : 9 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0, flex: '1 1 260px', flexWrap: 'wrap' }}>
                        {canDeleteRecord && (
                          <input type="checkbox" checked={allGroupSelected} onChange={() => {
                            setSelectedRecordIds(prev => {
                              const next = new Set(prev);
                              if (allGroupSelected) group.allIds.forEach(id => next.delete(id));
                              else group.allIds.forEach(id => next.add(id));
                              return next;
                            });
                          }} style={{ cursor: 'pointer', flexShrink: 0 }} />
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0 }}>
                          <span style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, fontWeight: 600, background: isNeg ? D.cinnabarDim : D.blueDim, color: isNeg ? D.cinnabar : D.blue }}>
                            {group.baseEffectLabel}
                          </span>
                        </div>
                        <span className="student-name" style={{ fontSize: isMobile ? 12 : 13, color: D.text, fontWeight: 500, lineHeight: 1.45, minWidth: 0, flex: '1 1 180px', whiteSpace: 'normal', overflowWrap: 'break-word' }}>
                          {displayNames.join('、')}
                        </span>
                        {showExpand && !isExpanded && (
                          <span
                            onClick={() => setExpandedGroups(prev => new Set(prev).add(group.key))}
                            style={{ fontSize: 12, color: D.gold, cursor: 'pointer', fontWeight: 600, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2 }}
                          >
                            {formatRecordGroupExpandLabel(group.uniqueStudentCount)} ▾
                          </span>
                        )}
                        </div>
                        {group.hasHighSensitivity && (
                          <span style={{ fontSize: 11, color: D.cinnabar, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', borderRadius: D.radiusXs, background: D.cinnabarDim }}>
                            <AlertTriangle size={10} /> 敏感
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto', gap: isMobile ? 8 : 12, alignItems: 'end', minWidth: 0 }}>
                        <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: isMobile ? 12 : 12, color: D.textMid, lineHeight: 1.55, whiteSpace: 'normal', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                          {group.description}
                          {group.cleanRemark && <span style={{ color: D.textDim, marginLeft: 6 }}>({group.cleanRemark})</span>}
                          {group.records[0].timePeriodId && (
                            <span style={{ fontSize: 10, color: D.gold, marginLeft: 4, opacity: 0.8 }}>
                              @{timePeriods.find(tp => tp.id === group.records[0].timePeriodId)?.name}
                            </span>
                          )}
                        </div>
                        {group.hasShields && (
                          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            <span style={{ fontSize: 11, color: D.blue, padding: '1px 6px', borderRadius: D.radiusXs, background: D.blueDim }}>消耗{group.totalShields}护盾</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: 8, flexShrink: 0, flexWrap: 'wrap', minWidth: isMobile ? 0 : 180 }}>
                        {renderRecordTimeChips(group.records[0], group.createdAt, group.recordedBy)}
                        {canDeleteRecord && (
                          group.allIds.some(id => showDeleteConfirm === id) ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={async () => {
                                const deletedIds = [...group.allIds];
                                deletedIds.forEach(id => deleteBehaviorRecord(id));
                                const synced = await syncAfterChange(`已删除并同步 ${group.allIds.length} 条记录`, { explicitDeletedRecordIds: deletedIds });
                                if (synced) setShowDeleteConfirm(null);
                              }} style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer', background: D.cinnabarDim, border: '1px solid rgba(196,65,37,0.4)', color: D.cinnabar }}>确认</button>
                              <button onClick={() => setShowDeleteConfirm(null)} style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer', background: D.bgCard, border: `1px solid ${D.border}`, color: D.textMid }}>取消</button>
                            </div>
                          ) : (
                            <button onClick={() => setShowDeleteConfirm(group.allIds[0])} style={{ padding: '2px 6px', borderRadius: D.radiusXs, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(196,65,37,0.2)', color: D.textDim }}>
                              <Trash2 size={12} />
                            </button>
                          )
                        )}
                      </div>
                      </div>
                    </div>
                    {isExpanded && showExpand && (
                      <div style={{ padding: '0 14px 10px 14px' }}>
                        {group.specialConsequenceRows.length > 0 && (
                          <div style={{ display: 'grid', gap: 6, padding: '8px 10px', borderRadius: D.radiusXs, background: 'rgba(255,255,255,0.025)', border: `1px solid ${D.border}` }}>
                            <div style={{ fontSize: 11, color: D.textDim, letterSpacing: 0 }}>处理明细</div>
                            {group.specialConsequenceRows.map(row => (
                              <div key={`${row.studentId}-${row.consequence.fullLabel}`} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '92px minmax(0, 1fr)', gap: isMobile ? 3 : 8, alignItems: 'start', fontSize: 12, lineHeight: 1.5 }}>
                                <span style={{ color: D.text, fontWeight: 600 }}>{row.name}</span>
                                <span style={{ color: row.consequence.resultLabel.includes('心魔') ? D.cinnabar : D.gold, minWidth: 0, overflowWrap: 'break-word' }}>{row.consequence.fullLabel}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <span
                          onClick={() => setExpandedGroups(prev => { const n = new Set(prev); n.delete(group.key); return n; })}
                          style={{ fontSize: 11, color: D.gold, cursor: 'pointer', marginTop: 4, display: 'inline-block' }}
                        >
                          ▴ 收起
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
