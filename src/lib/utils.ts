/** 格式化本地日期为 YYYY-MM-DD（避免 toISOString 的 UTC 时区偏移） */
export function toLocalDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 将ISO时间戳（UTC）转为本地日期字符串 YYYY-MM-DD */
export function recordLocalDate(createdAt: string): string {
  return toLocalDateStr(new Date(createdAt));
}

/** 给 YYYY-MM-DD 日期字符串加N天 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

/** 判断某日期是否为教学日（在教学周内且非周末） */
export function isTeachingDay(dateStr: string, teachingWeeks: Array<{ startDate: string; endDate: string }>): boolean {
  for (const w of teachingWeeks) {
    if (dateStr >= w.startDate && dateStr <= w.endDate) {
      const d = new Date(dateStr + 'T00:00:00');
      const dow = d.getDay();
      return dow !== 0 && dow !== 6;
    }
  }
  return false;
}

/** 从记录计算连续零违纪天数（教学日） */
export function calcConsecutiveNoViolationDays(
  studentId: string | number,
  studentCreatedAt: string,
  records: Array<{ studentId: string | number; direction: string; description?: string; createdAt: string }>,
  teachingWeeks: Array<{ startDate: string; endDate: string }>,
  today: string,
): number {
  const sid = String(studentId);
  const latestRiseDate = records
    .filter(r =>
      String(r.studentId) === sid
      && r.direction === 'positive'
      && ((r.description || '').includes('回升任务') || (r.description || '').includes('自动回升'))
    )
    .map(r => recordLocalDate(r.createdAt))
    .sort()
    .pop();
  const countStartDate = latestRiseDate ? addDays(latestRiseDate, 1) : recordLocalDate(studentCreatedAt);
  const violationDates = [...new Set(
    records
      .filter(r => String(r.studentId) === sid && r.direction === 'negative' && recordLocalDate(r.createdAt) >= countStartDate)
      .map(r => recordLocalDate(r.createdAt))
  )].sort();

  if (violationDates.length === 0) {
    let count = 0;
    let current = countStartDate;
    while (current <= today) {
      if (isTeachingDay(current, teachingWeeks)) count++;
      current = addDays(current, 1);
    }
    return count;
  }

  const lastViolationDate = violationDates[violationDates.length - 1];
  if (lastViolationDate >= today) return 0;

  let count = 0;
  let current = addDays(lastViolationDate, 1);
  while (current <= today) {
    if (isTeachingDay(current, teachingWeeks)) count++;
    current = addDays(current, 1);
  }
  return count;
}
