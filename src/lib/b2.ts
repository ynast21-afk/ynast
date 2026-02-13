import crypto from 'crypto'
import 'server-only'

export interface B2AuthResponse {
    accountId: string
    authorizationToken: string
    apiUrl: string
    downloadUrl: string
    allowed: {
        bucketId: string
        bucketName: string
        capabilities: string[]
    }
}

let cachedAuth: B2AuthResponse | null = null
let authTime = 0

export async function authorizeB2(): Promise<B2AuthResponse> {
    // Cache auth for 23 hours (B2 tokens last 24h)
    if (cachedAuth && Date.now() - authTime < 23 * 60 * 60 * 1000) {
        return cachedAuth
    }

    const encoded = Buffer.from(`${process.env.B2_APPLICATION_KEY_ID}:${process.env.B2_APPLICATION_KEY}`).toString('base64')
    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: { 'Authorization': `Basic ${encoded}` },
        cache: 'no-store'
    })

    if (!res.ok) {
        throw new Error(`B2 Auth Failed: ${res.statusText}`)
    }

    const data = await res.json()
    cachedAuth = data
    authTime = Date.now()
    return data
}

export async function resolveBucketName(auth: B2AuthResponse): Promise<string> {
    if (auth.allowed?.bucketName) {
        return auth.allowed.bucketName
    }
    return process.env.B2_BUCKET_NAME || 'yna-backup'
}

const DB_FILENAME = 'database.json'

export async function getDatabase(): Promise<any> {
    try {
        const auth = await authorizeB2()
        const bucketName = await resolveBucketName(auth)

        // Cache-busting with timestamp to prevent CDN/edge caching
        const downloadUrl = `${auth.downloadUrl}/file/${bucketName}/${DB_FILENAME}?t=${Date.now()}`
        const res = await fetch(downloadUrl, {
            headers: { 'Authorization': auth.authorizationToken },
            cache: 'no-store'
        })

        if (res.status === 404) {
            return null // No DB yet
        }

        if (!res.ok) {
            console.error('Failed to fetch DB:', await res.text())
            return null
        }

        return await res.json()
    } catch (e) {
        console.error('getDatabase error:', e)
        return null
    }
}

const BACKUP_DIR = 'backups/'

// Helper: get a fresh upload URL from B2
async function getUploadUrl(auth: B2AuthResponse, bucketId: string) {
    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: { 'Authorization': auth.authorizationToken },
        body: JSON.stringify({ bucketId })
    })
    if (!res.ok) throw new Error('Failed to get upload URL')
    return res.json()
}

/**
 * Save database to B2. 
 * Each upload uses a SEPARATE upload URL to avoid B2 token reuse errors.
 * @param data - The database object to save
 * @param createBackup - Whether to also create a timestamped backup (default: true)
 */
export async function saveDatabase(data: any, createBackup: boolean = true): Promise<boolean> {
    try {
        const auth = await authorizeB2()
        const bucketId = process.env.B2_BUCKET_ID || auth.allowed.bucketId
        const jsonString = JSON.stringify(data)
        const sha1 = crypto.createHash('sha1').update(jsonString).digest('hex')

        // 1. Get fresh upload URL for main file
        const mainUpload = await getUploadUrl(auth, bucketId)

        const resMain = await fetch(mainUpload.uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': mainUpload.authorizationToken,
                'X-Bz-File-Name': DB_FILENAME,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonString).toString(),
                'X-Bz-Content-Sha1': sha1,
            },
            body: jsonString
        })

        if (!resMain.ok) {
            console.error('Main DB upload failed:', await resMain.text())
            return false
        }

        const videoCount = data.videos?.length || 0
        console.log(`✅ Main DB saved (${videoCount} videos)`)

        // 2. Create backup with SEPARATE upload URL (non-blocking)
        if (createBackup) {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                const backupFilename = `${BACKUP_DIR}db_${timestamp}_v${videoCount}.json`

                // Get a NEW upload URL for the backup (crucial: B2 requires one URL per upload)
                const snapUpload = await getUploadUrl(auth, bucketId)

                const resSnap = await fetch(snapUpload.uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': snapUpload.authorizationToken,
                        'X-Bz-File-Name': backupFilename,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(jsonString).toString(),
                        'X-Bz-Content-Sha1': sha1,
                    },
                    body: jsonString
                })

                if (resSnap.ok) {
                    console.log(`📦 Backup created: ${backupFilename}`)
                } else {
                    console.error('Backup upload failed (non-critical):', await resSnap.text())
                }

                // Cleanup old backups in background
                cleanupOldBackups().catch(console.error)
            } catch (backupErr) {
                console.error('Backup creation error (non-critical):', backupErr)
            }
        }

        return true
    } catch (e) {
        console.error('saveDatabase error:', e)
        return false
    }
}

export async function listBackups(): Promise<any[]> {
    try {
        const auth = await authorizeB2()
        const bucketId = process.env.B2_BUCKET_ID || auth.allowed.bucketId

        const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
            method: 'POST',
            headers: { 'Authorization': auth.authorizationToken },
            body: JSON.stringify({
                bucketId,
                prefix: BACKUP_DIR,
                maxFileCount: 100
            })
        })

        if (!res.ok) return []
        const data = await res.json()
        return data.files || []
    } catch (e) {
        console.error('listBackups error:', e)
        return []
    }
}

async function cleanupOldBackups() {
    try {
        const backups = await listBackups()
        if (backups.length <= 30) return // Keep last 30 (reduced from 50)

        // Sort by name (which has timestamp) descending
        const sorted = backups.sort((a, b) => b.fileName.localeCompare(a.fileName))
        const toDelete = sorted.slice(30)

        const auth = await authorizeB2()
        for (const file of toDelete) {
            await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
                method: 'POST',
                headers: { 'Authorization': auth.authorizationToken },
                body: JSON.stringify({
                    fileName: file.fileName,
                    fileId: file.fileId
                })
            })
        }
        console.log(`🧹 Cleaned up ${toDelete.length} old backups.`)
    } catch (e) {
        console.error('cleanupOldBackups error:', e)
    }
}

export async function getJsonFile(filename: string): Promise<any> {
    try {
        const auth = await authorizeB2()
        const bucketName = await resolveBucketName(auth)

        const downloadUrl = `${auth.downloadUrl}/file/${bucketName}/${filename}`
        const res = await fetch(`${downloadUrl}?t=${Date.now()}`, {
            headers: { 'Authorization': auth.authorizationToken },
            cache: 'no-store'
        })

        if (res.status === 404) return null
        if (!res.ok) return null
        return await res.json()
    } catch (e) {
        console.error(`getJsonFile error (${filename}):`, e)
        return null
    }
}

export async function saveJsonFile(filename: string, data: any): Promise<boolean> {
    try {
        const auth = await authorizeB2()
        const bucketId = process.env.B2_BUCKET_ID || auth.allowed.bucketId

        const upload = await getUploadUrl(auth, bucketId)

        const jsonString = JSON.stringify(data)
        const sha1 = crypto.createHash('sha1').update(jsonString).digest('hex')

        const uploadRes = await fetch(upload.uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': upload.authorizationToken,
                'X-Bz-File-Name': filename,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonString).toString(),
                'X-Bz-Content-Sha1': sha1,
            },
            body: jsonString
        })

        return uploadRes.ok
    } catch (e) {
        console.error(`saveJsonFile error (${filename}):`, e)
        return false
    }
}
