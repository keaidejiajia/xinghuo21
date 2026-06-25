import type { Student, CardSide, FrontLevel, BackLevel, LevelChange, BehaviorRecord, TeachingWeek, HeartDemonClearRules } from '../types';
import { behaviorRecordLocalDate, toLocalDateStr, recordLocalDate, addDays, isTeachingDay } from './utils';
import { getExchangeCostFromRecord, isExchangeRecord } from './exchangeLogic';

// ===== 鏍稿績鍗＄墖閫昏緫寮曟搸 =====

/** 鑾峰彇姝ｉ潰绛夌骇鐨勭┖鏍兼暟 */
export function getFrontBlanks(level: number, frontLevels: FrontLevel[]): number {
  return frontLevels[level - 1]?.blanks ?? 8;
}

/** 鑾峰彇鑳岄潰绛夌骇鎵€闇€鐏鏁?*/
export function getBackChecksRequired(level: number, heartDemonMarks: number, backLevels: BackLevel[]): number {
  const base = backLevels[level - 1]?.checksRequired ?? 0;
  return base + heartDemonMarks;
}

const DEFAULT_HEART_DEMON_CLEAR_RULES: HeartDemonClearRules = {
  zeroViolation: { weeksRequired: 2, clearCount: 1, isActive: true },
  shiningBehavior: { minWeight: 3, clearCount: 1, isActive: true },
};

function positiveInteger(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function normalizeHeartDemonClearRules(rules?: Partial<HeartDemonClearRules>): HeartDemonClearRules {
  return {
    zeroViolation: {
      ...DEFAULT_HEART_DEMON_CLEAR_RULES.zeroViolation,
      ...(rules?.zeroViolation ?? {}),
      weeksRequired: positiveInteger(rules?.zeroViolation?.weeksRequired, DEFAULT_HEART_DEMON_CLEAR_RULES.zeroViolation.weeksRequired),
      clearCount: positiveInteger(rules?.zeroViolation?.clearCount, DEFAULT_HEART_DEMON_CLEAR_RULES.zeroViolation.clearCount),
    },
    shiningBehavior: {
      ...DEFAULT_HEART_DEMON_CLEAR_RULES.shiningBehavior,
      ...(rules?.shiningBehavior ?? {}),
      minWeight: positiveInteger(rules?.shiningBehavior?.minWeight, DEFAULT_HEART_DEMON_CLEAR_RULES.shiningBehavior.minWeight),
      clearCount: positiveInteger(rules?.shiningBehavior?.clearCount, DEFAULT_HEART_DEMON_CLEAR_RULES.shiningBehavior.clearCount),
    },
  };
}

function clearHeartDemons(current: number, requested: number): { remaining: number; cleared: number } {
  const cleared = Math.min(Math.max(0, current), Math.max(0, requested));
  return { remaining: Math.max(0, current - cleared), cleared };
}

function isHeartDemonClearRecord(record: Pick<BehaviorRecord, 'description' | 'remark'>): boolean {
  return String(record.description || '').includes('心魔消除') || String(record.remark || '').includes('heartDemonClear:');
}

function getHeartDemonClearCountFromRecord(record: Pick<BehaviorRecord, 'description' | 'remark' | 'weight'>): number {
  const text = `${record.description || ''} ${record.remark || ''}`;
  const match = text.match(/count:(\d+)/) || text.match(/[（(]\s*-\s*(\d+)/);
  const parsed = match ? Number(match[1]) : Number(record.weight || 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

/** 澶勭悊姝ｉ潰鏄熻殌璁板綍锛氭牴鎹潈閲嶅～鍏ョ┖鏍硷紝鏄熷厜鎶ょ浘鎸夋瘮渚嬫姷娑?*/
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
    // 涓嶆溄鏅ㄨ緣锛氫紶鎵垮€艰嚜鍔ㄦ姷娑堝績榄?
    while (s.heartDemonMarks > 0 && s.heritagePoints > 0 && s.currentLevel === 6) {
      s.heartDemonMarks -= 1;
      s.heritagePoints -= 1;
      heritageOffsetCount += 1;
    }
    // 涓嶆溄鏅ㄨ緣闄嶇骇妫€娴嬶細蹇冮瓟鈮ラ槇鍊兼椂闄嶇骇鍒扮啍鐐変箣蹇?
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

/** 澶勭悊姝ｉ潰琛屼负锛堝崱鐗囧湪姝ｉ潰鈫掕幏寰楁姢鐩撅紝鍗＄墖鍦ㄨ儗闈⑩啋澧炲姞鐏锛?*/
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

/** 澶勭悊鑳岄潰鐏璁板綍锛氭牴鎹潈閲嶇疮鍔犵伀绉嶆暟 */
export function processPositiveBehavior(
  student: Student,
  weight: number,
  backLevels: BackLevel[],
  heartDemonClearRules?: Partial<HeartDemonClearRules>,
): { student: Student; levelChanged: boolean; reachedImmortal: boolean; fromLevel: number; fromSide: CardSide; heartDemonsCleared: number } {
  const s = { ...student };
  let levelChanged = false;
  let reachedImmortal = false;
  let heartDemonsCleared = 0;
  const fromLevel = student.currentLevel;
  const fromSide = student.cardSide;
  const clearRules = normalizeHeartDemonClearRules(heartDemonClearRules);

  if (s.cardSide === 'back') {
    // 闂€€绾ц涓烘秷1蹇冮瓟锛堟墍鏈夎儗闈㈠悓瀛︼級
    if (clearRules.shiningBehavior.isActive !== false && weight >= clearRules.shiningBehavior.minWeight && s.heartDemonMarks > 0) {
      const result = clearHeartDemons(s.heartDemonMarks, clearRules.shiningBehavior.clearCount);
      s.heartDemonMarks = result.remaining;
      heartDemonsCleared += result.cleared;
    }

    s.cumulativeChecks += weight;
    s.totalChecksEverEarned += weight;

    // 涓嶆溄鏅ㄨ緣锛氳幏寰椾紶鎵垮€?
    if (s.currentLevel === 6) {
      s.heritagePoints += weight;
      s.totalHeritageEarned += weight;
      // 浼犳壙鍊艰嚜鍔ㄦ姷娑堝績榄?
      while (s.heartDemonMarks > 0 && s.heritagePoints > 0) {
        s.heartDemonMarks -= 1;
        s.heritagePoints -= 1;
        heartDemonsCleared += 1;
      }
      // 涓嶆溄鏅ㄨ緣涓嶅啀鍗囩骇
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

/** 澶勭悊姝ｉ潰鍥炲崌 */
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
    // 鎶ょ浘淇濈暀锛屼互璧勯紦鍔?    s.updatedAt = new Date().toISOString();
    s.lastLevelChange = { direction: 'up', fromLevel, toLevel: s.currentLevel, fromSide, toSide: s.cardSide, timestamp: s.updatedAt };
    s.riseTaskCompleted = false;
    return { student: s, rose: true, fromLevel, fromSide };
  }

  return { student, rose: false, fromLevel, fromSide };
}

/** 澶勭悊蹇冮瓟娑堥櫎 */
export function clearHeartDemon(student: Student): Student {
  const s = { ...student };
  if (s.heartDemonMarks > 0) {
    s.heartDemonMarks -= 1;
    s.updatedAt = new Date().toISOString();
  }
  return s;
}

/** 澶勭悊鏄熷厜鎶ょ浘鑾峰緱 */
export function addStarShield(student: Student): Student {
  const s = { ...student };
  s.starShields += 1;
  s.totalShieldsEverEarned += 1;
  s.updatedAt = new Date().toISOString();
  return s;
}

/** 澶勭悊闆惰繚绾棩 */
export function processNoViolationDay(student: Student): Student {
  const s = { ...student };
  s.consecutiveNoViolationDays += 1;
  s.updatedAt = new Date().toISOString();
  return s;
}

/** 璁＄畻绛夌骇1杩涢樁绉板彿 */
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

/** 鑾峰彇鏄熻緣鍏歌寖绉板彿浣跨敤鐨勫懆鏁帮細鍏煎鏃ф暟鎹紝鐢ㄨ繛缁棤杩濈邯鏁欏鏃ユ寜鏁欏鍛ㄦ姌绠?*/
export function getLevelOneTitleWeeks(
  student: Pick<Student, 'weeksAtLevelOne' | 'consecutiveNoViolationDays'>,
  teachingWeeks: Array<{ weekNumber: number; startDate: string; endDate: string }>,
  today: string = toLocalDateStr(),
): number {
  const storedWeeks = student.weeksAtLevelOne ?? 0;
  const weeksFromNoViolationDays = countCompletedTeachingWeeksFromDays(student.consecutiveNoViolationDays ?? 0, teachingWeeks, today);
  return Math.max(storedWeeks, weeksFromNoViolationDays);
}

/** 鏄熻緣鍏歌寖绉板彿鍘嗗彶閲嶆斁闇€瑕佺殑鏈€灏忚褰曞瓧娈点€?*/
type LevelOneHistoryRecord = Pick<BehaviorRecord, 'id' | 'studentId' | 'direction' | 'weight' | 'extraWeight' | 'description' | 'remark' | 'occurredDate' | 'createdAt'>;

interface LevelOneTitleHistoryConfig {
  teachingWeeks: Array<{ weekNumber: number; startDate: string; endDate: string }>;
  frontLevels: FrontLevel[];
  backLevels: BackLevel[];
  shieldOffsetRatio?: number;
  immortalDemotionThreshold?: number;
  heartDemonClearRules?: Partial<HeartDemonClearRules>;
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
  return description.includes('鍥炲崌浠诲姟') || description.includes('鑷姩鍥炲崌');
}

function parseShieldExchangeCost(record: Pick<LevelOneHistoryRecord, 'description' | 'remark'>): number {
  const text = `${record.description || ''} ${record.remark || ''}`;
  const match = text.match(/娑堣€梊s*(\d+)\s*鎶ょ浘/) || text.match(/鍏戞崲.*?(\d+)\s*鎶ょ浘/);
  return match ? Math.max(0, Number(match[1]) || 0) : 0;
}

/** 浠庝釜浜鸿涓哄巻鍙查噸鏀锯€滆繛缁繚鎸佹槦杈夊吀鑼冣€濈殑鏁欏鍛ㄦ暟銆?*/
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
  const heartDemonClearRules = normalizeHeartDemonClearRules(config.heartDemonClearRules);

  for (const record of sorted) {
    const wasLevelOne = cardSide === 'front' && currentLevel === 1;
    const weight = (record.weight || 0) + (record.extraWeight || 0);

    if (record.direction === 'positive') {
      if (cardSide === 'front') {
        if (isExchangeRecord(record)) {
          starShields = Math.max(0, starShields - getExchangeCostFromRecord(record));
        } else if (isRiseRecord(record.description || '') && currentLevel > 1) {
          currentLevel -= 1;
          blanksFilled = 0;
          starShields += weight;
        } else {
          starShields += weight;
          const exchangeCost = parseShieldExchangeCost(record);
          if (exchangeCost > 0) starShields = Math.max(0, starShields - exchangeCost);
        }
      } else {
        if (isHeartDemonClearRecord(record)) {
          heartDemonMarks = clearHeartDemons(heartDemonMarks, getHeartDemonClearCountFromRecord(record)).remaining;
        } else {
        if (heartDemonClearRules.shiningBehavior.isActive !== false && weight >= heartDemonClearRules.shiningBehavior.minWeight && heartDemonMarks > 0) {
          heartDemonMarks = clearHeartDemons(heartDemonMarks, heartDemonClearRules.shiningBehavior.clearCount).remaining;
        }
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
      levelOneSinceDate = behaviorRecordLocalDate(record);
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

/** 鑾峰彇瀛︾敓鐨勭瓑绾у悕绉?*/
export function getLevelName(cardSide: CardSide, level: number, frontLevels: FrontLevel[], backLevels: BackLevel[]): string {
  if (cardSide === 'front') {
    return frontLevels[level - 1]?.name ?? '鏈煡';
  }
  return backLevels[level - 1]?.name ?? '鏈煡';
}

/** 鑾峰彇瀛︾敓鐨勭瓑绾ф弿杩?*/
export function getLevelDescription(cardSide: CardSide, level: number, frontLevels: FrontLevel[], backLevels: BackLevel[]): string {
  if (cardSide === 'front') {
    return frontLevels[level - 1]?.description ?? '';
  }
  return backLevels[level - 1]?.description ?? '';
}

/** 妫€鏌ュ鍚堣涓烘槸鍚﹁Е鍙?*/
export function checkCompositeBehavior(
  weeklyCount: number,
  threshold: number
): boolean {
  return weeklyCount >= threshold;
}

/** 鑾峰彇鑳岄潰鍗囩骇杩涘害鐧惧垎姣?*/
export function getBackProgress(student: Student, backLevels: BackLevel[]): number {
  if (student.cardSide !== 'back') return 0;
  if (student.currentLevel === 6) return 100;

  const nextRequired = getBackChecksRequired(student.currentLevel + 1, student.heartDemonMarks, backLevels);
  if (nextRequired <= 0) return 100;
  const progress = (student.cumulativeChecks / nextRequired) * 100;
  return Math.min(100, Math.max(0, progress));
}

/** 鑾峰彇姝ｉ潰绌烘牸杩涘害鐧惧垎姣?*/
export function getFrontProgress(student: Student, frontLevels: FrontLevel[]): number {
  if (student.cardSide !== 'front') return 0;
  const maxBlanks = getFrontBlanks(student.currentLevel, frontLevels);
  return Math.min(100, (student.blanksFilled / maxBlanks) * 100);
}

/** 蹇冮瓟鑷姩娑堥櫎锛氳繛缁?鏁欏鍛ㄩ浂杩濈邯鈫掓秷1蹇冮瓟 */
export function checkHeartDemonAutoClear(
  student: Student,
  records: BehaviorRecord[],
  teachingWeeks: TeachingWeek[],
  heartDemonClearRules?: Partial<HeartDemonClearRules>,
  todayStr: string = toLocalDateStr(),
): { student: Student; cleared: boolean; clearedCount: number; reason: string } {
  if (student.cardSide !== 'back' || student.heartDemonMarks <= 0) {
    return { student, cleared: false, clearedCount: 0, reason: '' };
  }

  const clearRules = normalizeHeartDemonClearRules(heartDemonClearRules);
  if (clearRules.zeroViolation.isActive === false) {
    return { student, cleared: false, clearedCount: 0, reason: '' };
  }

  // 鎵惧埌褰撳墠鍜屼笂涓€涓暀瀛﹀懆
  const completedWeeks = [...teachingWeeks]
    .filter(w => w.endDate < todayStr)
    .sort((a, b) => b.weekNumber - a.weekNumber || b.endDate.localeCompare(a.endDate))
    .slice(0, clearRules.zeroViolation.weeksRequired)
    .reverse();

  if (completedWeeks.length < clearRules.zeroViolation.weeksRequired) {
    return { student, cleared: false, clearedCount: 0, reason: '' };
  }

  // 妫€鏌ユ渶杩?涓暀瀛﹀懆鍐呮槸鍚︽湁杩濈邯璁板綍
  const windowStart = completedWeeks[0].startDate;
  const windowEnd = completedWeeks[completedWeeks.length - 1].endDate;
  const recentViolations = records.filter(r =>
    r.studentId === student.id &&
    r.direction === 'negative' &&
    behaviorRecordLocalDate(r) >= windowStart &&
    behaviorRecordLocalDate(r) <= windowEnd
  );

  if (recentViolations.length === 0) {
    // 闃查噸澶嶏細妫€鏌ヤ笂娆℃秷闄ゆ棩鏈?
    if (student.lastHeartDemonClearDate && student.lastHeartDemonClearDate >= windowEnd) {
      return { student, cleared: false, clearedCount: 0, reason: '' };
    }
    const s = { ...student };
    const result = clearHeartDemons(s.heartDemonMarks, clearRules.zeroViolation.clearCount);
    s.heartDemonMarks = result.remaining;
    s.lastHeartDemonClearDate = todayStr;
    s.updatedAt = new Date().toISOString();
    return { student: s, cleared: result.cleared > 0, clearedCount: result.cleared, reason: `连续${clearRules.zeroViolation.weeksRequired}周零违纪` };
  }

  return { student, cleared: false, clearedCount: 0, reason: '' };
}

/** 浼犳壙鍊兼崘璧狅細涓嶆溄鏅ㄨ緣鍚屽鐢ㄤ紶鎵垮€煎府鑳岄潰鍚屽娑堝績榄?*/
export function donateHeritage(donor: Student, recipient: Student): { donor: Student; recipient: Student } {
  if (donor.heritagePoints <= 0 || recipient.heartDemonMarks <= 0 || recipient.cardSide !== 'back') {
    return { donor, recipient };
  }
  const d = { ...donor, heritagePoints: donor.heritagePoints - 1, totalHeritageDonated: donor.totalHeritageDonated + 1, updatedAt: new Date().toISOString() };
  const r = { ...recipient, heartDemonMarks: recipient.heartDemonMarks - 1, updatedAt: new Date().toISOString() };
  return { donor: d, recipient: r };
}

/** 鑾峰彇涓嶆溄鏅ㄨ緣绉板彿锛堝熀浜庣疮璁′紶鎵垮€硷級 */
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
