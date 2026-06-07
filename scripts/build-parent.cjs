/**
 * 家长端构建脚本
 *
 * 用法：node scripts/build-parent.js [--push]
 *   --push  构建后自动推送到 Gitee Pages
 *
 * 它会：
 * 1. 从桌面的 data.json 读取最新数据
 * 2. 内嵌到构建产物中
 * 3. 可选：推送到 Gitee Pages
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_SOURCE = path.join(process.env.USERPROFILE || '~', 'Desktop', '星火燎原', 'data.json');
const PARENT_DATA_FILE = path.join(ROOT, 'parent-data.json');

// 1. Read data.json
console.log('📖 读取数据: ' + DATA_SOURCE);
if (!fs.existsSync(DATA_SOURCE)) {
  console.error('❌ 找不到 data.json，请确认桌面星火燎原文件夹中存在 data.json');
  process.exit(1);
}

const rawData = fs.readFileSync(DATA_SOURCE, 'utf-8');
const data = JSON.parse(rawData.replace(/^﻿/, ''));
console.log(`   ✓ 学生: ${data.students?.length || 0} 人`);
console.log(`   ✓ 记录: ${data['behavior-records']?.length || 0} 条`);

// Strip demo_user so parent portal always shows login page
if (data['demo_user']) {
  delete data['demo_user'];
  console.log('   🧹 已清除登录缓存（确保显示登录页）');
}

// 2. Write parent-data.json for vite build embedding
fs.writeFileSync(PARENT_DATA_FILE, JSON.stringify(data), 'utf-8');
console.log('📝 写入 parent-data.json');

// 3. Build
console.log('🔨 构建中...');
try {
  execSync('npx vite build', { cwd: ROOT, stdio: 'inherit' });
  console.log('✅ 构建完成');
} catch (e) {
  console.error('❌ 构建失败');
  process.exit(1);
}

// 4. Clean up
fs.unlinkSync(PARENT_DATA_FILE);

// 5. Optional: push to Gitee
const shouldPush = process.argv.includes('--push');
if (shouldPush) {
  const distDir = path.join(ROOT, 'dist');
  console.log('🚀 推送到 Gitee Pages...');

  try {
    // Initialize git in dist if needed
    if (!fs.existsSync(path.join(distDir, '.git'))) {
      execSync('git init', { cwd: distDir, stdio: 'inherit' });
      execSync('git checkout -b pages', { cwd: distDir, stdio: 'inherit' });
    }

    // Check if remote exists
    let hasRemote = false;
    try {
      execSync('git remote get-url origin', { cwd: distDir, stdio: 'pipe' });
      hasRemote = true;
    } catch { /* no remote */ }

    if (!hasRemote) {
      console.log('⚠️  首次推送需要设置 Gitee 仓库地址。');
      console.log('   请在 Gitee 创建仓库后运行:');
      console.log('   cd dist');
      console.log('   git remote add origin https://gitee.com/你的用户名/仓库名.git');
      console.log('   git push -u origin pages --force');
    } else {
      execSync('git add -A', { cwd: distDir, stdio: 'inherit' });
      execSync('git commit -m "Update parent data"', { cwd: distDir, stdio: 'inherit' });
      execSync('git push origin pages --force', { cwd: distDir, stdio: 'inherit' });
      console.log('✅ 已推送到 Gitee Pages');
    }
  } catch (e) {
    console.error('❌ 推送失败:', e.message);
  }
} else {
  console.log('');
  console.log('📋 dist/ 已就绪。推送到 Gitee:');
  console.log('   用 --push 参数自动推送，或手动:');
  console.log('   cd dist');
  console.log('   git push origin pages --force');
}
