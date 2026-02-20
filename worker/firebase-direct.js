/**
 * Firebase Direct Connection — 워커/폴더감시용 Firestore 직접 연결
 * Vercel API를 거치지 않고 Firestore에 직접 접근합니다.
 */

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } = require('firebase/firestore')

const firebaseConfig = {
    apiKey: "AIzaSyBI4jxHJ8qlLmNNpa_27ROKmGrDwMg-mhk",
    authDomain: "kstreamer-queue.firebaseapp.com",
    projectId: "kstreamer-queue",
    storageBucket: "kstreamer-queue.firebasestorage.app",
    messagingSenderId: "864369693271",
    appId: "1:864369693271:web:68a8f4f225188be83a4912",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const QUEUE_COLLECTION = 'upload-queue'

/**
 * Get all jobs from Firestore
 */
async function getQueue() {
    const snapshot = await getDocs(collection(db, QUEUE_COLLECTION))
    return snapshot.docs.map(d => {
        const data = d.data()
        return {
            id: d.id,
            sourceUrl: data.sourceUrl || '',
            status: data.status || 'queued',
            title: data.title || '',
            titleSource: data.titleSource || 'pageTitle',
            streamerId: data.streamerId || null,
            streamerName: data.streamerName || null,
            pageNumber: data.pageNumber ?? null,
            itemOrder: data.itemOrder ?? null,
            priority: data.priority ?? 0,
            b2Url: data.b2Url || null,
            b2ThumbnailUrl: data.b2ThumbnailUrl || null,
            error: data.error || null,
            progress: data.progress ?? 0,
            workerId: data.workerId || null,
            lockedAt: data.lockedAt || null,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            retryCount: data.retryCount ?? 0,
        }
    }).sort((a, b) => a.priority - b.priority)
}

/**
 * Add a job to the queue
 */
async function addJob(job) {
    const ref = doc(db, QUEUE_COLLECTION, job.id)
    const { id, ...data } = job
    await setDoc(ref, data)
    return true
}

/**
 * Update a job
 */
async function updateJob(jobId, updates) {
    const ref = doc(db, QUEUE_COLLECTION, jobId)
    await updateDoc(ref, { ...updates })
    return true
}

/**
 * Claim next available job (atomic: find queued → mark processing)
 */
async function claimJob(workerId) {
    const STALE_LOCK_MS = 10 * 60 * 1000
    const now = Date.now()
    const isoNow = new Date().toISOString()

    const jobs = await getQueue()

    // Unlock stale jobs
    for (const job of jobs) {
        if (
            job.status === 'processing' &&
            job.lockedAt &&
            now - new Date(job.lockedAt).getTime() > STALE_LOCK_MS
        ) {
            await updateJob(job.id, {
                status: 'queued',
                workerId: null,
                lockedAt: null,
                progress: 0,
                updatedAt: isoNow,
            })
            job.status = 'queued'
        }
    }

    // Find next queued job
    const nextJob = jobs.find(j => j.status === 'queued')
    if (!nextJob) return null

    // Claim it
    const updates = {
        status: 'processing',
        workerId,
        lockedAt: isoNow,
        updatedAt: isoNow,
    }
    await updateJob(nextJob.id, updates)
    return { ...nextJob, ...updates }
}

module.exports = { db, getQueue, addJob, updateJob, claimJob }
