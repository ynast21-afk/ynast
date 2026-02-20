/**
 * ==================================================
 * kStreamer Upload Worker v2.1.0 (Puppeteer + Direct B2)
 * ==================================================
 *
 * Puppeteer를 사용하여 skbj.tv에 로그인하고
 * 영상의 실제 소스 URL을 추출한 뒤
 * 다운로드 → B2 직접 업로드를 수행합니다.
 *
 * 설정:
 *   1. cd worker && npm install
 *   2. .env 파일 설정 (아래 참조)
 *   3. node worker.js
 *
 * 필요한 .env 변수:
 *   SITE_URL=http://localhost:3000
 *   ADMIN_TOKEN=your-admin-token
 *   WORKER_ID=worker-pc-1
 *   POLL_INTERVAL_MS=5000
 *   SKBJ_EMAIL=your-email
 *   SKBJ_PASSWORD=your-password
 *   B2_APPLICATION_KEY_ID=your-b2-key-id
 *   B2_APPLICATION_KEY=your-b2-key
 *   B2_BUCKET_ID=your-bucket-id
 *   B2_BUCKET_NAME=your-bucket-name
 */

require('dotenv').config()
// Also try .env.local (the project's main env file)
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const puppeteer = require('puppeteer')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')
const { claimJob, updateJob, getQueue, checkJobCancelled, getStreamers, getStreamer, addVideo, updateStreamer, setDocument } = require('./firebase-direct')

// ============================================
// Configuration
// ============================================
const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.ADMIN_API_SECRET
const WORKER_ID = process.env.WORKER_ID || `worker-${crypto.randomBytes(3).toString('hex')}`
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000')
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '3')
const TEMP_DIR = path.join(__dirname, 'temp')

const SKBJ_EMAIL = process.env.SKBJ_EMAIL
const SKBJ_PASSWORD = process.env.SKBJ_PASSWORD

// B2 direct credentials (no API route needed)
const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_KEY = process.env.B2_APPLICATION_KEY
const B2_BUCKET_ID = process.env.B2_BUCKET_ID
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME

if (!ADMIN_TOKEN) {
    console.error('❌ ADMIN_TOKEN is required.')
    process.exit(1)
}
if (!SKBJ_EMAIL || !SKBJ_PASSWORD) {
    console.warn('⚠️ SKBJ_EMAIL/SKBJ_PASSWORD 미설정 — URL 모드 사용 불가 (로컬 파일 모드만 가능)')
}
if (!B2_KEY_ID || !B2_KEY || !B2_BUCKET_ID) {
    console.error('❌ B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_ID are required.')
    process.exit(1)
}

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

console.log(`
╔══════════════════════════════════════════╗
║   kStreamer Upload Worker v2.1.0         ║
║   (Puppeteer + Direct B2 Upload)        ║
╠══════════════════════════════════════════╣
║  Worker ID: ${WORKER_ID.padEnd(28)}║
║  Site URL:  ${SITE_URL.padEnd(28)}║
║  B2 Bucket: ${(B2_BUCKET_NAME || '').padEnd(28)}║
║  Poll:      ${(POLL_INTERVAL_MS + 'ms').padEnd(28)}║
╚══════════════════════════════════════════╝
`)

// ============================================
// B2 Direct Auth & Upload (no API route needed)
// ============================================
let b2Auth = null
let b2AuthTime = 0

async function authorizeB2() {
    // Reuse auth for 20 minutes
    if (b2Auth && Date.now() - b2AuthTime < 20 * 60 * 1000) {
        return b2Auth
    }

    console.log('   🔐 Authorizing with B2...')
    const credentials = Buffer.from(`${B2_KEY_ID}:${B2_KEY}`).toString('base64')

    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: { 'Authorization': `Basic ${credentials}` }
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`B2 auth failed (${res.status}): ${text}`)
    }

    b2Auth = await res.json()
    b2AuthTime = Date.now()
    console.log('   ✅ B2 authorized')
    return b2Auth
}

async function getB2UploadUrl(auth) {
    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucketId: B2_BUCKET_ID })
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`B2 get upload URL failed (${res.status}): ${text}`)
    }

    return res.json()
}

// Upload a single part of a large file
async function uploadSinglePart(auth, fileId, filePath, partNum, offset, length, fileSize) {
    // Get upload URL for this part
    const partUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_part_url`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId })
    })
    if (!partUrlRes.ok) {
        throw new Error(`Failed to get part upload URL: ${await partUrlRes.text()}`)
    }
    const partUrlData = await partUrlRes.json()

    // Read part from file
    const buffer = Buffer.alloc(length)
    const fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buffer, 0, length, offset)
    fs.closeSync(fd)

    const sha1 = crypto.createHash('sha1').update(buffer).digest('hex')

    const uploadRes = await fetch(partUrlData.uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': partUrlData.authorizationToken,
            'Content-Length': length.toString(),
            'X-Bz-Part-Number': partNum.toString(),
            'X-Bz-Content-Sha1': sha1,
        },
        body: buffer,
    })
    if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        throw new Error(`Part ${partNum} upload failed: ${errText}`)
    }
    return { partNum, sha1 }
}

// Large file upload (for files > 100MB) — parallel part uploads (2 at a time)
async function uploadLargeFile(auth, filePath, b2FileName, contentType, jobId = null) {
    const fileSize = fs.statSync(filePath).size
    const PART_SIZE = 50 * 1024 * 1024 // 50MB parts
    const partCount = Math.ceil(fileSize / PART_SIZE)
    const PARALLEL_PARTS = 2 // Upload 2 parts simultaneously

    console.log(`   📦 Large file upload: ${partCount} parts of ${(PART_SIZE / 1024 / 1024).toFixed(0)}MB each (${PARALLEL_PARTS} parallel)`)

    // Step 1: Start large file
    const startRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_start_large_file`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            bucketId: B2_BUCKET_ID,
            fileName: b2FileName,
            contentType,
        })
    })
    if (!startRes.ok) {
        const text = await startRes.text()
        throw new Error(`B2 start large file failed: ${text}`)
    }
    const { fileId } = await startRes.json()
    console.log(`   📄 Large file ID: ${fileId}`)

    const partSha1s = new Array(partCount) // indexed by partNum-1
    let completedParts = 0

    try {
        // Step 2: Upload parts in parallel batches
        for (let batchStart = 1; batchStart <= partCount; batchStart += PARALLEL_PARTS) {
            const batchEnd = Math.min(batchStart + PARALLEL_PARTS - 1, partCount)
            const promises = []

            for (let partNum = batchStart; partNum <= batchEnd; partNum++) {
                const offset = (partNum - 1) * PART_SIZE
                const length = Math.min(PART_SIZE, fileSize - offset)
                promises.push(uploadSinglePart(auth, fileId, filePath, partNum, offset, length, fileSize))
            }

            process.stdout.write(`\r   ⬆ Uploading parts ${batchStart}-${batchEnd}/${partCount}...`)
            const results = await Promise.all(promises)

            for (const { partNum, sha1 } of results) {
                partSha1s[partNum - 1] = sha1
                completedParts++
            }

            // Report upload progress to UI (50% → 95%)
            if (jobId) {
                const uploadProgress = Math.round(50 + (completedParts / partCount) * 45)
                updateJob(jobId, { progress: uploadProgress, updatedAt: new Date().toISOString() }).catch(() => { })

                // Check if user cancelled every 2 batches
                if (batchStart % (PARALLEL_PARTS * 2) === 1) {
                    const cancelled = await checkJobCancelled(jobId)
                    if (cancelled) {
                        throw new Error('사용자에 의해 취소됨')
                    }
                }
            }
        }

        console.log(`\n   ✅ All ${partCount} parts uploaded (parallel)`)

        // Step 3: Finish large file
        const finishRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_finish_large_file`, {
            method: 'POST',
            headers: {
                'Authorization': auth.authorizationToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileId,
                partSha1Array: partSha1s,
            })
        })
        if (!finishRes.ok) {
            const text = await finishRes.text()
            throw new Error(`B2 finish large file failed: ${text}`)
        }
        return await finishRes.json()
    } catch (err) {
        // Cancel the large file on error
        try {
            await fetch(`${auth.apiUrl}/b2api/v2/b2_cancel_large_file`, {
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileId })
            })
            console.log('   🗑 Cancelled incomplete large file upload')
        } catch { }
        throw err
    }
}

async function uploadToB2(filePath, fileName, jobId = null) {
    const auth = await authorizeB2()
    const fileSize = fs.statSync(filePath).size

    const ext = path.extname(fileName).toLowerCase()
    const contentTypes = {
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
        '.flv': 'video/x-flv', '.wmv': 'video/x-ms-wmv',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'
    // If fileName already includes a folder prefix (e.g. "thumbnails/..."), keep folder and add timestamp to basename
    let b2FileName
    if (fileName.includes('/')) {
        const lastSlash = fileName.lastIndexOf('/')
        const folder = fileName.substring(0, lastSlash + 1)
        const base = fileName.substring(lastSlash + 1)
        b2FileName = `${folder}${Date.now()}_${base}`
    } else {
        b2FileName = `videos/${Date.now()}_${fileName}`
    }

    console.log(`   ⬆ Uploading to B2: ${fileName} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`)

    // Use large file API for files > 100MB
    if (fileSize > 100 * 1024 * 1024) {
        const result = await uploadLargeFile(auth, filePath, b2FileName, contentType, jobId)
        const b2Url = `/api/b2-proxy?file=${encodeURIComponent(b2FileName)}`
        console.log(`   ✅ B2 upload complete: ${b2FileName}`)
        return b2Url
    }

    // Small file: streaming upload (avoid loading entire file into memory)
    const uploadUrl = await getB2UploadUrl(auth)

    // Compute SHA1 via streaming
    const sha1 = await new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha1')
        const stream = fs.createReadStream(filePath)
        stream.on('data', chunk => hash.update(chunk))
        stream.on('end', () => resolve(hash.digest('hex')))
        stream.on('error', reject)
    })

    // Use streaming body for upload
    const { Readable } = require('stream')
    const fileStream = fs.createReadStream(filePath)

    const uploadRes = await fetch(uploadUrl.uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': uploadUrl.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(b2FileName),
            'Content-Type': contentType,
            'Content-Length': fileSize.toString(),
            'X-Bz-Content-Sha1': sha1,
        },
        body: fileStream,
        duplex: 'half',
    })

    if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        throw new Error(`B2 upload failed (${uploadRes.status}): ${errText}`)
    }

    // Report small file upload complete
    if (jobId) {
        updateJob(jobId, { progress: 95, updatedAt: new Date().toISOString() }).catch(() => { })
    }

    const b2Url = `/api/b2-proxy?file=${encodeURIComponent(b2FileName)}`
    console.log(`   ✅ B2 upload complete: ${b2FileName}`)
    return b2Url
}

// ============================================
// Global browser instance
// ============================================
let browser = null
let isLoggedIn = false

async function getBrowser() {
    if (!browser || !browser.connected) {
        console.log('🌐 Launching browser...')
        // Close old crashed browser if exists
        if (browser) {
            try { await browser.close() } catch { }
            browser = null
        }
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        })
        isLoggedIn = false
        console.log('   ✅ Browser launched')
    }
    return browser
}

// ============================================
// Login to skbj.tv
// ============================================
async function loginToSkbj(forceRelogin = false) {
    if (isLoggedIn && !forceRelogin) return
    isLoggedIn = false // Reset before attempting

    const b = await getBrowser()
    const page = await b.newPage()

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')

        console.log('🔑 Logging in to skbj.tv...')
        await page.goto('https://skbj.tv/login', { waitUntil: 'networkidle2', timeout: 60000 })

        // Wait for Cloudflare
        await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 30000 }).catch(() => { })
        await new Promise(r => setTimeout(r, 3000))

        // Find login inputs
        const loginSelectors = ['input[type="email"]', 'input[name="email"]', 'input[name="username"]', 'input[name="login"]', 'input[id="email"]', 'input[placeholder*="이메일"]', 'input[placeholder*="email"]']
        const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id="password"]']

        let emailInput = null
        for (const sel of loginSelectors) {
            emailInput = await page.$(sel)
            if (emailInput) { console.log(`   Found email input: ${sel}`); break }
        }

        let passwordInput = null
        for (const sel of passwordSelectors) {
            passwordInput = await page.$(sel)
            if (passwordInput) { console.log(`   Found password input: ${sel}`); break }
        }

        if (!emailInput || !passwordInput) {
            const debugPath = path.join(TEMP_DIR, 'login_debug.png')
            await page.screenshot({ path: debugPath, fullPage: true })
            await page.close()
            throw new Error('Login form not found. Check worker/temp/login_debug.png')
        }

        await emailInput.click({ clickCount: 3 })
        await emailInput.type(SKBJ_EMAIL, { delay: 50 })
        await passwordInput.click({ clickCount: 3 })
        await passwordInput.type(SKBJ_PASSWORD, { delay: 50 })

        // Submit
        const btn = await page.$('button[type="submit"]')
        if (btn) await btn.click()
        else await passwordInput.press('Enter')

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => { })
        await new Promise(r => setTimeout(r, 2000))

        if (!page.url().includes('/login')) {
            isLoggedIn = true
            console.log('   ✅ Login successful!')
        } else {
            console.log('   ❌ Login may have failed.')
        }

        await page.close()
    } catch (err) {
        isLoggedIn = false // Ensure flag is reset on failure
        try { await page.close() } catch { }
        throw err
    }
}

// ============================================
// Extract video URL + title + streamer hint
// With overall 120-second timeout safety net
// ============================================
async function extractVideoUrl(pageUrl) {
    // Overall timeout wrapper — if extraction takes > 120s, abort entirely
    return Promise.race([
        _extractVideoUrlInner(pageUrl),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`extractVideoUrl timed out after 120s for: ${pageUrl}`)), 120000)
        )
    ])
}

async function _extractVideoUrlInner(pageUrl) {
    console.log(`   [${new Date().toLocaleTimeString()}] 🔍 extractVideoUrl 시작: ${pageUrl}`)
    await loginToSkbj()

    const b = await getBrowser()
    const page = await b.newPage()

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')

        // Intercept network requests for video URLs
        const videoUrls = []
        await page.setRequestInterception(true)
        page.on('request', (req) => {
            const url = req.url()
            if ((url.includes('.mp4') || url.includes('.m3u8') || url.includes('.webm') ||
                url.includes('/video/') || url.includes('stream')) &&
                !url.includes('.js') && !url.includes('.css')) {
                videoUrls.push(url)
            }
            req.continue()
        })

        console.log(`   [${new Date().toLocaleTimeString()}] 🔍 Navigating to: ${pageUrl}`)
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {
            console.warn('   ⚠️ Navigation networkidle2 timed out, continuing with domcontentloaded...')
            return page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { })
        })

        // Cloudflare 대기 — 최대 30초, 2초 간격 재확인
        for (let retry = 0; retry < 15; retry++) {
            const currentTitle = await page.title()
            if (!currentTitle.includes('Just a moment') && !currentTitle.includes('Checking')) break
            console.log(`   ⏳ Cloudflare 대기 중... (${retry + 1}/15)`)
            await new Promise(r => setTimeout(r, 2000))
        }
        await new Promise(r => setTimeout(r, 3000))

        // ============================================
        // 다중 전략 제목 추출 (Deep Scraping)
        // ============================================
        const pageTitle = await page.evaluate(() => {
            // 1순위: OG title meta tag
            const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
            if (ogTitle && ogTitle.trim().length > 2) return ogTitle.trim()

            // 2순위: twitter:title meta tag  
            const twTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
            if (twTitle && twTitle.trim().length > 2) return twTitle.trim()

            // 3순위: h1 태그 (가장 큰 제목)
            const h1 = document.querySelector('h1')?.textContent?.trim()
            if (h1 && h1.length > 2 && h1.length < 200) return h1

            // 4순위: 비디오 플레이어 근처 제목 영역
            const videoTitleSelectors = [
                '.video-title', '.title', '[class*="title"]',
                '.video-info h2', '.video-details h2',
                '.content-title', '.post-title',
            ]
            for (const sel of videoTitleSelectors) {
                const el = document.querySelector(sel)
                const text = el?.textContent?.trim()
                if (text && text.length > 2 && text.length < 200) return text
            }

            // 5순위: h2 태그
            const h2 = document.querySelector('h2')?.textContent?.trim()
            if (h2 && h2.length > 2 && h2.length < 200) return h2

            // 6순위: document.title (사이트명 제거)
            const docTitle = document.title
            if (docTitle && !docTitle.includes('Just a moment') && docTitle.length > 2) {
                // " - site.com" 또는 " | site" 패턴 제거
                return docTitle.replace(/\s*[-|]\s*[^-|]*$/, '').trim()
            }

            return ''
        })
        console.log(`   📝 추출된 제목: "${pageTitle || '(없음)'}" `)

        // ============================================
        // 스트리머 힌트 추출 (페이지에서)
        // ============================================
        const streamerHint = await page.evaluate(() => {
            const hints = []

            // 채널/업로더 관련 요소 탐색
            const selectors = [
                '.channel-name', '.uploader', '.uploader-name',
                '[class*="author"]', '[class*="channel"]', '[class*="creator"]',
                '[class*="username"]', '[class*="user-name"]',
                '.video-info .name', '.video-uploader',
                // 프로필 링크 텍스트
            ]
            for (const sel of selectors) {
                const el = document.querySelector(sel)
                const text = el?.textContent?.trim()
                if (text && text.length > 1 && text.length < 50) {
                    hints.push(text)
                }
            }

            // 프로필/채널 링크에서 텍스트 추출
            const profileLinks = document.querySelectorAll(
                'a[href*="/user/"], a[href*="/channel/"], a[href*="/profile/"], a[href*="/model/"], a[href*="/actress/"], a[href*="/pornstar/"]'
            )
            profileLinks.forEach(a => {
                const text = a.textContent?.trim()
                if (text && text.length > 1 && text.length < 50) hints.push(text)
                // href에서도 이름 추출
                const href = a.getAttribute('href') || ''
                const nameFromHref = href.split('/').filter(Boolean).pop()
                if (nameFromHref && nameFromHref.length > 1) hints.push(nameFromHref)
            })

            // OG 또는 meta에서 추출
            const ogAuthor = document.querySelector('meta[name="author"]')?.getAttribute('content')
            if (ogAuthor) hints.push(ogAuthor)

            // 태그/카테고리에서 추출
            const tagElements = document.querySelectorAll('.tag, [class*="tag"], .category a, [class*="categor"] a')
            tagElements.forEach(t => {
                const text = t.textContent?.trim()
                if (text && text.length > 1 && text.length < 30) hints.push(text)
            })

            return [...new Set(hints)]
        })
        if (streamerHint.length > 0) {
            console.log(`   👤 스트리머 힌트: [${streamerHint.slice(0, 5).join(', ')}]`)
        }

        // Click play button to trigger video URL loading
        const playSelectors = ['button.play-btn', 'button.vjs-big-play-button', '.video-play-button', '.play-button', 'button[aria-label="Play"]', '.vjs-poster', 'video', '.plyr__control--overlaid', '[data-plyr="play"]']
        for (const sel of playSelectors) {
            try {
                const el = await page.$(sel)
                if (el) { await el.click(); console.log(`   ▶ Clicked: ${sel}`); break }
            } catch { }
        }

        await new Promise(r => setTimeout(r, 5000))

        // Extract from DOM
        const videoSrc = await page.evaluate(() => {
            const sources = []
            document.querySelectorAll('video').forEach(v => {
                if (v.src) sources.push(v.src)
                if (v.currentSrc) sources.push(v.currentSrc)
                v.querySelectorAll('source').forEach(s => { if (s.src) sources.push(s.src) })
            })
            return sources
        })

        // Extract from HTML source
        const html = await page.content()
        const htmlUrls = []
        const patterns = [/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi, /https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/gi]
        for (const p of patterns) {
            for (const m of html.matchAll(p)) htmlUrls.push(m[0])
        }

        // Get cookies
        const cookies = await page.cookies()
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

        const allUrls = [...new Set([...videoUrls, ...videoSrc, ...htmlUrls])].filter(u => u.startsWith('http'))
        const mp4s = allUrls.filter(u => u.includes('.mp4'))
        const m3u8s = allUrls.filter(u => u.includes('.m3u8'))
        const bestUrl = mp4s[0] || m3u8s[0] || allUrls[0]

        if (allUrls.length > 0) {
            console.log(`   Found ${allUrls.length} video URL(s):`)
            allUrls.slice(0, 3).forEach(u => console.log(`     - ${u.substring(0, 100)}...`))
        }

        if (!bestUrl) {
            await page.screenshot({ path: path.join(TEMP_DIR, 'video_debug.png'), fullPage: true })
            fs.writeFileSync(path.join(TEMP_DIR, 'video_debug.html'), html)
        }

        await page.close()
        return {
            videoUrl: bestUrl || null,
            pageTitle: pageTitle || '',
            streamerHint: streamerHint || [],
            cookieString,
        }
    } catch (err) {
        console.error(`   [${new Date().toLocaleTimeString()}] ❌ extractVideoUrl 실패:`, err.message)
        try { await page.close() } catch { }
        // If login might have expired, force re-login next time
        if (err.message?.includes('Login') || err.message?.includes('timeout')) {
            isLoggedIn = false
        }
        throw err
    }
}

// ============================================
// API Request (for non-queue endpoints only, e.g. add-video)
// ============================================
async function apiRequest(endpoint, method = 'GET', body = null, timeoutMs = 15000) {
    const url = `${SITE_URL}${endpoint}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
            signal: controller.signal,
        }
        if (body) options.body = JSON.stringify(body)
        const res = await fetch(url, options)
        if (!res.ok) {
            const text = await res.text()
            throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${text}`)
        }
        return res.json()
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`API ${method} ${endpoint} timed out after ${timeoutMs}ms`)
        }
        throw err
    } finally {
        clearTimeout(timer)
    }
}

// checkJobCancelled — imported from firebase-direct.js (REST API)

// Get streamers from Firestore directly (REST API)
async function getStreamersFromDB() {
    try {
        return await getStreamers()
    } catch (e) {
        console.warn('   ⚠️ 스트리머 DB 조회 오류:', e.message)
        return []
    }
}

// ============================================
// Download file with cookies
// ============================================
function downloadFile(url, destPath, cookies = '', onProgress = null) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath)
        const protocol = url.startsWith('https') ? https : http
        const urlObj = new URL(url)

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': 'https://skbj.tv/', 'Origin': 'https://skbj.tv',
        }
        if (cookies) headers['Cookie'] = cookies

        const request = protocol.request({
            hostname: urlObj.hostname,
            port: urlObj.port || (url.startsWith('https') ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET', headers,
        }, (response) => {
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                file.close()
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
                const redir = response.headers.location
                const fullUrl = redir.startsWith('http') ? redir : new URL(redir, url).href
                return downloadFile(fullUrl, destPath, cookies).then(resolve).catch(reject)
            }
            if (response.statusCode !== 200) {
                file.close()
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
                return reject(new Error(`Download failed: HTTP ${response.statusCode}`))
            }

            const totalSize = parseInt(response.headers['content-length'] || '0')
            let downloaded = 0
            let lastReportedPct = 0
            response.on('data', (chunk) => {
                downloaded += chunk.length
                if (totalSize > 0) {
                    const pct = Math.round((downloaded / totalSize) * 100)
                    process.stdout.write(`\r   ⬇ 다운로드 중: ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`)
                    // Report download progress to UI (10% → 50%) every 10%
                    if (onProgress && pct >= lastReportedPct + 10) {
                        lastReportedPct = pct
                        const uiProgress = Math.round(10 + (pct / 100) * 40)
                        onProgress(uiProgress)
                    }
                } else {
                    process.stdout.write(`\r   ⬇ 다운로드 중: ${(downloaded / 1024 / 1024).toFixed(1)}MB`)
                }
            })
            response.pipe(file)
            file.on('finish', () => {
                file.close()
                console.log(`\n   ✅ 다운로드 완료: ${(downloaded / 1024 / 1024).toFixed(1)}MB`)
                resolve(destPath)
            })
        })

        request.on('error', (err) => {
            file.close()
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
            reject(err)
        })
        request.setTimeout(3600000, () => {
            request.destroy()
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
            reject(new Error('다운로드 타임아웃 (60분)'))
        })
        request.end()
    })
}

// ============================================
// Detect video codec using ffprobe
// ============================================
function detectCodec(filePath) {
    try {
        const codec = execSync(
            `ffprobe -v error -analyzeduration 100M -probesize 100M -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
            { encoding: 'utf8', timeout: 30000 }
        ).trim().toLowerCase()
        return codec
    } catch (e) {
        console.warn(`   ⚠️ 코덱 감지 실패:`, e.message)
        return 'unknown'
    }
}

// ============================================
// Transcode HEVC to H.264 for browser compatibility
// ============================================
function transcodeToH264(inputPath, outputPath, jobId = null) {
    console.log(`   🔄 HEVC → H.264 트랜스코딩 시작...`)
    try {
        execSync(
            `ffmpeg -y -i "${inputPath}" -c:v libx264 -crf 23 -preset medium -c:a aac -movflags +faststart "${outputPath}"`,
            { timeout: 7200000, stdio: 'pipe' } // 2 hour timeout for long videos
        )
        const inputSize = (fs.statSync(inputPath).size / 1024 / 1024).toFixed(1)
        const outputSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)
        console.log(`   ✅ 트랜스코딩 완료: ${inputSize}MB → ${outputSize}MB`)
        return true
    } catch (e) {
        console.error(`   ❌ 트랜스코딩 실패:`, e.message)
        return false
    }
}

// ============================================
// Process a single job
// ============================================
async function processJob(job) {
    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📥 작업 처리 중: ${job.title || job.sourceUrl}`)
    console.log(`   ID: ${job.id}`)
    console.log(`   URL: ${job.sourceUrl}`)
    console.log(`${'─'.repeat(50)}`)

    const tempFile = path.join(TEMP_DIR, `dl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp4`)
    const transcodedFile = tempFile.replace('.mp4', '_h264.mp4')
    let activeFile = tempFile // Points to the file we'll actually upload (original or transcoded)

    try {
        console.log(`   [${new Date().toLocaleTimeString()}] ▶ 작업 시작`)
        // Progress 5 update — non-blocking, don't fail job if this fails
        updateJob(job.id, { progress: 5, updatedAt: new Date().toISOString() }).catch(e => {
            console.warn(`   ⚠️ progress 5 업데이트 실패 (무시):`, e.message)
        })

        const isLocalFile = job.sourceUrl.startsWith('local://')
        let title = ''
        let rawSlug = ''
        let fileName = 'video.mp4'
        let extractedTitle = ''
        let extractedDate = ''
        let remainder = ''

        if (isLocalFile) {
            // ============================================
            // 로컬 파일 모드: 폴더 감시에서 추가된 job
            // ============================================
            const localPath = job.sourceUrl.replace('local://', '')
            console.log(`   📂 로컬 파일 모드: ${localPath}`)

            if (!fs.existsSync(localPath)) {
                throw new Error(`로컬 파일을 찾을 수 없습니다: ${localPath}`)
            }

            // Copy local file to temp (don't move original yet)
            fileName = path.basename(localPath)
            fs.copyFileSync(localPath, tempFile)
            const fileSize = (fs.statSync(tempFile).size / 1024 / 1024).toFixed(1)
            console.log(`   ✅ 로컬 파일 복사 완료: ${fileSize}MB`)

            // Derive title from filename
            rawSlug = path.basename(localPath, path.extname(localPath))
            // Extract date (YYYY_MM_DD) from filename
            extractedDate = ''
            remainder = rawSlug
            // Try YYYYMMDD (8 digits at start or after separator)
            const dateMatch8 = rawSlug.match(/(\d{4})(\d{2})(\d{2})/)
            if (dateMatch8) {
                extractedDate = `${dateMatch8[1]}_${dateMatch8[2]}_${dateMatch8[3]}`
                remainder = rawSlug.replace(dateMatch8[0], '')
            } else {
                // Try YYYY-MM-DD or YYYY_MM_DD
                const dateMatchSep = rawSlug.match(/(\d{4})[-_](\d{2})[-_](\d{2})/)
                if (dateMatchSep) {
                    extractedDate = `${dateMatchSep[1]}_${dateMatchSep[2]}_${dateMatchSep[3]}`
                    remainder = rawSlug.replace(dateMatchSep[0], '')
                }
            }
            // Clean remainder: replace separators with spaces, trim
            remainder = remainder.replace(/[_\-]+/g, ' ').trim()
            title = job.title || remainder || 'Untitled'
            console.log(`   📋 파일명에서 추출 — 날짜: "${extractedDate}", 나머지: "${remainder}"`)

            await updateJob(job.id, {
                progress: 40,
                title: title,
                updatedAt: new Date().toISOString(),
            })
        } else {
            // ============================================
            // URL 모드: 기존 로직
            // ============================================
            // Extract video URL
            console.log('   🔍 영상 URL 추출 중...')
            const result = await extractVideoUrl(job.sourceUrl)
            if (!result.videoUrl) throw new Error('영상 URL을 찾을 수 없습니다. worker/temp/video_debug.png 확인')

            console.log(`   📎 영상 URL: ${result.videoUrl.substring(0, 80)}...`)
            // ============================================
            // 제목 결정: 다중 소스 + slug 정리 폴백
            // ============================================
            extractedTitle = result.pageTitle || ''
            const urlPath = new URL(job.sourceUrl).pathname
            rawSlug = (urlPath.split('/').pop() || '').replace(/\.[^.]+$/, '')
            // URL slug에서 날짜 추출 및 나머지 분리
            extractedDate = ''
            let urlRemainder = rawSlug
            const urlDateMatch8 = rawSlug.match(/(\d{4})(\d{2})(\d{2})/)
            if (urlDateMatch8) {
                extractedDate = `${urlDateMatch8[1]}_${urlDateMatch8[2]}_${urlDateMatch8[3]}`
                urlRemainder = rawSlug.replace(urlDateMatch8[0], '')
            } else {
                const urlDateMatchSep = rawSlug.match(/(\d{4})[-_](\d{2})[-_](\d{2})/)
                if (urlDateMatchSep) {
                    extractedDate = `${urlDateMatchSep[1]}_${urlDateMatchSep[2]}_${urlDateMatchSep[3]}`
                    urlRemainder = rawSlug.replace(urlDateMatchSep[0], '')
                }
            }
            const cleanedSlug = urlRemainder
                .replace(/[_\-]+/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase())
                .trim()
            remainder = cleanedSlug

            if (job.titleSource === 'fileName') {
                title = cleanedSlug || extractedTitle || job.title || 'Untitled'
            } else {
                title = job.title || extractedTitle || cleanedSlug || 'Untitled'
            }
            console.log(`   📋 최종 제목 결정: "${title}"`)
            console.log(`     ├ 수동 입력: "${job.title || '(없음)'}"`)
            console.log(`     ├ 페이지 추출: "${extractedTitle || '(없음)'}"`)
            console.log(`     └ URL slug: "${cleanedSlug || '(없음)'}"`)

            await updateJob(job.id, {
                progress: 10,
                title: title,
                updatedAt: new Date().toISOString(),
            })

            // Download
            console.log('   ⬇ 다운로드 시작...')
            await downloadFile(result.videoUrl, tempFile, result.cookieString, (progress) => {
                updateJob(job.id, { progress, updatedAt: new Date().toISOString() }).catch(() => { })
            })

            try {
                const baseName = path.basename(new URL(result.videoUrl).pathname)
                if (baseName && path.extname(baseName)) fileName = baseName
            } catch { }
            if (!path.extname(fileName)) fileName += '.mp4'
        }

        // ============================================
        // HEVC Detection & Auto-Transcoding
        // ============================================
        const codec = detectCodec(tempFile)
        console.log(`   🎬 감지된 코덱: ${codec}`)

        if (codec === 'hevc' || codec === 'h265') {
            console.log(`   ⚠️ HEVC 코덱 감지 → H.264로 트랜스코딩 필요`)
            await updateJob(job.id, {
                progress: 45,
                updatedAt: new Date().toISOString(),
            })

            const success = transcodeToH264(tempFile, transcodedFile, job.id)
            if (success && fs.existsSync(transcodedFile) && fs.statSync(transcodedFile).size > 0) {
                activeFile = transcodedFile
                console.log(`   ✅ H.264 변환 완료, 변환된 파일 사용`)
            } else {
                console.warn(`   ⚠️ 트랜스코딩 실패, 원본 파일 그대로 업로드`)
                activeFile = tempFile
            }
        }

        await updateJob(job.id, {
            progress: 50,
            title: title,
            updatedAt: new Date().toISOString(),
        })

        // B2에 직접 업로드
        const b2Url = await uploadToB2(activeFile, fileName, job.id)

        const finalTitle = title

        await updateJob(job.id, {
            status: 'done', progress: 100, b2Url,
            title: finalTitle,
            updatedAt: new Date().toISOString(),
        })

        // ============================================
        // Register video in the site database
        // ============================================
        try {
            // Determine streamer: prefer job-provided values, fallback to smart matching
            let streamerName = job.streamerName || null
            let streamerId = job.streamerId || null
            let streamerKoreanName = ''

            // Extract slug from URL for matching
            const slug = rawSlug.toLowerCase()

            if (!streamerName) {
                try {
                    const allStreamers = await getStreamersFromDB()
                    if (allStreamers.length > 0) {
                        // Sort by name length (longest first) to match most specific name
                        const sortedStreamers = allStreamers.sort((a, b) =>
                            (b.name?.length || 0) - (a.name?.length || 0)
                        )

                        let matched = null

                        // 1단계: streamerHint (페이지 스크래핑 결과) 매칭 — URL 모드에서만 가능
                        const streamerHints = (!isLocalFile && typeof result !== 'undefined' && result.streamerHint) ? result.streamerHint : []
                        if (streamerHints.length > 0) {
                            for (const hint of streamerHints) {
                                const hintLower = hint.toLowerCase()
                                matched = sortedStreamers.find(s =>
                                    hintLower.includes(s.name?.toLowerCase()) ||
                                    hintLower.includes(s.id?.toLowerCase()) ||
                                    (s.koreanName && hintLower.includes(s.koreanName.toLowerCase())) ||
                                    s.name?.toLowerCase().includes(hintLower) ||
                                    s.id?.toLowerCase().includes(hintLower) ||
                                    (s.koreanName && s.koreanName.toLowerCase().includes(hintLower))
                                )
                                if (matched) {
                                    console.log(`   👤 페이지 힌트에서 스트리머 매칭: "${hint}" → ${matched.name} (${matched.koreanName || ''})`)
                                    break
                                }
                            }
                        }

                        // 2단계: 제목에서 스트리머 매칭
                        if (!matched && extractedTitle) {
                            const titleLower = extractedTitle.toLowerCase()
                            matched = sortedStreamers.find(s =>
                                titleLower.includes(s.name?.toLowerCase()) ||
                                (s.koreanName && titleLower.includes(s.koreanName.toLowerCase()))
                            )
                            if (matched) {
                                console.log(`   👤 제목에서 스트리머 매칭: "${extractedTitle}" → ${matched.name}`)
                            }
                        }

                        // 3단계: URL slug에서 매칭 (기존 로직)
                        if (!matched) {
                            matched = sortedStreamers.find(s =>
                                slug.includes(s.id?.toLowerCase()) ||
                                slug.includes(s.name?.toLowerCase()) ||
                                (s.koreanName && slug.includes(s.koreanName.toLowerCase()))
                            )
                            if (matched) {
                                console.log(`   👤 URL slug에서 스트리머 매칭: ${matched.name} (${matched.koreanName || ''})`)
                            }
                        }

                        if (matched) {
                            streamerId = matched.id
                            streamerName = matched.name
                            streamerKoreanName = matched.koreanName || ''
                        }
                    }
                } catch { }

                // Fallback: URL slug에서 마지막 세그먼트 추출
                if (!streamerName) {
                    const parts = slug.split('-').filter(p => p.length > 1)
                    streamerName = parts[parts.length - 1] || 'unknown'
                    console.log(`   👤 URL 끝부분에서 스트리머 추출(폴백): ${streamerName}`)
                }
            }

            if (!streamerId) streamerId = streamerName

            // Extract real video duration AND dimensions using ffprobe (use activeFile for accurate results)
            let duration = '0:00'
            let videoOrientation = 'horizontal'
            try {
                const durationOutput = execSync(
                    `ffprobe -v error -analyzeduration 100M -probesize 100M -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${activeFile}"`,
                    { encoding: 'utf8', timeout: 30000 }
                ).trim()
                const totalSeconds = Math.round(parseFloat(durationOutput))
                if (totalSeconds > 0) {
                    const hours = Math.floor(totalSeconds / 3600)
                    const minutes = Math.floor((totalSeconds % 3600) / 60)
                    const seconds = totalSeconds % 60
                    duration = hours > 0
                        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                        : `${minutes}:${String(seconds).padStart(2, '0')}`
                    console.log(`   ⏱️ 영상 길이: ${duration}`)
                }
            } catch (e) {
                console.warn(`   ⚠️ ffprobe 실패:`, e.message)
            }

            // Auto-detect orientation via ffprobe (width vs height)
            try {
                const dimOutput = execSync(
                    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${activeFile}"`,
                    { encoding: 'utf8', timeout: 15000 }
                ).trim()
                const [w, h] = dimOutput.split(',').map(Number)
                if (w > 0 && h > 0) {
                    videoOrientation = h > w ? 'vertical' : 'horizontal'
                    console.log(`   📐 영상 방향: ${w}x${h} → ${videoOrientation}`)
                }
            } catch (e) {
                console.warn(`   ⚠️ 영상 방향 감지 실패:`, e.message)
            }

            // Generate thumbnail using ffmpeg (capture at 5 seconds, use activeFile)
            let thumbnailUrl = undefined
            const thumbFile = activeFile.replace(/\.[^.]+$/, '_thumb.jpg')
            try {
                execSync(
                    `ffmpeg -y -analyzeduration 100M -probesize 100M -i "${activeFile}" -ss 5 -vframes 1 -q:v 2 -vf "scale=640:-1" "${thumbFile}"`,
                    { encoding: 'utf8', timeout: 60000, stdio: 'pipe' }
                )
                if (fs.existsSync(thumbFile) && fs.statSync(thumbFile).size > 0) {
                    console.log(`   🖼️ 썸네일 생성 완료`)
                    const thumbB2Name = `thumbnails/${path.basename(fileName, path.extname(fileName))}.jpg`
                    thumbnailUrl = await uploadToB2(thumbFile, thumbB2Name)
                    console.log(`   🖼️ 썸네일 업로드 완료: ${thumbB2Name}`)
                }
            } catch (e) {
                console.warn(`   ⚠️ 썸네일 생성 실패:`, e.message)
            } finally {
                if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile)
            }

            // Generate 5 preview frames for hover preview (use activeFile)
            const previewUrls = []
            try {
                const totalSeconds = Math.round(parseFloat(
                    execSync(`ffprobe -v error -analyzeduration 100M -probesize 100M -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${activeFile}"`, { encoding: 'utf8', timeout: 15000 }).trim()
                ) || 0)
                if (totalSeconds > 2) {
                    console.log(`   🎞️ 미리보기 프레임 5장 추출 중...`)
                    const frameCount = 5
                    // Evenly spaced points (avoid first/last 10%)
                    const start = Math.max(1, Math.floor(totalSeconds * 0.1))
                    const end = Math.floor(totalSeconds * 0.9)
                    const step = Math.max(1, Math.floor((end - start) / (frameCount - 1)))

                    for (let i = 0; i < frameCount; i++) {
                        const seekTime = Math.min(start + step * i, end)
                        const previewFile = activeFile.replace(/\.[^.]+$/, `_preview${i}.jpg`)
                        try {
                            execSync(
                                `ffmpeg -y -analyzeduration 100M -probesize 100M -ss ${seekTime} -i "${activeFile}" -vframes 1 -q:v 3 -vf "scale=480:-1" "${previewFile}"`,
                                { encoding: 'utf8', timeout: 30000, stdio: 'pipe' }
                            )
                            if (fs.existsSync(previewFile) && fs.statSync(previewFile).size > 0) {
                                const pvB2Name = `previews/${path.basename(fileName, path.extname(fileName))}_${i}.jpg`
                                const pvUrl = await uploadToB2(previewFile, pvB2Name)
                                previewUrls.push(pvUrl)
                            }
                        } catch (e) {
                            console.warn(`   ⚠️ 프레임 ${i + 1} 추출 실패:`, e.message)
                        } finally {
                            if (fs.existsSync(previewFile)) fs.unlinkSync(previewFile)
                        }
                    }
                    console.log(`   🎞️ 미리보기 ${previewUrls.length}장 업로드 완료`)
                }
            } catch (e) {
                console.warn(`   ⚠️ 미리보기 프레임 추출 실패:`, e.message)
            }

            // Find or match streamer in database (secondary check for job-provided streamers)
            if (job.streamerName || job.streamerId) {
                try {
                    const allStreamers = await getStreamersFromDB()
                    if (allStreamers.length > 0) {
                        const found = allStreamers.find(s =>
                            s.id === streamerId ||
                            s.name === streamerName ||
                            s.id === streamerName ||
                            (s.koreanName && s.koreanName === streamerName)
                        )
                        if (found) {
                            streamerId = found.id
                            if (!job.streamerName) streamerName = found.name
                            console.log(`   👤 스트리머 DB 매칭: ${found.name} (${found.koreanName || ''}) → id: ${found.id}`)
                        } else {
                            console.warn(`   ⚠️ 스트리머 "${streamerName}" DB에 없음 → streamerId: "${streamerId}"`)
                        }
                    }
                } catch { }
            }

            const gradients = [
                'from-pink-700 to-purple-700', 'from-blue-700 to-indigo-700',
                'from-cyan-700 to-teal-700', 'from-amber-700 to-orange-700',
                'from-rose-700 to-pink-700', 'from-violet-700 to-purple-700',
            ]
            const gradient = gradients[Math.floor(Math.random() * gradients.length)]

            const video = {
                title: (() => {
                    // Construct title: YYYY_MM_DD_한글닉_영어ID_나머지 (skip empty parts)
                    const parts = []
                    if (typeof extractedDate !== 'undefined' && extractedDate) parts.push(extractedDate)
                    if (streamerKoreanName) parts.push(streamerKoreanName)
                    if (streamerName && streamerName !== streamerKoreanName) parts.push(streamerName)
                    // Add remainder (cleaned from date/streamer info)
                    let rem = remainder || ''
                    // Remove streamer name/id/korean from remainder to avoid duplication
                    const escRx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    if (streamerName) rem = rem.replace(new RegExp(escRx(streamerName), 'gi'), '').trim()
                    if (streamerKoreanName) rem = rem.replace(new RegExp(escRx(streamerKoreanName), 'gi'), '').trim()
                    if (streamerId && streamerId !== streamerName) rem = rem.replace(new RegExp(escRx(streamerId), 'gi'), '').trim()
                    rem = rem.replace(/^[\s_-]+|[\s_-]+$/g, '').trim()
                    if (rem) parts.push(rem)
                    const constructed = parts.join('_')
                    console.log(`   📝 최종 제목 조합: "${constructed}"`)
                    return constructed || title || 'Untitled'
                })(),
                streamerId,
                streamerName,
                views: 0,
                likes: 0,
                duration,
                isVip: true,
                minStreamingLevel: 'vip',
                minDownloadLevel: 'vip',
                gradient,
                uploadedAt: new Date().toISOString(),
                videoUrl: b2Url,
                thumbnailUrl: thumbnailUrl || undefined,
                previewUrls: previewUrls.length > 0 ? previewUrls : undefined,
                tags: [],
                orientation: videoOrientation,
            }

            // Register video directly in Firestore (REST API)
            const existingStreamer = await getStreamer(streamerId)
            if (!existingStreamer) {
                // Create streamer doc if doesn't exist
                await setDocument('streamers', streamerId, {
                    id: streamerId,
                    name: streamerName || streamerId,
                    videoCount: 0,
                    createdAt: new Date().toISOString(),
                })
            }

            const videoId = `vid_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
            await addVideo(streamerId, videoId, video)

            // Increment video count
            try {
                const currentData = await getStreamer(streamerId)
                await updateStreamer(streamerId, {
                    videoCount: (currentData?.videoCount || 0) + 1,
                    updatedAt: new Date().toISOString(),
                })
            } catch { }

            console.log(`   📺 DB에 영상 등록 완료: "${video.title}" (${duration})`)
        } catch (regError) {
            console.warn(`   ⚠️ DB 등록 오류:`, regError.message)
            // Don't fail the job - the video is already uploaded to B2
        }

        console.log(`   🎉 작업 완료!`)
    } catch (error) {
        console.error(`   ❌ 작업 실패:`, error.message)
        await updateJob(job.id, {
            status: 'failed',
            error: error.message?.substring(0, 500) || 'Unknown error',
            updatedAt: new Date().toISOString(),
        }).catch(e => console.error('상태 업데이트 실패:', e))
    } finally {
        // Clean up both original and transcoded files
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        if (fs.existsSync(transcodedFile)) fs.unlinkSync(transcodedFile)

        // Move processed local file to done/ folder
        if (job.sourceUrl.startsWith('local://')) {
            const localPath = job.sourceUrl.replace('local://', '')
            if (fs.existsSync(localPath)) {
                try {
                    const doneDir = path.join(path.dirname(localPath), 'done')
                    if (!fs.existsSync(doneDir)) fs.mkdirSync(doneDir, { recursive: true })
                    const donePath = path.join(doneDir, path.basename(localPath))
                    fs.renameSync(localPath, donePath)
                    console.log(`   📁 원본 파일 이동: done/${path.basename(localPath)}`)
                } catch (e) {
                    console.warn(`   ⚠️ 원본 파일 이동 실패:`, e.message)
                }
            }
        }
    }
}

// ============================================
// Main polling loop (with crash recovery)
// ============================================
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 5

// Track active concurrent jobs
const activeJobs = new Map() // jobId -> Promise

async function pollLoop() {
    console.log(`🔄 작업 대기 중... (${POLL_INTERVAL_MS / 1000}초 간격, 동시 ${MAX_CONCURRENT_JOBS}개)`)

    try {
        await loginToSkbj()
        console.log('✅ 초기 로그인 완료')
    } catch (err) {
        console.error('⚠️ 초기 로그인 실패 (계속 진행):', err.message)
    }

    while (true) {
        try {
            // Clean up completed jobs from tracking map
            for (const [id, promise] of activeJobs.entries()) {
                // Check if promise is settled by racing with an instant resolve
                const settled = await Promise.race([
                    promise.then(() => true, () => true),
                    Promise.resolve(false)
                ])
                if (settled) activeJobs.delete(id)
            }

            // Claim jobs up to concurrency limit
            if (activeJobs.size < MAX_CONCURRENT_JOBS) {
                const job = await claimJob(WORKER_ID)
                if (job) {
                    consecutiveErrors = 0
                    const slotNum = activeJobs.size + 1
                    console.log(`\n[${new Date().toLocaleTimeString()}] 📦 작업 수신 [${slotNum}/${MAX_CONCURRENT_JOBS}]: ${job.sourceUrl}`)

                    // Start job processing but don't await — run concurrently
                    const jobPromise = processJob(job).catch(err => {
                        console.error(`   ❌ 작업 ${job.id} 예외:`, err.message)
                    })
                    activeJobs.set(job.id, jobPromise)

                    // If we still have capacity, try claiming more immediately
                    if (activeJobs.size < MAX_CONCURRENT_JOBS) {
                        continue // Skip the sleep, try to claim another right away
                    }
                } else {
                    if (activeJobs.size > 0) {
                        process.stdout.write(`[${activeJobs.size} active]`)
                    } else {
                        process.stdout.write('.')
                    }
                }
                consecutiveErrors = 0
            } else {
                process.stdout.write(`[${activeJobs.size}/${MAX_CONCURRENT_JOBS} full]`)
            }
        } catch (error) {
            consecutiveErrors++
            console.error(`\n[${new Date().toLocaleTimeString()}] ⚠️ 폴링 오류 (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error.message)

            // If too many consecutive errors, restart browser
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.log('🔄 연속 오류 한계 도달 — 브라우저 재시작...')
                try {
                    if (browser) { await browser.close(); browser = null }
                } catch { browser = null }
                isLoggedIn = false
                consecutiveErrors = 0

                // Wait longer before next attempt
                await new Promise(r => setTimeout(r, POLL_INTERVAL_MS * 3))
                continue
            }
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 종료 중...')
    if (browser) await browser.close()
    process.exit(0)
})

pollLoop().catch(err => { console.error('치명적 오류:', err); process.exit(1) })
