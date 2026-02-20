import { db } from '@/lib/firebase'
import {
    collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    writeBatch, Timestamp
} from 'firebase/firestore'
import 'server-only'

// ============================================
// Firestore collection references
// ============================================
const QUEUE_COLLECTION = 'upload-queue'
const SETTINGS_DOC = 'settings/queue'

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
}

export interface QueueSettings {
    titleSource: 'pageTitle' | 'fileName'
}

// ============================================
// Helper: convert Firestore doc to UploadJob
// ============================================
function docToJob(docData: any, docId: string): UploadJob {
    return {
        id: docId,
        sourceUrl: docData.sourceUrl || '',
        status: docData.status || 'queued',
        title: docData.title || '',
        titleSource: docData.titleSource || 'pageTitle',
        streamerId: docData.streamerId || null,
        streamerName: docData.streamerName || null,
        pageNumber: docData.pageNumber ?? null,
        itemOrder: docData.itemOrder ?? null,
        priority: docData.priority ?? 0,
        b2Url: docData.b2Url || null,
        b2ThumbnailUrl: docData.b2ThumbnailUrl || null,
        error: docData.error || null,
        progress: docData.progress ?? 0,
        workerId: docData.workerId || null,
        lockedAt: docData.lockedAt || null,
        createdAt: docData.createdAt || new Date().toISOString(),
        updatedAt: docData.updatedAt || new Date().toISOString(),
        retryCount: docData.retryCount ?? 0,
    }
}

// ============================================
// Queue CRUD (async — Firestore)
// ============================================

/**
 * Get all jobs from Firestore upload-queue collection
 */
export async function getQueue(): Promise<UploadJob[]> {
    try {
        // Simple collection read — no orderBy to avoid needing a composite index
        const snapshot = await getDocs(collection(db, QUEUE_COLLECTION))
        const jobs = snapshot.docs.map(d => docToJob(d.data(), d.id))
        // Sort client-side by priority ascending
        return jobs.sort((a, b) => a.priority - b.priority)
    } catch (err) {
        console.error('[QueueStore] getQueue error:', err)
        return []
    }
}

/**
 * Save the entire queue (batch write — replaces all docs).
 * Used when bulk updating (claim stale unlock, etc.)
 */
export async function saveQueue(jobs: UploadJob[]): Promise<boolean> {
    try {
        const batch = writeBatch(db)

        // Delete all existing docs first
        const snapshot = await getDocs(collection(db, QUEUE_COLLECTION))
        snapshot.docs.forEach(d => batch.delete(d.ref))

        // Write all jobs
        for (const job of jobs) {
            const ref = doc(db, QUEUE_COLLECTION, job.id)
            const { id, ...data } = job
            batch.set(ref, data)
        }

        await batch.commit()
        return true
    } catch (err) {
        console.error('[QueueStore] saveQueue error:', err)
        return false
    }
}

/**
 * Add a single job to the queue (more efficient than saveQueue for single adds)
 */
export async function addJob(job: UploadJob): Promise<boolean> {
    try {
        const ref = doc(db, QUEUE_COLLECTION, job.id)
        const { id, ...data } = job
        await setDoc(ref, data)
        return true
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
        const ref = doc(db, QUEUE_COLLECTION, jobId)
        await updateDoc(ref, { ...updates })
        return true
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
        const ref = doc(db, QUEUE_COLLECTION, jobId)
        const snap = await getDoc(ref)
        if (!snap.exists()) return null
        return docToJob(snap.data(), snap.id)
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
        const ref = doc(db, QUEUE_COLLECTION, jobId)
        await deleteDoc(ref)
        return true
    } catch (err) {
        console.error('[QueueStore] deleteJob error:', err)
        return false
    }
}

// ============================================
// Settings CRUD (async — Firestore)
// ============================================

const DEFAULT_SETTINGS: QueueSettings = { titleSource: 'pageTitle' }

export async function getSettings(): Promise<QueueSettings> {
    try {
        const ref = doc(db, SETTINGS_DOC)
        const snap = await getDoc(ref)
        if (!snap.exists()) return DEFAULT_SETTINGS
        return snap.data() as QueueSettings
    } catch {
        return DEFAULT_SETTINGS
    }
}

export async function saveSettings(settings: QueueSettings): Promise<boolean> {
    try {
        const ref = doc(db, SETTINGS_DOC)
        await setDoc(ref, settings)
        return true
    } catch (err) {
        console.error('[QueueStore] Save settings error:', err)
        return false
    }
}
