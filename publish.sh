#!/usr/bin/env bash
set -e
cd "E:/Be A Good Teacher/班主任/初一下期/邪修/星火燎原系统/星辰与火焰/星辰与火焰v4"

echo "🔍 Type check..."
npx tsc --noEmit

echo ""
echo "🖥️  Building desktop..."
npx vite build

echo ""
echo "📋 Syncing desktop..."
rm -rf "/c/Users/11879/Desktop/星火燎原/assets"
cp -r dist/assets "/c/Users/11879/Desktop/星火燎原/assets"
cp dist/index.html "/c/Users/11879/Desktop/星火燎原/index.html"
echo "   ✅ Desktop updated"

echo ""
echo "👨‍👩‍👧 Building parent portal..."
node scripts/build-parent.cjs

echo ""
echo "🌐 Ensuring CNAME for custom domain..."
echo "xinghuo21.xin" > dist/CNAME

echo "🚀 Pushing to GitHub Pages..."
cd dist
# Keep CNAME for custom domain
echo "xinghuo21.xin" > CNAME
git add -A
git commit --amend -m "Deploy $(date '+%Y-%m-%d %H:%M')" || git commit -m "Deploy $(date '+%Y-%m-%d %H:%M')"
GIT_SSH_COMMAND="ssh -i $HOME/.ssh/gitee_ed25519 -o StrictHostKeyChecking=accept-new" git push github pages --force

echo ""
echo "✅ Done! Desktop updated + xinghuo21.xin live"
