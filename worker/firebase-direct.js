/**
 * Firebase Direct Connection — Vercel API Wrapper
 * 
 * Firestore REST API 직접 접근이 불가하므로 (Cloud Firestore API 비활성화),
 * Vercel 배포된 API를 통해 Firestore에 접근합니다.
 * 
 * 🔧 Node.js https 모듈 사용 (fetch() crash 방지)
 * 🔄 자동 재시도 (3회, 지수 백오프)
 * ⏱️ 타임아웃 30초
 */

const https = require('https')
const http = require('http')

// Hardcode SITE_URL to avoid dotenv conflicts
const SITE_URL = 'https://kdance.xyz'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.ADMIN_API_SECRET || 'dwqr456456g32r323'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const TIMEOUT_MS = 30000

// ============================================
// HTTP Request with Retry
// ============================================

function apiRequest(endpoint, method = 'GET', body = null, timeoutMs = TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${SITE_URL}${endpoint}`)
        const isHttps = url.protocol === 'https:'
        const transport = isHttps ? https : http

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': ADMIN_TOKEN,
            },
        }

        const req = transport.request(options, (res) => {
            let data = ''
            res.on('data', chunk => { data += chunk })
            res.on('end', () => {
                try {
                    if (res.statusCode >= 400) {
                        reject(new Error(`API ${method} ${endpoint} failed (${res.statusCode}): ${data.substring(0, 300)}`))
                        return
                    }
                    if (!data || data.trim() === '') {
                        resolve({})
                        return
                    }
                    resolve(JSON.parse(data))
                } catch (e) {
                    reject(new Error(`API parse error: ${e.message}`))
                }
            })
        })

        req.on('error', (e) => {
            reject(new Error(`API network error ${endpoint}: ${e.message}`))
        })

        req.setTimeout(timeoutMs, () => {
            req.destroy()
            reject(new Error(`API ${method} ${endpoint} timed out after ${timeoutMs}ms`))
        })

        if (body) {
            req.write(JSON.stringify(body))
        }
        req.end()
    })
}

/**
 * API request with automatic retry
 */
async function apiRequestWithRetry(endpoint, method = 'GET', body = null, timeoutMs = TIMEOUT_MS) {
    let lastError
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await apiRequest(endpoint, method, body, timeoutMs)
        } catch (e) {
            lastError = e
            if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1) // 2s, 4s, 8s
                console.warn(`   ⚠️ API 재시도 (${attempt}/${MAX_RETRIES}): ${e.message} — ${delay}ms 대기`)
                await new Promise(r => setTimeout(r, delay))
            }
        }
    }
    throw lastError
}

// ============================================
// Queue Functions
// ============================================

/**
 * Get all jobs from the queue
 */
async function getQueue() {
    const result = await apiRequestWithRetry('/api/queue/jobs')
    return result.jobs || []
}

/**
 * Add a job to the queue
 * Throws error with code 'DUPLICATE_JOB' if the URL is already queued (409)
 */
async function addJob(job) {
    try {
        // Use single attempt (no retry) — 409 duplicates should not be retried
        await apiRequest('/api/queue/jobs', 'POST', job)
        return true
    } catch (e) {
        if (e.message && e.message.includes('(409)')) {
            const dupError = new Error('이미 대기열에 있는 URL입니다.')
            dupError.code = 'DUPLICATE_JOB'
            throw dupError
        }
        throw e
    }
}

/**
 * Update a job
 */
async function updateJob(jobId, updates) {
    await apiRequestWithRetry('/api/queue/update', 'POST', { jobId, ...updates })
    return true
}

/**
 * Non-blocking update (fire and forget)
 */
function updateJobAsync(jobId, updates) {
    apiRequestWithRetry('/api/queue/update', 'POST', { jobId, ...updates }).catch(e => {
        console.warn(`   ⚠️ 비동기 업데이트 실패 (무시): ${e.message}`)
    })
}

/**
 * Check if a job was cancelled
 */
async function checkJobCancelled(jobId) {
    try {
        const result = await apiRequest('/api/queue/jobs', 'GET', null, 10000)
        const job = (result.jobs || []).find(j => j.id === jobId)
        if (job && (job.status === 'failed' || job.status === 'queued')) {
            return true
        }
    } catch { }
    return false
}

/**
 * Claim next available job
 */
async function claimJob(workerId) {
    const result = await apiRequestWithRetry('/api/queue/claim', 'POST', { workerId })
    return result.job || null
}

// ============================================
// Database Functions
// ============================================

/**
 * Get all streamers
 */
async function getStreamers() {
    const result = await apiRequestWithRetry('/api/db')
    return result.streamers || []
}

/**
 * Get a specific streamer by ID
 */
async function getStreamer(streamerId) {
    try {
        const streamers = await getStreamers()
        return streamers.find(s => s.id === streamerId) || null
    } catch { return null }
}

/**
 * Add a video to the database
 */
async function addVideo(streamerId, videoId, videoData) {
    const result = await apiRequestWithRetry('/api/db/add-video', 'POST', {
        video: { ...videoData, id: videoId },
        streamerId,
    })
    return result.success || false
}

/**
 * Update streamer (via add-video endpoint, which also syncs streamer data)
 */
async function updateStreamer(streamerId, updates) {
    // Note: videoCount is automatically managed by /api/db/add-video endpoint
    // This function is kept for backwards compatibility but is a no-op
    // to avoid 'Invalid data format' errors from /api/db POST
    return true
}

/**
 * Set a document (generic, for backwards compatibility)
 */
async function setDocument(collectionPath, docId, data) {
    console.warn(`   ⚠️ setDocument not supported via API: ${collectionPath}/${docId}`)
    return true
}

module.exports = {
    getQueue, addJob, updateJob, updateJobAsync, claimJob, checkJobCancelled,
    getStreamers, getStreamer, addVideo, updateStreamer, setDocument,
    apiRequest: apiRequestWithRetry,
    SITE_URL, ADMIN_TOKEN,
}
