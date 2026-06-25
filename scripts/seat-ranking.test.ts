import assert from 'node:assert/strict';
import type { Student } from '../src/types';
import { compareSeatTieBreaker, getSeatTieScore } from '../src/lib/seatRanking';

function student(overrides: Partial<Student>): Student {
  return {
    id: 's',
    name: '学生',
    number: 1,
    cardSide: 'front',
    currentLevel: 2,
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
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

const manyShieldsManyEclipses = student({ id: 'a', starShields: 10, blanksFilled: 4 });
const fewerShieldsFewerEclipses = student({ id: 'b', starShields: 7, blanksFilled: 1 });

assert.equal(getSeatTieScore(manyShieldsManyEclipses), 2, 'front tie score should be shields minus twice eclipses');
assert.equal(getSeatTieScore(fewerShieldsFewerEclipses), 5, 'fewer eclipses should matter more under the new rule');
assert.ok(
  compareSeatTieBreaker(fewerShieldsFewerEclipses, manyShieldsManyEclipses) < 0,
  'same-priority front students should sort by shields - 2*eclipses before raw shields',
);

const levelOneManyCumulativeShields = student({
  id: 'c',
  currentLevel: 1,
  starShields: 5,
  totalShieldsExchanged: 5,
  totalBlanksEverFilled: 4,
});
const levelOneFewerCumulativeEclipses = student({
  id: 'd',
  currentLevel: 1,
  starShields: 5,
  totalShieldsExchanged: 2,
  totalBlanksEverFilled: 1,
});

assert.equal(getSeatTieScore(levelOneManyCumulativeShields), 2, 'level-one cumulative score should also double eclipses');
assert.equal(getSeatTieScore(levelOneFewerCumulativeEclipses), 5, 'level-one cumulative ranking should favor fewer cumulative eclipses');
assert.ok(
  compareSeatTieBreaker(levelOneFewerCumulativeEclipses, levelOneManyCumulativeShields) < 0,
  'level-one seat ranking should use cumulative shields - 2*cumulative eclipses',
);

console.log('seat-ranking tests passed');
