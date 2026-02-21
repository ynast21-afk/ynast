import { getJsonFile, saveJsonFile } from '@/lib/b2'
import 'server-only'

// ============================================
// B2 Storage — queue stored as queue.json on B2
// (Firestore API disabled → switched to B2)
// ============================================
const QUEUE_FILENAME = 'queue.json'

// In-memory cache to reduce B2 reads
let queueCache: UploadJob[] | null = null
let cacheTime = 0
const CACHE_TTL_MS = 3000 // 3 seconds

// ============================================
// Types (unchanged interface)
// ============================================
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
    videoId?: string | null  // Used for remux jobs to update existing video URL
}

export interface QueueSettings {
    titleSource: 'pageTitle' | 'fileName'
}

// ============================================
// Queue CRUD (B2-backed)
// ============================================

/**
 * Get all jobs from B2 queue.json
 */
export async function getQueue(): Promise<UploadJob[]> {
    try {
        // Use cache if fresh
        if (queueCache && Date.now() - cacheTime < CACHE_TTL_MS) {
            return [...queueCache]
        }

        const data = await getJsonFile(QUEUE_FILENAME)
        const jobs: UploadJob[] = data?.jobs || []

        // Update cache
        queueCache = jobs
        cacheTime = Date.now()

        return jobs.sort((a, b) => a.priority - b.priority)
    } catch (err) {
        console.error('[QueueStore] getQueue error:', err)
        return []
    }
}

/**
 * Save queue to B2 (internal)
 */
async function saveQueueInternal(jobs: UploadJob[]): Promise<boolean> {
    const success = await saveJsonFile(QUEUE_FILENAME, { jobs, updatedAt: new Date().toISOString() })
    if (success) {
        queueCache = jobs
        cacheTime = Date.now()
    }
    return success
}

/**
 * Save the entire queue
 */
export async function saveQueue(jobs: UploadJob[]): Promise<boolean> {
    try {
        return await saveQueueInternal(jobs)
    } catch (err) {
        console.error('[QueueStore] saveQueue error:', err)
        return false
    }
}

/**
 * Add a single job to the queue
 */
export async function addJob(job: UploadJob): Promise<boolean> {
    try {
        const jobs = await getQueue()
        jobs.push(job)
        return await saveQueueInternal(jobs)
    } catch (err) {
        console.error('[QueueStore] addJob error:', err)
        return false
    }
}

/**
 * Update specific fields of a job
 */
export async function updateJob(jobId: string, updates: Partial<UploadJob>): Promise<boolean> {
    try {
        const jobs = await getQueue()
        const idx = jobs.findIndex(j => j.id === jobId)
        if (idx === -1) {
            console.warn(`[QueueStore] Job not found: ${jobId}`)
            return false
        }
        jobs[idx] = { ...jobs[idx], ...updates }
        return await saveQueueInternal(jobs)
    } catch (err) {
        console.error('[QueueStore] updateJob error:', err)
        return false
    }
}

/**
 * Get a single job by ID
 */
export async function getJob(jobId: string): Promise<UploadJob | null> {
    try {
        const jobs = await getQueue()
        return jobs.find(j => j.id === jobId) || null
    } catch (err) {
        console.error('[QueueStore] getJob error:', err)
        return null
    }
}

/**
 * Delete a single job
 */
export async function deleteJob(jobId: string): Promise<boolean> {
    try {
        const jobs = await getQueue()
        const filtered = jobs.filter(j => j.id !== jobId)
        if (filtered.length === jobs.length) {
            return false // Not found
        }
        return await saveQueueInternal(filtered)
    } catch (err) {
        console.error('[QueueStore] deleteJob error:', err)
        return false
    }
}

// ============================================
// Settings CRUD (B2-backed)
// ============================================

const SETTINGS_FILENAME = 'queue-settings.json'
const DEFAULT_SETTINGS: QueueSettings = { titleSource: 'pageTitle' }

export async function getSettings(): Promise<QueueSettings> {
    try {
        const data = await getJsonFile(SETTINGS_FILENAME)
        return data || DEFAULT_SETTINGS
    } catch {
        return DEFAULT_SETTINGS
    }
}

export async function saveSettings(settings: QueueSettings): Promise<boolean> {
    try {
        return await saveJsonFile(SETTINGS_FILENAME, settings)
    } catch (err) {
        console.error('[QueueStore] Save settings error:', err)
        return false
    }
}
