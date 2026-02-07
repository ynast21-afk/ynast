# 🎬 kStreamer dance

**Premium Dance Video Streaming Platform**

👉 **Live Site**: https://ynast.vercel.app

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/ynast21-afk/ynast.git
cd ynast

# 2. Install
npm install

# 3. Create .env.local (see below)

# 4. Run
npm run dev
```

---

## 🔑 Environment Variables

Create `.env.local` file:

```env
# PayPal
PAYPAL_API_BASE=https://api-m.paypal.com
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id

# Backblaze B2
B2_APPLICATION_KEY_ID=your_b2_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_ID=your_bucket_id
B2_BUCKET_NAME=your_bucket_name

# Site
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 📂 Project Structure

```
src/
├── app/
│   ├── page.tsx            # Homepage (video grid)
│   ├── membership/         # Pricing plans
│   ├── video/[id]/         # Video player
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── admin/              # Admin dashboard
│   └── api/
│       ├── paypal/         # PayPal subscription API
│       ├── upload/         # B2 file upload API
│       └── videos/         # Video list/delete API
├── components/
│   ├── Header.tsx          # Navigation + user menu
│   ├── Footer.tsx          # Footer links
│   ├── VideoCard.tsx       # Video thumbnail card
│   └── PayPalButton.tsx    # Payment button
└── contexts/
    └── AuthContext.tsx     # Authentication state
```

---

## ✅ Completed Features

| Feature | Status | Description |
|---------|--------|-------------|
| UI/UX | ✅ | Dark theme, neon accents, 6-column grid |
| Video Player | ✅ | Comments, related videos |
| PayPal | ✅ | Monthly subscriptions |
| Auth | ✅ | Login/Signup pages |
| Storage | ✅ | Backblaze B2 integration |
| Admin | ✅ | Video upload, permissions |
| Deploy | ✅ | Vercel auto-deploy |

---

## 📋 TODO

- [ ] SEO optimization (sitemap.xml)
- [ ] Google Search Console
- [ ] Custom domain
- [ ] Social login (Google, Twitter)
- [ ] Real video upload testing

---

## 🔗 Links

| Service | URL |
|---------|-----|
| Live Site | https://ynast.vercel.app |
| GitHub | https://github.com/ynast21-afk/ynast |
| Vercel | https://vercel.com/dashboard |
| Backblaze | https://secure.backblaze.com/b2_buckets.htm |
| PayPal Dev | https://developer.paypal.com |

---

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Payment**: PayPal Subscriptions API
- **Storage**: Backblaze B2
- **Hosting**: Vercel

---

Built with ❤️ by kStreamer team
