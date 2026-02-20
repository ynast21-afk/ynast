import fs from 'fs'
import path from 'path'
import 'server-only'

// Vercel serverless: process.cwd() is read-only (/var/task), use /tmp instead
// Local dev: use project's data/ directory
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data')
const QUEUE_FILE = path.join(DATA_DIR, 'upload-queue.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'queue-settings.json')

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
    }
}

export interface UploadJob {
    id: string
    sourceUrl: string
    status: 'queued' | 'processing' | 'done' | 'failed'
    title: string
    titleSource: string
    streamerId: string | null
    streamerName: string | null
    pageNumber: number | null
    itemOrder: number | null
    priority: number
    b2Url: string | null
    b2ThumbnailUrl: string | null
    error: string | null
    progress: number
    workerId: string | null
    lockedAt: string | null
    createdAt: string
    updatedAt: string
    retryCount: number
}

export interface QueueSettings {
    titleSource: 'pageTitle' | 'fileName'
}

// ============================================
// Queue CRUD
// ============================================

export function getQueue(): UploadJob[] {
    ensureDataDir()
    try {
        if (!fs.existsSync(QUEUE_FILE)) return []
        const raw = fs.readFileSync(QUEUE_FILE, 'utf-8')
        const data = JSON.parse(raw)
        return Array.isArray(data) ? data : []
    } catch {
        return []
    }
}

export function saveQueue(jobs: UploadJob[]): boolean {
    ensureDataDir()
    try {
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(jobs, null, 2), 'utf-8')
        return true
    } catch (err) {
        console.error('[QueueStore] Save error:', err)
        return false
    }
}

// ============================================
// Settings CRUD
// ============================================

const DEFAULT_SETTINGS: QueueSettings = { titleSource: 'pageTitle' }

export function getSettings(): QueueSettings {
    ensureDataDir()
    try {
        if (!fs.existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
        return JSON.parse(raw)
    } catch {
        return DEFAULT_SETTINGS
    }
}

export function saveSettings(settings: QueueSettings): boolean {
    ensureDataDir()
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
        return true
    } catch (err) {
        console.error('[QueueStore] Save settings error:', err)
        return false
    }
}
