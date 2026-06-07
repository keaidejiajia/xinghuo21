/**
 * 数据审计引擎 —— 从行为记录历史重新计算所有学生状态
 *
 * 原则：行为记录是唯一真相来源（source of truth），
 * 学生当前状态应该 = 所有行为记录按时间顺序重放的结果。
 * 同时核验每条记录的 shieldsConsumed 是否正确。
 */

import type { Student, BehaviorRecord, AppConfig, CardSide } from '../types';

export interface AuditDiscrepancy {
  studentId: string;
  studentName: string;
  studentNumber: number;
  field: string;
  simulated: number;
  actual: number;
  label: string;
  /** 如果差异来自某条记录 */
  recordId?: string;
}

export interface LevelChangeInfo {
  fromSide: string;
  toSide: string;
  fromLevel: number;
  toLevel: number;
  studentName: string;
  studentNumber: number;
}

export interface AuditResult {
  totalStudents: number;
  totalRecords: number;
  studentsWithIssues: number;
  discrepancies: AuditDiscrepancy[];
  /** 修正后的学生状态 */
  correctedStudents: Map<string, Partial<Student>>;
  /** 需要修正的记录 shieldsConsumed */
  recordCorrections: Map<string, { shieldsConsumed: number }>;
  /** 哪些记录触发了等级变化 (recordId → info) */
  levelChangeMap: Map<string, LevelChangeInfo>;
}

function getFrontBlanks(level: number, frontLevels: AppConfig['frontLevels']): number {
  return frontLevels[level - 1]?.blanks ?? 8;
}

function getBackChecksRequired(
  level: number,
  heartDemonMarks: number,
  backLevels: AppConfig['backLevels']
): number {
  const base = backLevels[level - 1]?.checksRequired ?? 0;
  return base + heartDemonMarks;
}

interface SimState {
  cardSide: CardSide;
  currentLevel: number;
  blanksFilled: number;
  cumulativeChecks: number;
  heartDemonMarks: number;
  starShields: number;
  heritagePoints: number;
  totalBlanksEverFilled: number;
  totalHeartDemonsEverGained: number;
  totalShieldsEverEarned: number;
  totalChecksEverEarned: number;
  totalShieldsExchanged: number;
  totalHeritageEarned: number;
  totalHeritageDonated: number;
  consecutiveNoViolationDays: number;
  weeksAtLevelOne: number;
}

function initSimState(): SimState {
  return {
    cardSide: 'front', currentLevel: 1,
    blanksFilled: 0, cumulativeChecks: 0,
    heartDemonMarks: 0, starShields: 0, heritagePoints: 0,
    totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0,
    totalShieldsEverEarned: 0, totalChecksEverEarned: 0,
    totalShieldsExchanged: 0, totalHeritageEarned: 0,
    totalHeritageDonated: 0,
    consecutiveNoViolationDays: 0, weeksAtLevelOne: 0,
  };
}

export function recomputeAllStudents(
  students: Student[],
  records: BehaviorRecord[],
  config: AppConfig
): AuditResult {
  const simMap = new Map<string, SimState>();
  for (const s of students) {
    simMap.set(s.id, initSimState());
  }

  // Sort records chronologically — 按时间从早到晚
  const sorted = [...records].sort((a, b) => {
    const ta = a.createdAt || '';
    const tb = b.createdAt || '';
    if (ta !== tb) return ta.localeCompare(tb);
    return (parseInt(a.id) || 0) - (parseInt(b.id) || 0);
  });

  const SHIELD_RATIO = config.shieldOffsetRatio ?? 2;
  const DEMOTE_THRESH = config.immortalDemotionThreshold ?? 3;

  // Track computed shieldsConsumed and level changes per record
  const computedShieldsConsumed = new Map<string, number>();
  const levelChangeMap = new Map<string, LevelChangeInfo>();

  for (const r of sorted) {
    const sim = simMap.get(r.studentId);
    if (!sim) continue;

    const weight = (r.weight || 0) + (r.extraWeight || 0);
    const dir = r.direction;

    const desc = r.description || '';
    const remark = r.remark || '';

    if (dir === 'positive') {
      if (sim.cardSide === 'front') {
        // Detect rise (回升任务)
        const isRise = (desc.includes('回升任务') || desc.includes('自动回升'));
        if (isRise && sim.currentLevel > 1) {
          const oldSide = sim.cardSide;
          const oldLv = sim.currentLevel;
          sim.currentLevel -= 1;
          sim.blanksFilled = 0;
          // 护盾保留（processRise 逻辑）
          // 回升记录本身 weight=1，也加一个护盾作为奖励
          sim.starShields += weight;
          sim.totalShieldsEverEarned += weight;
          // Record level change
          levelChangeMap.set(r.id, {
            fromSide: oldSide, toSide: sim.cardSide,
            fromLevel: oldLv, toLevel: sim.currentLevel,
            studentName: '', studentNumber: 0,
          });
        } else {
          sim.starShields += weight;
          sim.totalShieldsEverEarned += weight;
          // Detect exchange
          if ((desc.includes('兑换') || desc.includes('exchange')) && remark.includes('消耗')) {
            const match = remark.match(/消耗(\d+)护盾/);
            if (match) {
              const cost = parseInt(match[1], 10);
              sim.starShields = Math.max(0, sim.starShields - cost);
              sim.totalShieldsExchanged += cost;
            }
          }
        }
      } else {
        if (weight >= 3 && sim.heartDemonMarks > 0) {
          sim.heartDemonMarks -= 1;
        }
        sim.cumulativeChecks += weight;
        sim.totalChecksEverEarned += weight;
        if (sim.currentLevel === 6) {
          sim.heritagePoints += weight;
          sim.totalHeritageEarned += weight;
          while (sim.heartDemonMarks > 0 && sim.heritagePoints > 0) {
            sim.heartDemonMarks -= 1;
            sim.heritagePoints -= 1;
          }
        } else {
          const nextLv = sim.currentLevel + 1;
          if (nextLv <= 6) {
            const required = getBackChecksRequired(nextLv, sim.heartDemonMarks, config.backLevels);
            if (sim.cumulativeChecks >= required) {
              const oldLv = sim.currentLevel;
              sim.currentLevel = nextLv;
              // Record level change
              const student = students.find(s => s.id === r.studentId);
              levelChangeMap.set(r.id, {
                fromSide: 'back', toSide: 'back',
                fromLevel: oldLv, toLevel: nextLv,
                studentName: student?.name || '',
                studentNumber: student?.number || 0,
              });
            }
          }
        }
      }
    } else {
      // Negative behavior
      if (sim.cardSide === 'front') {
        const oldSide = sim.cardSide;
        const oldLv = sim.currentLevel;
        const shieldCount = sim.starShields;
        const maxOffset = Math.floor(shieldCount / SHIELD_RATIO);
        const actualFill = Math.max(0, weight - maxOffset);
        const shieldsUsed = Math.min(shieldCount, (weight - actualFill) * SHIELD_RATIO);

        // Record the CORRECT shieldsConsumed based on chronological replay
        computedShieldsConsumed.set(r.id, shieldsUsed);

        sim.starShields -= shieldsUsed;
        sim.blanksFilled += actualFill;
        sim.totalBlanksEverFilled += actualFill;

        const level6Blanks = config.frontLevels[5]?.blanks ?? 8;
        let levelChanged = false;
        let newSide: CardSide = sim.cardSide;
        let newLv = sim.currentLevel;

        if (sim.currentLevel === 6 && sim.blanksFilled >= level6Blanks) {
          sim.cardSide = 'back';
          sim.currentLevel = 1;
          sim.blanksFilled = 0;
          sim.cumulativeChecks = 0;
          levelChanged = true;
          newSide = 'back';
          newLv = 1;
        } else if (sim.currentLevel < 6 && sim.blanksFilled >= getFrontBlanks(sim.currentLevel, config.frontLevels)) {
          sim.currentLevel += 1;
          sim.blanksFilled = 0;
          levelChanged = true;
          newLv = sim.currentLevel;
        }

        if (levelChanged) {
          const student = students.find(s => s.id === r.studentId);
          levelChangeMap.set(r.id, {
            fromSide: oldSide, toSide: newSide,
            fromLevel: oldLv, toLevel: newLv,
            studentName: student?.name || '',
            studentNumber: student?.number || 0,
          });
        }
      } else {
        // Back side negative
        const oldLv = sim.currentLevel;
        sim.heartDemonMarks += 1;
        sim.totalHeartDemonsEverGained += 1;
        while (sim.heartDemonMarks > 0 && sim.heritagePoints > 0 && sim.currentLevel === 6) {
          sim.heartDemonMarks -= 1;
          sim.heritagePoints -= 1;
        }
        if (sim.cardSide === 'back' && sim.currentLevel === 6 && sim.heartDemonMarks >= DEMOTE_THRESH) {
          const student = students.find(s => s.id === r.studentId);
          levelChangeMap.set(r.id, {
            fromSide: 'back', toSide: 'back',
            fromLevel: 6, toLevel: 5,
            studentName: student?.name || '',
            studentNumber: student?.number || 0,
          });
          sim.currentLevel = 5;
          sim.heartDemonMarks = 0;
          sim.heritagePoints = 0;
          sim.cumulativeChecks = 0;
        }
      }
      sim.consecutiveNoViolationDays = 0;
    }
  }

  // Build comparison
  const discrepancies: AuditDiscrepancy[] = [];
  const correctedStudents = new Map<string, Partial<Student>>();
  const recordCorrections = new Map<string, { shieldsConsumed: number }>();

  // Check student states
  for (const s of students) {
    const sim = simMap.get(s.id);
    if (!sim) continue;

    const checks: [keyof SimState, string][] = [
      ['cardSide', '翻面状态'],
      ['currentLevel', '当前等级'],
      ['blanksFilled', '当前星蚀'],
      ['cumulativeChecks', '累计火种'],
      ['heartDemonMarks', '当前心魔'],
      ['starShields', '当前护盾'],
      ['heritagePoints', '可用传承值'],
      ['totalBlanksEverFilled', '累计星蚀'],
      ['totalHeartDemonsEverGained', '累计心魔'],
      ['totalShieldsEverEarned', '累计护盾获得'],
      ['totalChecksEverEarned', '累计火种获得'],
      ['totalShieldsExchanged', '已兑换护盾'],
      ['totalHeritageEarned', '累计传承值'],
      ['totalHeritageDonated', '已捐赠传承值'],
    ];

    const corrections: any = { id: s.id };

    for (const [field, label] of checks) {
      if (field === 'cardSide') {
        if (sim[field] !== (s as any)[field]) {
          discrepancies.push({
            studentId: s.id, studentName: s.name, studentNumber: s.number,
            field, simulated: sim[field] === 'front' ? 0 : 1,
            actual: (s as any)[field] === 'front' ? 0 : 1, label,
          });
          corrections[field] = sim[field];
        }
      } else {
        const simVal = sim[field] as number;
        const actVal = (s as any)[field] || 0;
        if (simVal !== actVal) {
          discrepancies.push({
            studentId: s.id, studentName: s.name, studentNumber: s.number,
            field, simulated: simVal, actual: actVal, label,
          });
          corrections[field] = simVal;
        }
      }
    }

    if (Object.keys(corrections).length > 1) {
      correctedStudents.set(s.id, corrections);
    }
  }

  // Check record shieldsConsumed
  for (const r of sorted) {
    const computed = computedShieldsConsumed.get(r.id);
    if (computed !== undefined) {
      const stored = r.shieldsConsumed || 0;
      if (computed !== stored) {
        recordCorrections.set(r.id, { shieldsConsumed: computed });
        const student = students.find(s => s.id === r.studentId);
        discrepancies.push({
          studentId: r.studentId,
          studentName: student?.name || '',
          studentNumber: student?.number || 0,
          field: 'shieldsConsumed',
          simulated: computed,
          actual: stored,
          label: `「${(r.description || '').slice(0, 20)}」消耗护盾`,
          recordId: r.id,
        });
      }
    }
  }

  const studentsWithIssues = new Set(discrepancies.map(d => d.studentId)).size;

  return {
    totalStudents: students.length,
    totalRecords: sorted.length,
    studentsWithIssues,
    discrepancies,
    correctedStudents,
    recordCorrections,
    levelChangeMap,
  };
}

/** 获取某条记录对应的等级变化信息（用于 StudentCard 显示升降级标记） */
export function getLevelChangeForRecord(
  recordId: string,
  levelChangeMap: Map<string, LevelChangeInfo>
): LevelChangeInfo | null {
  return levelChangeMap.get(recordId) || null;
}

/** 轻量级：计算单个学生哪些记录触发了等级变化 */
export function computeStudentLevelChanges(
  records: BehaviorRecord[],
  config: AppConfig
): Map<string, LevelChangeInfo> {
  const levelChangeMap = new Map<string, LevelChangeInfo>();
  const sorted = [...records].sort((a, b) => {
    const ta = a.createdAt || '';
    const tb = b.createdAt || '';
    if (ta !== tb) return ta.localeCompare(tb);
    return (parseInt(a.id) || 0) - (parseInt(b.id) || 0);
  });

  const SHIELD_RATIO = config.shieldOffsetRatio ?? 2;
  let cardSide: CardSide = 'front';
  let currentLevel = 1;
  let blanksFilled = 0;
  let cumulativeChecks = 0;
  let heartDemonMarks = 0;
  let starShields = 0;
  let heritagePoints = 0;

  const frontLevels = config.frontLevels;
  const backLevels = config.backLevels;
  const DEMOTE_THRESH = config.immortalDemotionThreshold ?? 3;

  for (const r of sorted) {
    const weight = (r.weight || 0) + (r.extraWeight || 0);
    const dir = r.direction;

    if (dir === 'positive') {
      if (cardSide === 'front') {
        // Detect rise (回升任务)
        const desc = r.description || '';
        if ((desc.includes('回升任务') || desc.includes('自动回升')) && currentLevel > 1) {
          const oldLv = currentLevel;
          currentLevel -= 1;
          blanksFilled = 0;
          starShields += weight;  // 回升奖励 1 护盾
          levelChangeMap.set(r.id, {
            fromSide: cardSide, toSide: cardSide,
            fromLevel: oldLv, toLevel: currentLevel,
            studentName: '', studentNumber: 0,
          });
        } else {
          starShields += weight;
        }
      } else {
        if (weight >= 3 && heartDemonMarks > 0) heartDemonMarks -= 1;
        cumulativeChecks += weight;
        if (currentLevel === 6) {
          heritagePoints += weight;
          while (heartDemonMarks > 0 && heritagePoints > 0) { heartDemonMarks--; heritagePoints--; }
        } else {
          const nextLv = currentLevel + 1;
          if (nextLv <= 6) {
            const bl = backLevels[nextLv - 1];
            const required = (bl?.checksRequired ?? 0) + heartDemonMarks;
            if (cumulativeChecks >= required) {
              levelChangeMap.set(r.id, {
                fromSide: cardSide, toSide: cardSide,
                fromLevel: currentLevel, toLevel: nextLv,
                studentName: '', studentNumber: 0,
              });
              currentLevel = nextLv;
            }
          }
        }
      }
    } else {
      if (cardSide === 'front') {
        const maxOffset = Math.floor(starShields / SHIELD_RATIO);
        const actualFill = Math.max(0, weight - maxOffset);
        const shieldsUsed = Math.min(starShields, (weight - actualFill) * SHIELD_RATIO);
        starShields -= shieldsUsed;
        blanksFilled += actualFill;

        const lv6Blanks = frontLevels[5]?.blanks ?? 8;
        const oldSide = cardSide;
        const oldLv = currentLevel;

        if (currentLevel === 6 && blanksFilled >= lv6Blanks) {
          levelChangeMap.set(r.id, {
            fromSide: 'front', toSide: 'back',
            fromLevel: 6, toLevel: 1,
            studentName: '', studentNumber: 0,
          });
          cardSide = 'back'; currentLevel = 1; blanksFilled = 0; cumulativeChecks = 0;
        } else if (currentLevel < 6 && blanksFilled >= frontLevels[currentLevel - 1]?.blanks) {
          levelChangeMap.set(r.id, {
            fromSide: oldSide, toSide: cardSide,
            fromLevel: oldLv, toLevel: currentLevel + 1,
            studentName: '', studentNumber: 0,
          });
          currentLevel += 1; blanksFilled = 0;
        }
      } else {
        heartDemonMarks += 1;
        while (heartDemonMarks > 0 && heritagePoints > 0 && currentLevel === 6) { heartDemonMarks--; heritagePoints--; }
        if (cardSide === 'back' && currentLevel === 6 && heartDemonMarks >= DEMOTE_THRESH) {
          levelChangeMap.set(r.id, {
            fromSide: 'back', toSide: 'back',
            fromLevel: 6, toLevel: 5,
            studentName: '', studentNumber: 0,
          });
          currentLevel = 5; heartDemonMarks = 0; heritagePoints = 0; cumulativeChecks = 0;
        }
      }
    }
  }
  return levelChangeMap;
}
