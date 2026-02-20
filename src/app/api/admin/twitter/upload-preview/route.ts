import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getDatabase, saveDatabase } from '@/lib/b2'

// B2 auth helper (reuse pattern from b2.ts)
async function authorizeB2() {
    const keyId = process.env.B2_APPLICATION_KEY_ID
    const appKey = process.env.B2_APPLICATION_KEY
    if (!keyId || !appKey) throw new Error('B2 credentials not configured')

    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: {
            Authorization: `Basic ${Buffer.from(`${keyId}:${appKey}`).toString('base64')}`
        }
    })
    if (!res.ok) throw new Error('B2 auth failed')
    return res.json()
}

async function getUploadUrl(auth: any, bucketId: string) {
    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: { Authorization: auth.authorizationToken },
        body: JSON.stringify({ bucketId })
    })
    if (!res.ok) throw new Error('Failed to get upload URL')
    return res.json()
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const videoId = formData.get('videoId') as string | null
        const fileType = formData.get('fileType') as string || 'image/gif' // gif or png

        if (!file || !videoId) {
            return NextResponse.json({ success: false, error: 'file and videoId required' }, { status: 400 })
        }

        // Determine if this is a video or image upload
        const isVideo = fileType === 'video/mp4' || fileType.startsWith('video/')
        const maxSize = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024 // 15MB for video, 5MB for image

        // Validate file size
        if (file.size > maxSize) {
            return NextResponse.json({ success: false, error: `File too large (max ${isVideo ? '15MB' : '5MB'})` }, { status: 400 })
        }

        const auth = await authorizeB2()
        const bucketId = process.env.B2_BUCKET_ID || auth.allowed?.bucketId
        if (!bucketId) throw new Error('No bucket ID')

        const upload = await getUploadUrl(auth, bucketId)
        const arrayBuffer = await file.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)
        const sha1 = crypto.createHash('sha1').update(uint8).digest('hex')

        const ext = isVideo ? 'mp4' : (fileType === 'image/gif' ? 'gif' : 'png')
        const folder = isVideo ? 'preview_clips' : 'preview_gif'
        const fileName = `${folder}/${videoId}.${ext}`

        const uploadRes = await fetch(upload.uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': upload.authorizationToken,
                'X-Bz-File-Name': fileName,
                'Content-Type': fileType,
                'Content-Length': uint8.length.toString(),
                'X-Bz-Content-Sha1': sha1,
            },
            body: uint8
        })

        if (!uploadRes.ok) {
            const errText = await uploadRes.text()
            return NextResponse.json({ success: false, error: errText }, { status: 500 })
        }

        const uploadData = await uploadRes.json()
        const bucketName = process.env.B2_BUCKET_NAME || 'unknown'
        const previewUrl = `${auth.downloadUrl}/file/${bucketName}/${fileName}`

        // Update video record with preview URL (non-blocking, best-effort)
        try {
            const db = await getDatabase()
            if (db && db.videos) {
                const videoIndex = db.videos.findIndex((v: any) => v.id === videoId)
                if (videoIndex !== -1) {
                    if (isVideo) {
                        db.videos[videoIndex].previewClipUrl = previewUrl
                    } else {
                        db.videos[videoIndex].previewGifUrl = previewUrl
                    }
                    await saveDatabase(db)
                }
            }
        } catch (dbErr) {
            console.warn('Failed to save preview URL to DB (non-critical):', dbErr)
        }

        return NextResponse.json({
            success: true,
            previewUrl,
            fileId: uploadData.fileId,
            fileName
        })
    } catch (err: any) {
        console.error('Preview upload error:', err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
