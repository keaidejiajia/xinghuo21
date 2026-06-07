// Recalculate shield counts from behavior records
// Handles extraWeight: effectiveWeight = weight + extraWeight
const fs = require('fs');
const path = require('path');
const dataPath = path.join(require('os').homedir(), 'Desktop', '星火燎原', 'data.json');

if (!fs.existsSync(dataPath)) {
  console.error('data.json not found at:', dataPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const records = data['behavior-records'] || [];
const students = data.students || [];
const config = data['app-config'] || {};

const shieldOffsetRatio = config.shieldOffsetRatio || 2;

console.log(`Loaded ${students.length} students, ${records.length} behavior records`);
console.log(`shieldOffsetRatio: ${shieldOffsetRatio}`);
console.log('---');

let totalFixed = 0;

for (const student of students) {
  const studentRecords = records
    .filter(r => r.studentId === student.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  let correctTotalShields = 0;
  let totalShieldsConsumed = 0;
  let exchangeShieldCost = 0;

  for (const r of studentRecords) {
    if (r.studentCardSide && r.studentCardSide !== 'front') continue;
    if (r.description && r.description.startsWith('完成回升任务')) continue;
    if (r.description === '心魔消除·薪火传承') continue;

    if (r.description && r.description.startsWith('兑换：')) {
      if (r.remark && r.remark.includes('护盾')) {
        const costMatch = r.remark.match(/消耗(\d+)/);
        if (costMatch) exchangeShieldCost += parseInt(costMatch[1]);
      }
      continue;
    }

    // effectiveWeight = baseWeight + extraWeight (from record field or remark)
    let effectiveWeight = r.weight || 1;
    if (r.extraWeight) {
      effectiveWeight += r.extraWeight;
    } else {
      const extraMatch = r.remark && r.remark.match(/额外\+(\d+)/);
      if (extraMatch) effectiveWeight += parseInt(extraMatch[1]);
    }

    if (r.direction === 'positive') {
      correctTotalShields += effectiveWeight;
    } else if (r.direction === 'negative') {
      totalShieldsConsumed += (r.shieldsConsumed || 0);
    }
  }

  const correctStarShields = correctTotalShields - totalShieldsConsumed - exchangeShieldCost;

  const diffs = [];
  if (student.totalShieldsEverEarned !== correctTotalShields) {
    diffs.push(`totalShieldsEverEarned: ${student.totalShieldsEverEarned} → ${correctTotalShields}`);
    student.totalShieldsEverEarned = correctTotalShields;
  }
  if (student.starShields !== correctStarShields) {
    diffs.push(`starShields: ${student.starShields} → ${correctStarShields}`);
    student.starShields = correctStarShields;
  }

  if (diffs.length > 0) {
    totalFixed++;
    console.log(`${student.name} (#${student.number}):`);
    diffs.forEach(d => console.log(`  ${d}`));
  }
}

console.log('---');
console.log(`Fixed ${totalFixed} / ${students.length} students`);

const newTotalShields = students.reduce((sum, s) => sum + s.totalShieldsEverEarned, 0);
const newCurrentShields = students.filter(s => s.cardSide === 'front').reduce((sum, s) => sum + s.starShields, 0);

console.log('\n=== 全班汇总统计（修正后）===');
console.log(`护盾总数（累计）: ${newTotalShields}`);
console.log(`护盾总数（当前）: ${newCurrentShields}`);

const backupPath = dataPath + '.backup-before-recalc';
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, fs.readFileSync(dataPath));
  console.log(`\nBackup saved to ${backupPath}`);
} else {
  console.log(`\nBackup already exists at ${backupPath}, skipping`);
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('Done! data.json updated.');
