/**
 * kStreamer Folder Watcher — 바탕화면 폴더 감시 자동 업로드
 * 
 * 지정 폴더에 영상 파일을 넣으면 자동으로 큐에 추가합니다.
 * Firebase에 직접 연결 (Vercel API 우회)
 */

require('dotenv').config()
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const fs = require('fs')
const path = require('path')
const os = require('os')
const { addJob, getStreamers } = require('./firebase-direct')

// ============================================
// Configuration
// ============================================
const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.ADMIN_API_SECRET || ''
const WATCH_DIR = process.env.WATCH_DIR || path.join(os.homedir(), 'Desktop', 'kstreamer-upload')
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.ts', '.flv']
const STABILIZE_INTERVAL_MS = 2000 // File size check interval
const STABILIZE_CHECKS = 3         // Number of stable checks before processing

console.log(`
╔══════════════════════════════════════════╗
║   📂 kStreamer Folder Watcher            ║
║──────────────────────────────────────────║
║  감시 폴더: ${WATCH_DIR.substring(0, 30).padEnd(30)}║
║  영상 확장자: ${VIDEO_EXTENSIONS.join(', ').substring(0, 27).padEnd(27)}║
║  서버: ${SITE_URL.substring(0, 35).padEnd(35)}║
╚══════════════════════════════════════════╝
`)

// ============================================
// Create watch directory if it doesn't exist
// ============================================
if (!fs.existsSync(WATCH_DIR)) {
    fs.mkdirSync(WATCH_DIR, { recursive: true })
    console.log(`📁 감시 폴더 생성: ${WATCH_DIR}`)
}

// Create done subfolder
const DONE_DIR = path.join(WATCH_DIR, 'done')
if (!fs.existsSync(DONE_DIR)) {
    fs.mkdirSync(DONE_DIR, { recursive: true })
}

// Track files being processed to avoid duplicates
const processingFiles = new Set()
const processedFiles = new Set()

// ============================================
// API Request helper (used only for non-Firebase endpoints)
// ============================================
async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${SITE_URL}${endpoint}`
    const options = {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
    }
    if (body) options.body = JSON.stringify(body)
    const res = await fetch(url, options)
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${text}`)
    }
    return res.json()
}

// ============================================
// Extract streamer info from filename
// ============================================
async function matchStreamerFromFilename(filename) {
    const baseName = path.basename(filename, path.extname(filename)).toLowerCase()

    try {
        // Read streamers via Vercel API
        const streamers = await getStreamers()

        // Sort by name length (longest first) for most specific match
        const sorted = streamers.sort((a, b) =>
            (b.name?.length || 0) - (a.name?.length || 0)
        )

        for (const s of sorted) {
            if (baseName.includes(s.id?.toLowerCase()) ||
                baseName.includes(s.name?.toLowerCase()) ||
                (s.koreanName && baseName.includes(s.koreanName.toLowerCase()))) {
                return { streamerId: s.id, streamerName: s.name }
            }
        }
    } catch (e) {
        console.warn(`   ⚠️ 스트리머 매칭 실패:`, e.message)
    }

    return { streamerId: null, streamerName: null }
}

// ============================================
// Wait for file to stabilize (copy complete)
// ============================================
function waitForStableFile(filePath) {
    return new Promise((resolve, reject) => {
        let lastSize = -1
        let stableCount = 0

        const check = setInterval(() => {
            try {
                if (!fs.existsSync(filePath)) {
                    clearInterval(check)
                    reject(new Error('File disappeared'))
                    return
                }

                const currentSize = fs.statSync(filePath).size

                if (currentSize === lastSize && currentSize > 0) {
                    stableCount++
                    if (stableCount >= STABILIZE_CHECKS) {
                        clearInterval(check)
                        resolve(currentSize)
                    }
                } else {
                    stableCount = 0
                    lastSize = currentSize
                }
            } catch {
                // File might be locked during copy
                stableCount = 0
            }
        }, STABILIZE_INTERVAL_MS)

        // Timeout after 10 minutes
        setTimeout(() => {
            clearInterval(check)
            reject(new Error('File stabilization timeout'))
        }, 600000)
    })
}

// ============================================
// Process a new file
// ============================================
async function processNewFile(filePath) {
    const fileName = path.basename(filePath)
    const ext = path.extname(fileName).toLowerCase()

    // Skip non-video files
    if (!VIDEO_EXTENSIONS.includes(ext)) return

    // Skip if already processing or processed
    if (processingFiles.has(filePath) || processedFiles.has(filePath)) return

    // Skip files in done/ folder
    if (filePath.includes(path.sep + 'done' + path.sep)) return

    processingFiles.add(filePath)
    console.log(`\n📥 새 영상 감지: ${fileName}`)

    try {
        // Wait for file copy to complete
        console.log(`   ⏳ 파일 안정화 대기 중...`)
        const fileSize = await waitForStableFile(filePath)
        console.log(`   ✅ 파일 안정화 완료: ${(fileSize / 1024 / 1024).toFixed(1)}MB`)

        // Extract streamer info from filename
        const { streamerId, streamerName } = await matchStreamerFromFilename(fileName)
        if (streamerName) {
            console.log(`   👤 파일명에서 스트리머 감지: ${streamerName}`)
        } else {
            console.log(`   👤 파일명에서 스트리머 미감지 (워커에서 추가 매칭 시도)`)
        }

        // Add to queue with local:// prefix — direct to Firestore
        const localUrl = `local://${filePath}`
        const jobId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
        const job = {
            id: jobId,
            sourceUrl: localUrl,
            status: 'queued',
            title: path.basename(filePath, path.extname(filePath)),
            titleSource: 'fileName',
            streamerId: streamerId || null,
            streamerName: streamerName || null,
            pageNumber: null,
            itemOrder: null,
            priority: 0,
            b2Url: null,
            b2ThumbnailUrl: null,
            error: null,
            progress: 0,
            workerId: null,
            lockedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            retryCount: 0,
        }

        await addJob(job)
        console.log(`   ✅ 큐에 추가 완료! (ID: ${jobId})`)
        processedFiles.add(filePath)
    } catch (err) {
        if (err.code === 'DUPLICATE_JOB') {
            console.log(`   ⏭️ 이미 대기열에 있는 파일입니다. 건너뜁니다: ${fileName}`)
            processedFiles.add(filePath) // Mark as processed so we don't retry
        } else {
            console.error(`   ❌ 처리 실패:`, err.message)
        }
    } finally {
        processingFiles.delete(filePath)
    }
}

// ============================================
// Scan existing files on startup
// ============================================
async function scanExistingFiles() {
    try {
        const files = fs.readdirSync(WATCH_DIR)
        const videoFiles = files.filter(f => {
            const ext = path.extname(f).toLowerCase()
            return VIDEO_EXTENSIONS.includes(ext)
        })

        if (videoFiles.length > 0) {
            console.log(`📂 기존 영상 ${videoFiles.length}개 발견, 큐에 추가 중...`)
            for (const file of videoFiles) {
                await processNewFile(path.join(WATCH_DIR, file))
            }
        }
    } catch (e) {
        console.error('기존 파일 스캔 실패:', e.message)
    }
}

// ============================================
// Retry failed uploads (scan failed/ folder)
// ============================================
const RETRY_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

async function retryFailedFiles() {
    const failedDir = path.join(WATCH_DIR, 'failed')
    if (!fs.existsSync(failedDir)) return

    try {
        const files = fs.readdirSync(failedDir)
        const videoFiles = files.filter(f => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()))

        if (videoFiles.length === 0) return

        console.log(`\n🔄 failed/ 폴더에서 ${videoFiles.length}개 파일 재시도 중...`)
        for (const file of videoFiles) {
            const failedPath = path.join(failedDir, file)
            const retryPath = path.join(WATCH_DIR, file)

            // Skip if a file with same name is already in watch dir or being processed
            if (fs.existsSync(retryPath) || processingFiles.has(retryPath)) continue

            try {
                // Remove from processedFiles set so it can be re-processed
                processedFiles.delete(retryPath)
                fs.renameSync(failedPath, retryPath)
                console.log(`   🔁 재시도: ${file}`)
            } catch (e) {
                console.warn(`   ⚠️ 재시도 이동 실패: ${file}`, e.message)
            }
        }
    } catch (e) {
        console.warn('failed/ 폴더 스캔 실패:', e.message)
    }
}

// ============================================
// Start watching
// ============================================
async function startWatching() {
    // Scan existing files first
    await scanExistingFiles()

    // Watch for new files
    console.log(`\n👀 폴더 감시 시작... (${WATCH_DIR})`)
    console.log(`   영상 파일을 이 폴더에 넣으면 자동으로 업로드됩니다.`)
    console.log(`   처리 완료된 파일은 done/ 폴더로 이동됩니다.`)
    console.log(`   실패한 파일은 failed/ 폴더로 이동 후 5분마다 자동 재시도됩니다.\n`)

    // Debounce map to prevent duplicate events from OS
    const debounceTimers = new Map()

    const watcher = fs.watch(WATCH_DIR, (eventType, filename) => {
        if (!filename) return

        const filePath = path.join(WATCH_DIR, filename)
        const ext = path.extname(filename).toLowerCase()

        if (eventType === 'rename' && VIDEO_EXTENSIONS.includes(ext)) {
            // Skip if already processing or processed
            if (processingFiles.has(filePath) || processedFiles.has(filePath)) return

            // Debounce: cancel previous timer for same file, set new one
            if (debounceTimers.has(filePath)) {
                clearTimeout(debounceTimers.get(filePath))
            }

            debounceTimers.set(filePath, setTimeout(() => {
                debounceTimers.delete(filePath)
                if (fs.existsSync(filePath) && !processingFiles.has(filePath) && !processedFiles.has(filePath)) {
                    processNewFile(filePath)
                }
            }, 3000))
        }
    })

    watcher.on('error', (err) => {
        console.error('감시 오류:', err.message)
    })

    // Periodically retry failed uploads
    setInterval(() => retryFailedFiles(), RETRY_INTERVAL_MS)

    // Keep alive
    process.on('SIGINT', () => {
        console.log('\n👋 폴더 감시 종료')
        watcher.close()
        process.exit(0)
    })
}

startWatching()
