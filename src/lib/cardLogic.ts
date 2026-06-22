import type { Student, CardSide, FrontLevel, BackLevel, LevelChange, BehaviorRecord, TeachingWeek } from '../types';
import { toLocalDateStr, recordLocalDate, addDays, isTeachingDay } from './utils';

// ===== 核心卡片逻辑引擎 =====

/** 获取正面等级的空格数 */
export function getFrontBlanks(level: number, frontLevels: FrontLevel[]): number {
  return frontLevels[level - 1]?.blanks ?? 8;
}

/** 获取背面等级所需火种数 */
export function getBackChecksRequired(level: number, heartDemonMarks: number, backLevels: BackLevel[]): number {
  const base = backLevels[level - 1]?.checksRequired ?? 0;
  return base + heartDemonMarks;
}

/** 处理正面星蚀记录：根据权重填入空格，星光护盾按比例抵消 */
export function processNegativeBehavior(
  student: Student,
  weight: number,
  shieldCount: number,
  shieldOffsetRatio: number,
  frontLevels: FrontLevel[],
  _backLevels: BackLevel[],
  demotionThreshold: number = 3,
): { student: Student; shieldsConsumed: number; levelChanged: boolean; flipped: boolean; fromLevel: number; fromSide: CardSide; heritageOffsetCount: number } {
  const s = { ...student };
  let shieldsConsumed = 0;
  let levelChanged = false;
  let flipped = false;
  let heritageOffsetCount = 0;
  const fromLevel = student.currentLevel;
  const fromSide = student.cardSide;

  if (s.cardSide === 'front') {
    const maxOffset = Math.floor(shieldCount / shieldOffsetRatio);
    const actualFill = Math.max(0, weight - maxOffset);
    shieldsConsumed = Math.min(shieldCount, (weight - actualFill) * shieldOffsetRatio);
    s.starShields -= shieldsConsumed;

    s.blanksFilled += actualFill;
    s.totalBlanksEverFilled += actualFill;

    const level6Blanks = frontLevels[5]?.blanks ?? 8;
    if (s.currentLevel === 6 && s.blanksFilled >= level6Blanks) {
      s.cardSide = 'back';
      s.currentLevel = 1;
      s.blanksFilled = 0;
      s.cumulativeChecks = 0;
      flipped = true;
      levelChanged = true;
    } else if (s.currentLevel < 6 && s.blanksFilled >= getFrontBlanks(s.currentLevel, frontLevels)) {
      s.currentLevel += 1;
      s.blanksFilled = 0;
      levelChanged = true;
    }
  } else {
    const heartDemonGain = Math.max(1, Math.floor(weight));
    s.heartDemonMarks += heartDemonGain;
    s.totalHeartDemonsEverGained += heartDemonGain;
    // 不朽晨辉：传承值自动抵消心魔
    while (s.heartDemonMarks > 0 && s.heritagePoints > 0 && s.currentLevel === 6) {
      s.heartDemonMarks -= 1;
      s.heritagePoints -= 1;
      heritageOffsetCount += 1;
    }
    // 不朽晨辉降级检测：心魔≥阈值时降级到熔炉之心
    if (s.cardSide === 'back' && s.currentLevel === 6 && s.heartDemonMarks >= demotionThreshold) {
      s.currentLevel = 5;
      s.heartDemonMarks = 0;
      s.heritagePoints = 0;
      s.cumulativeChecks = 0;
      levelChanged = true;
    }
  }

  s.consecutiveNoViolationDays = 0;
  s.weeksAtLevelOne = 0;
  s.updatedAt = new Date().toISOString();

  if (levelChanged) {
    const direction: LevelChange['direction'] = flipped ? 'flip' : 'down';
    s.lastLevelChange = { direction, fromLevel, toLevel: s.currentLevel, fromSide, toSide: s.cardSide, timestamp: s.updatedAt };
    s.riseTaskCompleted = false;
  }

  return { student: s, shieldsConsumed, levelChanged, flipped, fromLevel, fromSide, heritageOffsetCount };
}

/** 处理正面行为（卡片在正面→获得护盾，卡片在背面→增加火种） */
export function processPositiveBehaviorFront(
  student: Student,
  weight: number
): { student: Student; shieldsGained: number } {
  const s = { ...student };
  s.starShields += weight;
  s.totalShieldsEverEarned += weight;
  s.updatedAt = new Date().toISOString();
  return { student: s, shieldsGained: weight };
}

/** 处理背面火种记录：根据权重累加火种数 */
export function processPositiveBehavior(
  student: Student,
  weight: number,
  backLevels: BackLevel[],
): { student: Student; levelChanged: boolean; reachedImmortal: boolean; fromLevel: number; fromSide: CardSide; heartDemonsCleared: number } {
  const s = { ...student };
  let levelChanged = false;
  let reachedImmortal = false;
  let heartDemonsCleared = 0;
  const fromLevel = student.currentLevel;
  const fromSide = student.cardSide;

  if (s.cardSide === 'back') {
    // 闪耀级行为消1心魔（所有背面同学）
    if (weight >= 3 && s.heartDemonMarks > 0) {
      s.heartDemonMarks -= 1;
      heartDemonsCleared += 1;
    }

    s.cumulativeChecks += weight;
    s.totalChecksEverEarned += weight;

    // 不朽晨辉：获得传承值
    if (s.currentLevel === 6) {
      s.heritagePoints += weight;
      s.totalHeritageEarned += weight;
      // 传承值自动抵消心魔
      while (s.heartDemonMarks > 0 && s.heritagePoints > 0) {
        s.heartDemonMarks -= 1;
        s.heritagePoints -= 1;
        heartDemonsCleared += 1;
      }
      // 不朽晨辉不再升级
      s.updatedAt = new Date().toISOString();
      return { student: s, levelChanged: false, reachedImmortal: true, fromLevel, fromSide, heartDemonsCleared };
    }

    const nextLevel = s.currentLevel + 1;
    if (nextLevel <= 6) {
      const required = getBackChecksRequired(nextLevel, s.heartDemonMarks, backLevels);
      if (s.cumulativeChecks >= required) {
        s.currentLevel = nextLevel;
        s.cumulativeChecks = 0;
        levelChanged = true;
        if (nextLevel === 6) {
          reachedImmortal = true;
        }
      }
    }
  }

  s.updatedAt = new Date().toISOString();

  if (levelChanged) {
    s.lastLevelChange = { direction: 'up', fromLevel, toLevel: s.currentLevel, fromSide, toSide: s.cardSide, timestamp: s.updatedAt };
    s.riseTaskCompleted = false;
  }

  return { student: s, levelChanged, reachedImmortal, fromLevel, fromSide, heartDemonsCleared };
}

/** 处理正面回升 */
export function processRise(
  student: Student,
  consecutiveDays: number,
  daysRequired: number,
  taskCompleted: boolean
): { student: Student; rose: boolean; fromLevel: number; fromSide: CardSide } {
  const fromLevel = student.currentLevel;
  const fromSide = student.cardSide;

  if (student.cardSide !== 'front' || student.currentLevel <= 1) {
    return { student, rose: false, fromLevel, fromSide };
  }

  if (consecutiveDays >= daysRequired && taskCompleted) {
    const s = { ...student };
    s.currentLevel -= 1;
    s.blanksFilled = 0;
    s.consecutiveNoViolationDays = 0;
    s.weeksAtLevelOne = 0;
    // 护盾保留，以资鼓励
    s.updatedAt = new Date().toISOString();
    s.lastLevelChange = { direction: 'up', fromLevel, toLevel: s.currentLevel, fromSide, toSide: s.cardSide, timestamp: s.updatedAt };
    s.riseTaskCompleted = false;
    return { student: s, rose: true, fromLevel, fromSide };
  }

  return { student, rose: false, fromLevel, fromSide };
}

/** 处理心魔消除 */
export function clearHeartDemon(student: Student): Student {
  const s = { ...student };
  if (s.heartDemonMarks > 0) {
    s.heartDemonMarks -= 1;
    s.updatedAt = new Date().toISOString();
  }
  return s;
}

/** 处理星光护盾获得 */
export function addStarShield(student: Student): Student {
  const s = { ...student };
  s.starShields += 1;
  s.totalShieldsEverEarned += 1;
  s.updatedAt = new Date().toISOString();
  return s;
}

/** 处理零违纪日 */
export function processNoViolationDay(student: Student): Student {
  const s = { ...student };
  s.consecutiveNoViolationDays += 1;
  s.updatedAt = new Date().toISOString();
  return s;
}

/** 计算等级1进阶称号 */
export function getLevelOneTitle(weeksAtLevelOne: number, levelOneTitles: Array<{ weeksRequired: number; name: string; description: string }>): string | null {
  let result: string | null = null;
  for (const title of levelOneTitles) {
    if (weeksAtLevelOne >= title.weeksRequired) {
      result = title.name;
    }
  }
  return result;
}

function countTeachingDaysInRange(startDate: string, endDate: string, teachingWeeks: Array<{ startDate: string; endDate: string }>): number {
  let count = 0;
  let current = startDate;
  while (current <= endDate) {
    if (isTeachingDay(current, teachingWeeks)) count += 1;
    current = addDays(current, 1);
  }
  return count;
}

function countCompletedTeachingWeeksFromDays(
  consecutiveTeachingDays: number,
  teachingWeeks: Array<{ weekNumber: number; startDate: string; endDate: string }>,
  today: string,
): number {
  if (consecutiveTeachingDays <= 0 || teachingWeeks.length === 0) return 0;

  let remainingDays = consecutiveTeachingDays;
  const currentWeek = teachingWeeks.find(w => today >= w.startDate && today <= w.endDate);
  if (currentWeek && today < currentWeek.endDate) {
    remainingDays = Math.max(0, remainingDays - countTeachingDaysInRange(currentWeek.startDate, today, teachingWeeks));
  }

  let completedWeeks = 0;
  const settledWeeks = [...teachingWeeks]
    .filter(w => w.endDate <= today)
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

  for (const week of settledWeeks) {
    const daysInWeek = countTeachingDaysInRange(week.startDate, week.endDate, teachingWeeks);
    if (daysInWeek <= 0) continue;
    if (remainingDays < daysInWeek) break;
    completedWeeks += 1;
    remainingDays -= daysInWeek;
  }

  return completedWeeks;
}

/** 获取星辉典范称号使用的周数：兼容旧数据，用连续无违纪教学日按教学周折算 */
export function getLevelOneTitleWeeks(
  student: Pick<Student, 'weeksAtLevelOne' | 'consecutiveNoViolationDays'>,
  teachingWeeks: Array<{ weekNumber: number; startDate: string; endDate: string }>,
  today: string = toLocalDateStr(),
): number {
  const storedWeeks = student.weeksAtLevelOne ?? 0;
  const weeksFromNoViolationDays = countCompletedTeachingWeeksFromDays(student.consecutiveNoViolationDays ?? 0, teachingWeeks, today);
  return Math.max(storedWeeks, weeksFromNoViolationDays);
}

/** 星辉典范称号历史重放需要的最小记录字段。 */
type LevelOneHistoryRecord = Pick<BehaviorRecord, 'id' | 'studentId' | 'direction' | 'weight' | 'extraWeight' | 'description' | 'remark' | 'createdAt'>;

interface LevelOneTitleHistoryConfig {
  teachingWeeks: Array<{ weekNumber: number; startDate: string; endDate: string }>;
  frontLevels: FrontLevel[];
  backLevels: BackLevel[];
  shieldOffsetRatio?: number;
  immortalDemotionThreshold?: number;
}

function countCompletedTeachingWeeksSince(
  startDate: string,
  teachingWeeks: Array<{ weekNumber: number; startDate: string; endDate: string }>,
  today: string,
): number {
  if (!startDate || startDate > today) return 0;
  const teachingDays = countTeachingDaysInRange(startDate, today, teachingWeeks);
  return countCompletedTeachingWeeksFromDays(teachingDays, teachingWeeks, today);
}

function isRiseRecord(description: string): boolean {
  return description.includes('回升任务') || description.includes('自动回升');
}

function parseShieldExchangeCost(record: Pick<LevelOneHistoryRecord, 'description' | 'remark'>): number {
  const text = `${record.description || ''} ${record.remark || ''}`;
  const match = text.match(/消耗\s*(\d+)\s*护盾/) || text.match(/兑换.*?(\d+)\s*护盾/);
  return match ? Math.max(0, Number(match[1]) || 0) : 0;
}

/** 从个人行为历史重放“连续保持星辉典范”的教学周数。 */
export function getLevelOneTitleWeeksFromHistory(
  student: Pick<Student, 'id' | 'cardSide' | 'currentLevel' | 'createdAt' | 'weeksAtLevelOne' | 'consecutiveNoViolationDays'>,
  records: LevelOneHistoryRecord[],
  config: LevelOneTitleHistoryConfig,
  today: string = toLocalDateStr(),
): number {
  if (student.cardSide !== 'front' || student.currentLevel !== 1) return 0;

  const sorted = records
    .filter(r => String(r.studentId) === String(student.id))
    .sort((a, b) => {
      const ta = a.createdAt || '';
      const tb = b.createdAt || '';
      if (ta !== tb) return ta.localeCompare(tb);
      return String(a.id).localeCompare(String(b.id));
    });

  let cardSide: CardSide = 'front';
  let currentLevel = 1;
  let blanksFilled = 0;
  let cumulativeChecks = 0;
  let heartDemonMarks = 0;
  let starShields = 0;
  let heritagePoints = 0;
  let levelOneSinceDate: string | null = recordLocalDate(student.createdAt);

  const shieldRatio = config.shieldOffsetRatio ?? 2;
  const immortalDemotionThreshold = config.immortalDemotionThreshold ?? 3;

  for (const record of sorted) {
    const wasLevelOne = cardSide === 'front' && currentLevel === 1;
    const weight = (record.weight || 0) + (record.extraWeight || 0);

    if (record.direction === 'positive') {
      if (cardSide === 'front') {
        if (isRiseRecord(record.description || '') && currentLevel > 1) {
          currentLevel -= 1;
          blanksFilled = 0;
          starShields += weight;
        } else {
          starShields += weight;
          const exchangeCost = parseShieldExchangeCost(record);
          if (exchangeCost > 0) starShields = Math.max(0, starShields - exchangeCost);
        }
      } else {
        if (weight >= 3 && heartDemonMarks > 0) heartDemonMarks -= 1;
        cumulativeChecks += weight;

        if (currentLevel === 6) {
          heritagePoints += weight;
          while (heartDemonMarks > 0 && heritagePoints > 0) {
            heartDemonMarks -= 1;
            heritagePoints -= 1;
          }
        } else {
          const nextLevel = currentLevel + 1;
          if (nextLevel <= 6) {
            const required = getBackChecksRequired(nextLevel, heartDemonMarks, config.backLevels);
            if (cumulativeChecks >= required) {
              currentLevel = nextLevel;
              cumulativeChecks = 0;
            }
          }
        }
      }
    } else {
      if (cardSide === 'front') {
        const maxOffset = Math.floor(starShields / shieldRatio);
        const actualFill = Math.max(0, weight - maxOffset);
        const shieldsConsumed = Math.min(starShields, (weight - actualFill) * shieldRatio);
        starShields -= shieldsConsumed;
        blanksFilled += actualFill;

        const level6Blanks = config.frontLevels[5]?.blanks ?? 8;
        if (currentLevel === 6 && blanksFilled >= level6Blanks) {
          cardSide = 'back';
          currentLevel = 1;
          blanksFilled = 0;
          cumulativeChecks = 0;
        } else if (currentLevel < 6 && blanksFilled >= getFrontBlanks(currentLevel, config.frontLevels)) {
          currentLevel += 1;
          blanksFilled = 0;
        }
      } else {
        heartDemonMarks += Math.max(1, Math.floor(weight));
        while (heartDemonMarks > 0 && heritagePoints > 0 && currentLevel === 6) {
          heartDemonMarks -= 1;
          heritagePoints -= 1;
        }
        if (currentLevel === 6 && heartDemonMarks >= immortalDemotionThreshold) {
          currentLevel = 5;
          heartDemonMarks = 0;
          heritagePoints = 0;
          cumulativeChecks = 0;
        }
      }
    }

    const isLevelOne = cardSide === 'front' && currentLevel === 1;
    if (wasLevelOne && !isLevelOne) {
      levelOneSinceDate = null;
    } else if (!wasLevelOne && isLevelOne) {
      levelOneSinceDate = recordLocalDate(record.createdAt);
    }
  }

  if (cardSide !== 'front' || currentLevel !== 1 || !levelOneSinceDate) {
    return getLevelOneTitleWeeks(student, config.teachingWeeks, today);
  }

  return Math.max(
    student.weeksAtLevelOne ?? 0,
    countCompletedTeachingWeeksSince(levelOneSinceDate, config.teachingWeeks, today),
  );
}

/** 获取学生的等级名称 */
export function getLevelName(cardSide: CardSide, level: number, frontLevels: FrontLevel[], backLevels: BackLevel[]): string {
  if (cardSide === 'front') {
    return frontLevels[level - 1]?.name ?? '未知';
  }
  return backLevels[level - 1]?.name ?? '未知';
}

/** 获取学生的等级描述 */
export function getLevelDescription(cardSide: CardSide, level: number, frontLevels: FrontLevel[], backLevels: BackLevel[]): string {
  if (cardSide === 'front') {
    return frontLevels[level - 1]?.description ?? '';
  }
  return backLevels[level - 1]?.description ?? '';
}

/** 检查复合行为是否触发 */
export function checkCompositeBehavior(
  weeklyCount: number,
  threshold: number
): boolean {
  return weeklyCount >= threshold;
}

/** 获取背面升级进度百分比 */
export function getBackProgress(student: Student, backLevels: BackLevel[]): number {
  if (student.cardSide !== 'back') return 0;
  if (student.currentLevel === 6) return 100;

  const nextRequired = getBackChecksRequired(student.currentLevel + 1, student.heartDemonMarks, backLevels);
  if (nextRequired <= 0) return 100;
  const progress = (student.cumulativeChecks / nextRequired) * 100;
  return Math.min(100, Math.max(0, progress));
}

/** 获取正面空格进度百分比 */
export function getFrontProgress(student: Student, frontLevels: FrontLevel[]): number {
  if (student.cardSide !== 'front') return 0;
  const maxBlanks = getFrontBlanks(student.currentLevel, frontLevels);
  return Math.min(100, (student.blanksFilled / maxBlanks) * 100);
}

/** 心魔自动消除：连续2教学周零违纪→消1心魔 */
export function checkHeartDemonAutoClear(
  student: Student,
  records: BehaviorRecord[],
  teachingWeeks: TeachingWeek[],
): { student: Student; cleared: boolean; reason: string } {
  if (student.cardSide !== 'back' || student.heartDemonMarks <= 0) {
    return { student, cleared: false, reason: '' };
  }

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  // 找到当前和上一个教学周
  const currentWeek = teachingWeeks.find(w => todayStr >= w.startDate && todayStr <= w.endDate);
  if (!currentWeek) return { student, cleared: false, reason: '' };

  const prevWeek = teachingWeeks.find(w => w.weekNumber === currentWeek.weekNumber - 1);
  if (!prevWeek) return { student, cleared: false, reason: '' };

  // 检查最近2个教学周内是否有违纪记录
  const twoWeeksStart = prevWeek.startDate;
  const recentViolations = records.filter(r =>
    r.studentId === student.id &&
    r.direction === 'negative' &&
    recordLocalDate(r.createdAt) >= twoWeeksStart &&
    recordLocalDate(r.createdAt) <= todayStr
  );

  if (recentViolations.length === 0) {
    // 防重复：检查上次消除日期
    if (student.lastHeartDemonClearDate && student.lastHeartDemonClearDate >= twoWeeksStart) {
      return { student, cleared: false, reason: '' };
    }
    const s = { ...student };
    s.heartDemonMarks -= 1;
    s.lastHeartDemonClearDate = todayStr;
    s.updatedAt = new Date().toISOString();
    return { student: s, cleared: true, reason: '连续2周零违纪' };
  }

  return { student, cleared: false, reason: '' };
}

/** 传承值捐赠：不朽晨辉同学用传承值帮背面同学消心魔 */
export function donateHeritage(donor: Student, recipient: Student): { donor: Student; recipient: Student } {
  if (donor.heritagePoints <= 0 || recipient.heartDemonMarks <= 0 || recipient.cardSide !== 'back') {
    return { donor, recipient };
  }
  const d = { ...donor, heritagePoints: donor.heritagePoints - 1, totalHeritageDonated: donor.totalHeritageDonated + 1, updatedAt: new Date().toISOString() };
  const r = { ...recipient, heartDemonMarks: recipient.heartDemonMarks - 1, updatedAt: new Date().toISOString() };
  return { donor: d, recipient: r };
}

/** 获取不朽晨辉称号（基于累计传承值） */
export function getImmortalTitle(
  totalHeritageEarned: number,
  immortalTitles: Array<{ heritageRequired: number; name: string; description: string }>,
): string | null {
  let result: string | null = null;
  for (const title of immortalTitles) {
    if (totalHeritageEarned >= title.heritageRequired) result = title.name;
  }
  return result;
}
