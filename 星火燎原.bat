@echo off
chcp 65001 >nul 2>&1
title 星火燎原

echo.
echo   ★ 星火燎原 · 班级管理卡片 ★
echo   正在启动，请稍候...
echo.

:: Kill any existing server on port 8421 to avoid conflicts
powershell -Command "Get-NetTCPConnection -LocalPort 8421 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

start /b powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"

timeout /t 2 /nobreak >nul
start "" "http://localhost:8421"

echo   网站已在浏览器中打开！
echo   关闭此窗口将停止网站服务。
echo.
echo   按任意键退出（关闭网站）...
pause >nul

powershell -Command "Get-NetTCPConnection -LocalPort 8421 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
