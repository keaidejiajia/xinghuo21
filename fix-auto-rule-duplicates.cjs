// One-time fix: remove duplicate auto-rule records and revert over-counted shields/checks
const fs = require('fs');
const path = require('path');
const dataPath = path.join(require('os').homedir(), 'Desktop', '星火燎原', 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const records = data['behavior-records'];
const students = data.students;

// 1. Find all auto-rule records (recordedBy === '系统')
const autoRuleRecords = records.filter(r => r.recordedBy === '系统');
console.log(`Found ${autoRuleRecords.length} auto-rule records`);

// 2. Group by studentId + description to find duplicates
// Keep only the first occurrence of each (studentId, description) pair
const seen = new Set();
const toRemove = new Set();
let duplicateCount = 0;

for (const r of autoRuleRecords) {
  const key = `${r.studentId}|${r.description}`;
  if (seen.has(key)) {
    toRemove.add(r.id);
    duplicateCount++;
  } else {
    seen.add(key);
  }
}

console.log(`Found ${duplicateCount} duplicate auto-rule records to remove`);

// Also remove the composite trigger records that fired on the 4th occurrence (should only fire at threshold)
const compositeRecords = records.filter(r => r.recordedBy === '系统' && r.description && r.description.includes('累计触发'));
for (const r of compositeRecords) {
  // If it says "第4次触发" and threshold is 3, this is a wrong trigger - remove it
  if (r.remark && r.remark.includes('第4次') || r.remark && r.remark.includes('第5次')) {
    toRemove.add(r.id);
    duplicateCount++;
    console.log(`  Removing wrong composite trigger: ${r.description} | ${r.remark}`);
  }
}

// 3. Calculate how much to revert for each student
const revertMap = {}; // studentId -> { shields: number, checks: number, blanks: number, heartDemons: number }

for (const r of records) {
  if (!toRemove.has(r.id)) continue;
  const sid = r.studentId;
  if (!revertMap[sid]) revertMap[sid] = { shields: 0, checks: 0, blanks: 0, heartDemons: 0 };

  if (r.direction === 'positive' && r.remark && r.remark.includes('护盾')) {
    // Extract amount from remark like "上周结算，+2护盾"
    const match = r.remark.match(/\+(\d+)/);
    if (match) revertMap[sid].shields += parseInt(match[1]);
  } else if (r.direction === 'positive' && r.remark && r.remark.includes('火种')) {
    const match = r.remark.match(/\+(\d+)/);
    if (match) revertMap[sid].checks += parseInt(match[1]);
  } else if (r.direction === 'negative' && r.description && r.description.includes('星蚀')) {
    const match = r.remark.match(/\+(\d+)/);
    if (match) revertMap[sid].blanks += parseInt(match[1]);
  }
}

// 4. Apply reverts to students
for (const student of students) {
  const revert = revertMap[student.id];
  if (!revert) continue;
  const oldShields = student.starShields;
  const oldTotalShields = student.totalShieldsEverEarned;
  const oldChecks = student.cumulativeChecks;
  const oldTotalChecks = student.totalChecksEverEarned;

  student.starShields = Math.max(0, student.starShields - revert.shields);
  student.totalShieldsEverEarned = Math.max(0, student.totalShieldsEverEarned - revert.shields);
  student.cumulativeChecks = Math.max(0, student.cumulativeChecks - revert.checks);
  student.totalChecksEverEarned = Math.max(0, student.totalChecksEverEarned - revert.checks);
  student.blanksFilled = Math.max(0, student.blanksFilled - revert.blanks);
  student.totalBlanksEverFilled = Math.max(0, student.totalBlanksEverFilled - revert.blanks);

  if (revert.shields > 0 || revert.checks > 0 || revert.blanks > 0) {
    console.log(`  ${student.name}: shields ${oldShields}->${student.starShields}, totalShields ${oldTotalShields}->${student.totalShieldsEverEarned}, checks ${oldChecks}->${student.cumulativeChecks}, totalChecks ${oldTotalChecks}->${student.totalChecksEverEarned}`);
  }
}

// 5. Remove duplicate records
const newRecords = records.filter(r => !toRemove.has(r.id));
console.log(`Records: ${records.length} -> ${newRecords.length} (removed ${records.length - newRecords.length})`);

data['behavior-records'] = newRecords;

// 6. Reset the weekly settlement flag so it won't re-trigger immediately
// (We want it to settle properly on the next visit with the fixed code)
// Don't reset - the fixed code will use idempotent checks instead

// 7. Save backup and write
const backupPath = dataPath + '.backup-before-fix';
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, fs.readFileSync(dataPath));
  console.log(`Backup saved to ${backupPath}`);
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('Done! data.json updated.');
