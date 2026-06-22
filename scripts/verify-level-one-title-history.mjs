import {
  getLevelOneTitleWeeksFromHistory,
  getLevelOneTitle,
} from '../src/lib/cardLogic.ts';
import { FRONT_LEVELS, BACK_LEVELS } from '../src/data/config.ts';

const teachingWeeks = [
  { weekNumber: 1, startDate: '2026-05-18', endDate: '2026-05-22' },
  { weekNumber: 2, startDate: '2026-05-25', endDate: '2026-05-29' },
  { weekNumber: 3, startDate: '2026-06-01', endDate: '2026-06-05' },
  { weekNumber: 4, startDate: '2026-06-08', endDate: '2026-06-12' },
  { weekNumber: 5, startDate: '2026-06-15', endDate: '2026-06-19' },
];

const levelOneTitles = [
  { weeksRequired: 2, name: '稳固星辉', description: '持续保持星辉典范2周' },
  { weeksRequired: 4, name: '闪耀星辉', description: '持续保持星辉典范1个月' },
];

const baseStudent = {
  id: 's1',
  name: '测试同学',
  number: 1,
  cardSide: 'front',
  currentLevel: 1,
  blanksFilled: 0,
  cumulativeChecks: 0,
  heartDemonMarks: 0,
  starShields: 0,
  heritagePoints: 0,
  totalHeritageEarned: 0,
  totalHeritageDonated: 0,
  totalBlanksEverFilled: 0,
  totalHeartDemonsEverGained: 0,
  totalShieldsEverEarned: 0,
  totalChecksEverEarned: 0,
  totalShieldsExchanged: 0,
  consecutiveNoViolationDays: 0,
  weeksAtLevelOne: 0,
  createdAt: '2026-05-18T08:00:00.000Z',
  updatedAt: '2026-06-15T08:00:00.000Z',
};

const config = {
  teachingWeeks,
  frontLevels: FRONT_LEVELS,
  backLevels: BACK_LEVELS,
  shieldOffsetRatio: 2,
  immortalDemotionThreshold: 3,
};

const stableWeeks = getLevelOneTitleWeeksFromHistory(baseStudent, [], config, '2026-06-15');
if (stableWeeks !== 4) {
  throw new Error(`expected stable level-one student to have 4 completed teaching weeks, got ${stableWeeks}`);
}

const title = getLevelOneTitle(stableWeeks, levelOneTitles);
if (title !== '闪耀星辉') {
  throw new Error(`expected 4 teaching weeks to unlock 闪耀星辉, got ${title}`);
}

const demotedThenReturned = {
  ...baseStudent,
  id: 's2',
  createdAt: '2026-05-18T08:00:00.000Z',
};

const records = [
  {
    id: 'r1',
    studentId: 's2',
    direction: 'negative',
    weight: FRONT_LEVELS[0].blanks,
    category: '纪律',
    description: '测试违纪',
    recordedBy: 'teacher',
    verified: true,
    shieldsConsumed: 0,
    isHighSensitivity: false,
    createdAt: '2026-05-20T08:00:00.000Z',
  },
  {
    id: 'r2',
    studentId: 's2',
    direction: 'positive',
    weight: 1,
    category: '品行',
    description: '完成回升任务：测试回升',
    recordedBy: 'teacher',
    verified: true,
    shieldsConsumed: 0,
    isHighSensitivity: false,
    createdAt: '2026-06-01T08:00:00.000Z',
  },
];

const returnedWeeks = getLevelOneTitleWeeksFromHistory(demotedThenReturned, records, config, '2026-06-15');
if (returnedWeeks !== 2) {
  throw new Error(`expected returned level-one student to count from rise date and have 2 weeks, got ${returnedWeeks}`);
}

console.log('level-one title history assertions passed');
