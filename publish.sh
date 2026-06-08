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
echo "🚀 Pushing to GitHub (triggers Vercel deploy)..."
git add -A
git diff --cached --quiet || git commit -m "Deploy $(date '+%Y-%m-%d %H:%M')"
GIT_SSH_COMMAND="ssh -i $HOME/.ssh/gitee_ed25519 -o StrictHostKeyChecking=accept-new" git push origin main

echo ""
echo "✅ Done! Desktop updated + Vercel will auto-deploy"
