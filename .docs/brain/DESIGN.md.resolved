# 🎨 StreamVault - DESIGN.md

> 디자인 시스템 가이드 | 작성: 디자인실장 실장

---

## 🎯 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | StreamVault |
| **서비스** | 비디오 스트리밍 멤버십 플랫폼 |
| **Stitch 프로젝트** | [Stitch에서 보기](https://stitch.withgoogle.com/edit/16163297235863503502) |

---

## 🎨 Color System

### Primary Colors
```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;      /* Deep Black - 메인 배경 */
  --bg-secondary: #1a1a1a;    /* Card Dark - 카드/섹션 배경 */
  --bg-tertiary: #2a2a2a;     /* Elevated - 호버 상태 */

  /* Accent Colors */
  --accent-primary: #00ff88;   /* Neon Cyan/Green - 메인 강조 */
  --accent-secondary: #ff00ff; /* Neon Pink/Magenta - 보조 강조 */
  --accent-gradient: linear-gradient(135deg, #00ff88, #ff00ff);

  /* Text Colors */
  --text-primary: #ffffff;     /* 메인 텍스트 */
  --text-secondary: #888888;   /* 보조 텍스트 */
  --text-muted: #555555;       /* 비활성 텍스트 */

  /* Status Colors */
  --success: #00ff88;
  --warning: #ffaa00;
  --error: #ff4444;
}
```

### 사용 가이드
| 요소 | 색상 | 용도 |
|------|------|------|
| 배경 | `#0a0a0a` | 페이지 전체 배경 |
| 카드 | `#1a1a1a` | 비디오 카드, 컨테이너 |
| CTA 버튼 | Gradient | 결제, 구독 버튼 |
| 링크/강조 | `#00ff88` | 네비게이션, 뱃지 |

---

## 🔤 Typography

```css
/* Font Family */
font-family: 'Spline Sans', sans-serif;

/* Heading Scale */
--h1: 48px / 1.2 / 700;  /* 페이지 타이틀 */
--h2: 32px / 1.3 / 600;  /* 섹션 타이틀 */
--h3: 24px / 1.4 / 600;  /* 카드 타이틀 */
--body: 16px / 1.5 / 400; /* 본문 */
--small: 14px / 1.4 / 400; /* 부가 정보 */
--caption: 12px / 1.3 / 400; /* 뱃지, 라벨 */
```

---

## 🧩 Components

### Video Card
```
┌─────────────────────────┐
│  👁 1.2K         03:45  │  ← 조회수 & 재생시간 뱃지
│                         │
│      [Thumbnail]        │
│                         │
├─────────────────────────┤
│  Video Title Here       │  ← H3, white
│  @creator_name          │  ← Small, gray
└─────────────────────────┘

Style: rounded-lg, bg-secondary, hover:scale(1.02)
```

### Buttons
| 타입 | 스타일 | 사용처 |
|------|--------|--------|
| **Primary** | Gradient + Glow | 결제, CTA |
| **Secondary** | Cyan outline | 보조 액션 |
| **Ghost** | Transparent | 네비게이션 |

### Badges
```css
.badge-vip { background: var(--accent-primary); color: #000; }
.badge-premium { background: var(--accent-secondary); }
.badge-duration { background: rgba(0,0,0,0.7); }
```

---

## 📱 화면 구성

| 화면 | 설명 | Stitch Screen ID |
|------|------|------------------|
| **Homepage** | 6열 비디오 그리드 + 히어로 | `d089c45d2a5a4ee7a5caf12c13bf1b33` |
| **Membership** | 3단계 가격 플랜 + PayPal | `4ac5499a79994dfb8ad2e5996e5708c1` |
| **Video Player** | 영상 재생 + 댓글 | `5797c27152f941a589bbdd308974ce02` |

---

## 🌐 SEO 기본 설정

```html
<!-- 필수 Meta Tags -->
<meta name="description" content="Premium video streaming platform">
<meta name="keywords" content="streaming, videos, membership">
<meta property="og:title" content="StreamVault">
<meta property="og:image" content="/og-image.jpg">
<meta name="robots" content="index, follow">

<!-- Sitemap -->
/sitemap.xml  <!-- 자동 생성 예정 -->
```

---

*Made with 💖 by 디자인실장 실장*
