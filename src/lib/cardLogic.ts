import type { Student, CardSide, FrontLevel, BackLevel, LevelChange, BehaviorRecord, TeachingWeek } from '../types';
import { toLocalDateStr, recordLocalDate } from './utils';

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
