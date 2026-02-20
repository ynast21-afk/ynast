@echo off
chcp 65001 >nul
echo ============================================
echo   kStreamer Upload Worker - 간편 설치
echo ============================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다!
    echo https://nodejs.org 에서 설치 후 다시 실행하세요.
    pause
    exit /b 1
)
echo [OK] Node.js 발견: 
node --version

:: Check ffmpeg
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [경고] ffmpeg가 설치되어 있지 않습니다!
    echo 썸네일/프레임 추출을 위해 ffmpeg가 필요합니다.
    echo.
    echo 설치 방법:
    echo   1. https://ffmpeg.org/download.html 에서 다운로드
    echo   2. 또는: winget install Gyan.FFmpeg
    echo   3. 설치 후 이 스크립트를 다시 실행하세요.
    echo.
    pause
    exit /b 1
)
echo [OK] ffmpeg 발견:
ffmpeg -version 2>&1 | findstr "ffmpeg version"

:: Check ffprobe
where ffprobe >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [경고] ffprobe가 설치되어 있지 않습니다! (보통 ffmpeg와 함께 설치됩니다)
    pause
    exit /b 1
)
echo [OK] ffprobe 발견

echo.
echo --- npm 패키지 설치 중 ---
cd /d "%~dp0"
call npm install
echo.

:: Check .env
if not exist ".env" (
    echo [!] .env 파일이 없습니다. .env.example을 복사합니다.
    copy .env.example .env
    echo.
    echo ============================================
    echo   .env 파일을 열어서 값을 수정해주세요!
    echo ============================================
    echo   필수 항목:
    echo     - SITE_URL: 배포된 사이트 주소
    echo     - ADMIN_TOKEN: 관리자 비밀번호
    echo     - SKBJ_EMAIL / SKBJ_PASSWORD: 스크래핑 계정
    echo     - B2_* : Backblaze B2 스토리지 키
    echo ============================================
    echo.
    notepad .env
    echo .env 수정 후 이 스크립트를 다시 실행하세요.
    pause
    exit /b 0
) else (
    echo [OK] .env 파일 존재
)

echo.
echo ============================================
echo   모든 준비 완료! 워커를 시작합니다...
echo ============================================
echo   종료: Ctrl+C
echo ============================================
echo.
node worker.js
