import { B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_ID } from '@/utils/env'

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
    // Fallback logic (similar to existing route.ts)
    // For simplicity in this helper, we rely on the auth response or env var context if needed
    // But for the DB file, we need the bucket name to construct the URL for download/upload
    return process.env.B2_BUCKET_NAME || 'yna-backup'
}

const DB_FILENAME = 'database.json'

export async function getDatabase(): Promise<any> {
    try {
        const auth = await authorizeB2()
        const bucketName = await resolveBucketName(auth)

        // Try to download existing DB
        const downloadUrl = `${auth.downloadUrl}/file/${bucketName}/${DB_FILENAME}`
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

export async function saveDatabase(data: any): Promise<boolean> {
    try {
        const auth = await authorizeB2()
        const bucketName = await resolveBucketName(auth)

        // 1. Get Upload URL
        const uploadUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: 'POST',
            headers: { 'Authorization': auth.authorizationToken },
            body: JSON.stringify({ bucketId: process.env.B2_BUCKET_ID || auth.allowed.bucketId })
        })

        if (!uploadUrlRes.ok) throw new Error('Failed to get upload URL')
        const { uploadUrl, authorizationToken } = await uploadUrlRes.json()

        // 2. Upload File
        const jsonString = JSON.stringify(data)
        const sha1 = require('crypto').createHash('sha1').update(jsonString).digest('hex')

        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': authorizationToken,
                'X-Bz-File-Name': DB_FILENAME,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonString).toString(),
                'X-Bz-Content-Sha1': sha1,
                'X-Bz-Info-Author': 'kstreamer-admin'
            },
            body: jsonString
        })

        return uploadRes.ok
    } catch (e) {
        console.error('saveDatabase error:', e)
        return false
    }
}
