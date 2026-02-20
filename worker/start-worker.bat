@echo off
chcp 65001 >nul 2>&1
title kStreamer Worker

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    pause
    exit /b 1
)

echo 워커를 시작합니다...
node worker.js

pause
