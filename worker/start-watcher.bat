@echo off
chcp 65001 >nul 2>&1
title kStreamer Folder Watcher

echo.
echo ============================================
echo   kStreamer Folder Watcher Setup
echo ============================================
echo.

REM Navigate to the worker directory (same dir as this script)
cd /d "%~dp0"

REM Check if node is installed
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 설치해주세요.
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo [ERROR] .env 파일이 없습니다.
    echo worker 폴더에 .env 파일을 먼저 설정해주세요.
    pause
    exit /b 1
)

echo 폴더 감시를 시작합니다...
echo 바탕화면의 kstreamer-upload 폴더에 영상을 넣으면 자동 업로드됩니다.
echo.

node folder-watcher.js

pause
