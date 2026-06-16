import { processPositiveBehavior } from '../src/lib/cardLogic.ts';
import { BACK_LEVELS } from '../src/data/config.ts';

const now = new Date().toISOString();
const requiredForLevel2 = BACK_LEVELS[1].checksRequired;

const student = {
  id: 'student-back-reset',
  name: '测试同学',
  number: 1,
  cardSide: 'back',
  currentLevel: 1,
  blanksFilled: 0,
  cumulativeChecks: requiredForLevel2 - 1,
  heartDemonMarks: 0,
  starShields: 0,
  heritagePoints: 0,
  totalHeritageEarned: 0,
  totalHeritageDonated: 0,
  totalBlanksEverFilled: 0,
  totalHeartDemonsEverGained: 0,
  totalShieldsEverEarned: 0,
  totalChecksEverEarned: requiredForLevel2 - 1,
  totalShieldsExchanged: 0,
  consecutiveNoViolationDays: 0,
  weeksAtLevelOne: 0,
  createdAt: now,
  updatedAt: now,
};

const first = processPositiveBehavior(student, 1, BACK_LEVELS);

if (!first.levelChanged || first.student.currentLevel !== 2) {
  throw new Error(`expected back-side student to rise to L2, got L${first.student.currentLevel}`);
}

if (first.student.cumulativeChecks !== 0) {
  throw new Error(`expected fire seeds to reset after L2 rise, got ${first.student.cumulativeChecks}`);
}

const second = processPositiveBehavior(first.student, 1, BACK_LEVELS);

if (second.student.currentLevel !== 2) {
  throw new Error(`expected next ordinary positive record to remain at L2, got L${second.student.currentLevel}`);
}

if (second.student.cumulativeChecks !== 1) {
  throw new Error(`expected fresh L2 fire seed progress to be 1, got ${second.student.cumulativeChecks}`);
}

console.log('back-level-up reset assertions passed');
