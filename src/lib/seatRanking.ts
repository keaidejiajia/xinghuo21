import type { Student } from '../types';

const FRONT_ECLIPSE_WEIGHT = 2;

function frontShieldTotal(student: Student): number {
  return student.currentLevel === 1
    ? student.starShields + (student.totalShieldsExchanged || 0)
    : student.starShields;
}

function frontEclipseTotal(student: Student): number {
  return student.currentLevel === 1
    ? student.totalBlanksEverFilled
    : student.blanksFilled;
}

function backEmberTotal(student: Student): number {
  return student.currentLevel === 6
    ? student.heritagePoints + student.totalHeritageDonated
    : student.cumulativeChecks;
}

export function getSeatTieScore(student: Student): number {
  if (student.cardSide === 'front') {
    return frontShieldTotal(student) - FRONT_ECLIPSE_WEIGHT * frontEclipseTotal(student);
  }
  return backEmberTotal(student) - student.heartDemonMarks;
}

export function compareSeatTieBreaker(a: Student, b: Student): number {
  const subA = getSeatTieScore(a);
  const subB = getSeatTieScore(b);
  if (subA !== subB) return subB - subA;

  if (a.cardSide === 'front') {
    const shieldA = frontShieldTotal(a);
    const shieldB = frontShieldTotal(b);
    if (shieldA !== shieldB) return shieldB - shieldA;
  } else {
    const emberA = backEmberTotal(a);
    const emberB = backEmberTotal(b);
    if (emberA !== emberB) return emberB - emberA;
  }

  return b.consecutiveNoViolationDays - a.consecutiveNoViolationDays;
}
