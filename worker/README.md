# kStreamer Upload Worker

영상 다운로드 → B2 업로드 → DB 등록을 자동으로 처리하는 워커입니다.

## 📋 사전 요구사항

| 항목 | 설치 방법 |
|------|-----------|
| **Node.js 18+** | [nodejs.org](https://nodejs.org) 다운로드 |
| **ffmpeg & ffprobe** | `winget install Gyan.FFmpeg` 또는 [ffmpeg.org](https://ffmpeg.org/download.html) |

## 🚀 빠른 시작 (Windows)

### 방법 1: 자동 설치 스크립트
```
setup-and-run.bat
```
더블 클릭하면 자동으로 체크 → 설치 → 실행됩니다.

### 방법 2: 수동 설치
```bash
# 1. 패키지 설치
cd worker
npm install

# 2. 환경변수 설정
copy .env.example .env
# .env 파일을 열어서 값 수정

# 3. 실행
node worker.js
```

## ⚙️ 환경변수 (.env)

| 변수 | 설명 | 필수 |
|------|------|------|
| `SITE_URL` | 배포된 사이트 주소 (예: `https://kstreamer.com`) | ✅ |
| `ADMIN_TOKEN` | 관리자 페이지 비밀번호 | ✅ |
| `WORKER_ID` | 워커 식별용 이름 (자유) | ✅ |
| `POLL_INTERVAL_MS` | 큐 확인 주기 (기본 5000ms) | |
| `SKBJ_EMAIL` | 스크래핑 로그인 이메일 | ✅ |
| `SKBJ_PASSWORD` | 스크래핑 로그인 비밀번호 | ✅ |
| `B2_APPLICATION_KEY_ID` | Backblaze B2 키 ID | ✅ |
| `B2_APPLICATION_KEY` | Backblaze B2 앱 키 | ✅ |
| `B2_BUCKET_ID` | B2 버킷 ID | ✅ |
| `B2_BUCKET_NAME` | B2 버킷 이름 | ✅ |

## 💡 여러 PC에서 동시 실행

여러 PC에서 워커를 동시에 실행할 수 있습니다. 각 PC의 `WORKER_ID`를 다르게 설정하세요:
- PC1: `WORKER_ID=home-pc`
- PC2: `WORKER_ID=office-pc`

큐에서 자동으로 작업을 분배합니다.
