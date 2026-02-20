import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'
import { authorizeB2 } from '@/lib/b2'
import { TwitterApi } from 'twitter-api-v2'

// NOTE: ffmpeg imports are now DYNAMIC (inside trimVideoForTwitter)
// to prevent Vercel serverless crashes when ffmpeg-static binary isn't available.

const TWEET_HISTORY_FILE = 'data/tweet-history.json'
const TWITTER_VIDEO_CLIP_SECONDS = 20

interface TweetHistoryItem {
    id: string
    videoId: string
    videoTitle: string
    streamerName: string
    tweetText: string
    tweetId?: string
    postedAt: string
    status: 'success' | 'error'
    errorMessage?: string
}

// GET: Retrieve tweet history
export async function GET() {
    try {
        const history = await getJsonFile(TWEET_HISTORY_FILE) || []
        return NextResponse.json({ history })
    } catch (error) {
        console.error('GET /api/admin/twitter/post error:', error)
        return NextResponse.json({ history: [] })
    }
}

// POST: Post tweet to X (Twitter)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { tweetText, videoId, videoTitle, streamerName, mediaUrls, mediaType, videoClipUrl, base64Images, videoUrl, thumbnailUrl } = body

        if (!tweetText) {
            return NextResponse.json({ error: 'Missing tweet text' }, { status: 400 })
        }

        // Check Twitter API credentials
        const apiKey = process.env.TWITTER_API_KEY
        const apiSecret = process.env.TWITTER_API_SECRET
        const accessToken = process.env.TWITTER_ACCESS_TOKEN
        const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

        if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
            const missing = []
            if (!apiKey) missing.push('TWITTER_API_KEY')
            if (!apiSecret) missing.push('TWITTER_API_SECRET')
            if (!accessToken) missing.push('TWITTER_ACCESS_TOKEN')
            if (!accessTokenSecret) missing.push('TWITTER_ACCESS_TOKEN_SECRET')
            return NextResponse.json({
                error: `Twitter API 자격증명 미설정: ${missing.join(', ')}. Vercel 환경 변수를 확인하세요.`,
                missingCredentials: true
            }, { status: 400 })
        }

        const creds = { apiKey, apiSecret, accessToken, accessTokenSecret }

        // Upload media (images or video clip)
        // Fallback chain: mediaUrls → base64Images → thumbnailUrl → videoUrl → branded image
        let mediaIds: string[] = []

        console.log(`[Twitter] 📋 Media resolution starting...`)
        console.log(`[Twitter]   mediaType=${mediaType}, videoClipUrl=${!!videoClipUrl}`)
        console.log(`[Twitter]   mediaUrls=${JSON.stringify(mediaUrls?.length || 0)} items`)
        console.log(`[Twitter]   base64Images=${base64Images?.length || 0} items`)
        console.log(`[Twitter]   thumbnailUrl=${!!thumbnailUrl} (${thumbnailUrl ? thumbnailUrl.substring(0, 80) + '...' : 'none'})`)
        console.log(`[Twitter]   videoUrl=${!!videoUrl} (${videoUrl ? videoUrl.substring(0, 80) + '...' : 'none'})`)

        if (mediaType === 'video' && videoClipUrl) {
            // Video clip mode: upload single MP4 video
            console.log(`[Twitter] 🎬 Step 1: Video clip mode`)
            const videoMediaId = await uploadVideoFromUrl(videoClipUrl, creds)
            if (videoMediaId) {
                mediaIds = [videoMediaId]
                console.log(`[Twitter] ✅ Video clip uploaded, mediaId: ${videoMediaId}`)
            }
        } else if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
            // Image mode: upload up to 4 images from URLs (previewUrls from B2)
            console.log(`[Twitter] 🖼️ Step 1: Uploading ${mediaUrls.length} previewUrl images`)
            const urlsToUpload = mediaUrls.slice(0, 4)
            mediaIds = await uploadMediaFromUrls(urlsToUpload, creds)
            console.log(`[Twitter] ✅ Uploaded ${mediaIds.length} media from previewUrls`)
        } else if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
            // Base64 image mode: upload images directly from base64 data
            console.log(`[Twitter] 🖼️ Step 1: Uploading ${base64Images.length} base64 images`)
            mediaIds = await uploadMediaFromBase64(base64Images.slice(0, 4), creds)
            console.log(`[Twitter] ✅ Uploaded ${mediaIds.length} base64 media`)
        } else {
            console.log(`[Twitter] ⚠️ Step 1: No primary media sources available`)
        }

        // 🔄 Server-side fallback chain (runs if no media uploaded yet)
        if (mediaIds.length === 0) {
            console.log('[Twitter] 🔄 Entering server-side fallback chain...')

            // Extract B2 base filename from videoUrl for constructing preview/thumbnail URLs
            const b2BaseName = extractB2BaseName(videoUrl)
            console.log(`[Twitter]   b2BaseName=${b2BaseName || 'none'}`)

            // Fallback 1: Auto-construct B2 preview URLs from videoUrl filename (3 images!)
            if (b2BaseName) {
                try {
                    console.log(`[Twitter] 🔄 Fallback 1: auto-construct B2 preview URLs`)
                    const b2BucketUrl = getB2BucketUrl(videoUrl)
                    const previewCandidates = [0, 1, 2].map(i =>
                        `${b2BucketUrl}/previews/${b2BaseName}_${i}.jpg`
                    )
                    console.log(`[Twitter]   Trying preview URLs: ${previewCandidates.map(u => u.substring(u.lastIndexOf('/') + 1)).join(', ')}`)
                    const previewIds = await uploadMediaFromUrls(previewCandidates, creds)
                    if (previewIds.length > 0) {
                        mediaIds = previewIds
                        console.log(`[Twitter] ✅ Fallback 1 succeeded: ${previewIds.length} preview images uploaded`)
                    }
                } catch (err: any) {
                    console.warn(`[Twitter] ❌ Fallback 1 failed:`, err?.message)
                }
            } else {
                console.log(`[Twitter] ⏭️ Fallback 1 skipped: cannot extract B2 base name`)
            }

            // Fallback 2: thumbnailUrl (direct from DB)
            if (mediaIds.length === 0 && thumbnailUrl && typeof thumbnailUrl === 'string') {
                try {
                    console.log(`[Twitter] 🔄 Fallback 2: thumbnailUrl from DB`)
                    const thumbIds = await uploadMediaFromUrls([thumbnailUrl], creds)
                    if (thumbIds.length > 0) {
                        mediaIds = thumbIds
                        console.log(`[Twitter] ✅ Fallback 2 succeeded: thumbnailUrl uploaded`)
                    }
                } catch (err: any) {
                    console.warn(`[Twitter] ❌ Fallback 2 failed:`, err?.message)
                }
            } else if (mediaIds.length === 0) {
                console.log(`[Twitter] ⏭️ Fallback 2 skipped: no thumbnailUrl`)
            }

            // Fallback 3: Auto-construct B2 thumbnail URL from videoUrl filename
            if (mediaIds.length === 0 && b2BaseName) {
                try {
                    console.log(`[Twitter] 🔄 Fallback 3: auto-construct B2 thumbnail URL`)
                    const b2BucketUrl = getB2BucketUrl(videoUrl)
                    const thumbUrl = `${b2BucketUrl}/thumbnails/${b2BaseName}.jpg`
                    console.log(`[Twitter]   Trying thumbnail: ${thumbUrl.substring(thumbUrl.lastIndexOf('/') + 1)}`)
                    const thumbIds = await uploadMediaFromUrls([thumbUrl], creds)
                    if (thumbIds.length > 0) {
                        mediaIds = thumbIds
                        console.log(`[Twitter] ✅ Fallback 3 succeeded: auto-constructed thumbnail uploaded`)
                    }
                } catch (err: any) {
                    console.warn(`[Twitter] ❌ Fallback 3 failed:`, err?.message)
                }
            } else if (mediaIds.length === 0) {
                console.log(`[Twitter] ⏭️ Fallback 3 skipped: ${b2BaseName ? 'already have media' : 'no b2BaseName'}`)
            }

            // Fallback 4: Generate branded card image (guaranteed to work on Vercel)
            if (mediaIds.length === 0) {
                try {
                    console.log(`[Twitter] 🔄 Fallback 4: generating branded card image`)
                    const cardMediaId = await generateAndUploadBrandedImage(
                        videoTitle || 'New Video',
                        streamerName || 'kStreamer',
                        creds
                    )
                    if (cardMediaId) {
                        mediaIds = [cardMediaId]
                        console.log(`[Twitter] ✅ Fallback 4 succeeded: branded card uploaded`)
                    }
                } catch (err: any) {
                    console.warn(`[Twitter] ❌ Fallback 4 failed:`, err?.message)
                }
            }

            if (mediaIds.length === 0) {
                console.warn('[Twitter] ⚠️ ALL fallbacks exhausted, posting text-only tweet')
            }
        }

        console.log(`[Twitter] 📋 Final media count: ${mediaIds.length} media IDs`)

        // Post tweet using twitter-api-v2 library
        const tweetResult = await postTweet(tweetText, creds, mediaIds)

        // Save to history
        const historyItem: TweetHistoryItem = {
            id: `tweet_${Date.now()}`,
            videoId: videoId || '',
            videoTitle: videoTitle || '',
            streamerName: streamerName || '',
            tweetText,
            tweetId: tweetResult.tweetId,
            postedAt: new Date().toISOString(),
            status: tweetResult.success ? 'success' : 'error',
            errorMessage: tweetResult.error
        }

        try {
            const history: TweetHistoryItem[] = await getJsonFile(TWEET_HISTORY_FILE) || []
            history.unshift(historyItem)
            const trimmed = history.slice(0, 200)
            await saveJsonFile(TWEET_HISTORY_FILE, trimmed)
        } catch (historyErr) {
            console.error('Failed to save tweet history (non-critical):', historyErr)
        }

        if (!tweetResult.success) {
            return NextResponse.json({
                error: tweetResult.error,
                history: historyItem
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            tweetId: tweetResult.tweetId,
            tweetUrl: `https://x.com/i/web/status/${tweetResult.tweetId}`,
            history: historyItem
        })

    } catch (error: any) {
        console.error('POST /api/admin/twitter/post error:', error)
        return NextResponse.json({
            error: `트윗 게시 실패: ${error?.message || 'Unknown error'}`,
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }, { status: 500 })
    }
}

interface TwitterCredentials {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessTokenSecret: string
}

// Download images from URLs and upload them to Twitter, returning media_ids
async function uploadMediaFromUrls(urls: string[], creds: TwitterCredentials): Promise<string[]> {
    const client = new TwitterApi({
        appKey: creds.apiKey,
        appSecret: creds.apiSecret,
        accessToken: creds.accessToken,
        accessSecret: creds.accessTokenSecret,
    })

    const mediaIds: string[] = []

    // Authorize with B2 for downloading images (B2 URLs require auth)
    let b2AuthToken = ''
    try {
        const b2Auth = await authorizeB2()
        b2AuthToken = b2Auth.authorizationToken
    } catch (err: any) {
        console.error('B2 auth failed for media download:', err?.message)
    }

    for (const url of urls) {
        try {
            // Add B2 auth token if this is a B2 URL
            const isB2Url = url.includes('backblazeb2.com')
            const headers: Record<string, string> = {}
            if (isB2Url && b2AuthToken) {
                headers['Authorization'] = b2AuthToken
            }

            console.log(`[Twitter] Downloading image: ${url.substring(0, 80)}...`)
            const response = await fetch(url, { headers })
            if (!response.ok) {
                console.error(`Failed to download image: ${url} (${response.status} ${response.statusText})`)
                continue
            }

            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            console.log(`[Twitter] Downloaded image: ${buffer.length} bytes`)

            // Determine MIME type from response or URL
            const contentType = response.headers.get('content-type') || 'image/jpeg'

            // Upload to Twitter using v1.1 media upload
            const mediaId = await client.v1.uploadMedia(buffer, {
                mimeType: contentType as any,
            })
            console.log(`[Twitter] Uploaded media, mediaId: ${mediaId}`)

            mediaIds.push(mediaId)
        } catch (err: any) {
            console.error(`[Twitter] Failed to upload media from ${url}:`, err?.message || err)
            // Continue with other images even if one fails
        }
    }

    return mediaIds
}

// Upload images from base64 data directly to Twitter
async function uploadMediaFromBase64(base64Images: string[], creds: TwitterCredentials): Promise<string[]> {
    const client = new TwitterApi({
        appKey: creds.apiKey,
        appSecret: creds.apiSecret,
        accessToken: creds.accessToken,
        accessSecret: creds.accessTokenSecret,
    })

    const mediaIds: string[] = []

    for (const base64Data of base64Images) {
        try {
            // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
            const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data
            const buffer = Buffer.from(base64Clean, 'base64')

            console.log(`[Twitter] Uploading base64 image: ${buffer.length} bytes`)

            const mediaId = await client.v1.uploadMedia(buffer, {
                mimeType: 'image/jpeg' as any,
            })
            console.log(`[Twitter] Uploaded base64 media, mediaId: ${mediaId}`)

            mediaIds.push(mediaId)
        } catch (err: any) {
            console.error(`[Twitter] Failed to upload base64 media:`, err?.message || err)
        }
    }

    return mediaIds
}

// Trim video to specified duration using ffmpeg (dynamically imported)
async function trimVideoForTwitter(inputBuffer: Buffer, durationSeconds: number = TWITTER_VIDEO_CLIP_SECONDS): Promise<Buffer> {
    // Dynamic import to avoid crashing the module on Vercel
    const { writeFile, readFile, unlink } = await import('fs/promises')
    const { tmpdir } = await import('os')
    const { join } = await import('path')

    let Ffmpeg: any
    let ffmpegPath: string | null = null
    try {
        const ffmpegMod = await import('fluent-ffmpeg')
        Ffmpeg = ffmpegMod.default || ffmpegMod
        const ffmpegStaticMod = await import('ffmpeg-static')
        ffmpegPath = (ffmpegStaticMod.default || ffmpegStaticMod) as string
        if (ffmpegPath) {
            Ffmpeg.setFfmpegPath(ffmpegPath)
        }
    } catch (importErr) {
        console.error('[ffmpeg] Dynamic import failed:', importErr)
        throw new Error('ffmpeg not available in this environment')
    }

    const tempDir = tmpdir()
    const timestamp = Date.now()
    const inputPath = join(tempDir, `tw_input_${timestamp}.mp4`)
    const outputPath = join(tempDir, `tw_output_${timestamp}.mp4`)

    try {
        await writeFile(inputPath, new Uint8Array(inputBuffer))
        console.log(`[ffmpeg] Wrote temp input: ${inputPath} (${inputBuffer.length} bytes)`)

        await new Promise<void>((resolve, reject) => {
            Ffmpeg(inputPath)
                .setDuration(durationSeconds)
                .outputOptions([
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-preset', 'fast',
                    '-movflags', '+faststart',
                    '-y'
                ])
                .output(outputPath)
                .on('end', () => {
                    console.log(`[ffmpeg] Trimmed to ${durationSeconds}s successfully`)
                    resolve()
                })
                .on('error', (err: any) => {
                    console.error('[ffmpeg] Trimming error:', err)
                    reject(err)
                })
                .run()
        })

        const outputBuffer = await readFile(outputPath)
        console.log(`[ffmpeg] Trimmed video: ${outputBuffer.length} bytes (from ${inputBuffer.length} bytes)`)
        return outputBuffer
    } finally {
        await unlink(inputPath).catch(() => { })
        await unlink(outputPath).catch(() => { })
    }
}

// Download a video from URL, auto-trim to 20s, and upload to Twitter as video media
async function uploadVideoFromUrl(url: string, creds: TwitterCredentials): Promise<string | null> {
    const client = new TwitterApi({
        appKey: creds.apiKey,
        appSecret: creds.apiSecret,
        accessToken: creds.accessToken,
        accessSecret: creds.accessTokenSecret,
    })

    // Authorize with B2 for downloading (B2 URLs require auth)
    let b2AuthToken = ''
    try {
        const b2Auth = await authorizeB2()
        b2AuthToken = b2Auth.authorizationToken
    } catch (err: any) {
        console.error('B2 auth failed for video download:', err?.message)
    }

    try {
        const isB2Url = url.includes('backblazeb2.com')
        const headers: Record<string, string> = {}
        if (isB2Url && b2AuthToken) {
            headers['Authorization'] = b2AuthToken
        }

        const response = await fetch(url, { headers })
        if (!response.ok) {
            console.error(`Failed to download video: ${url} (${response.status})`)
            return null
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        console.log(`Downloaded video: ${url} (${buffer.length} bytes)`)

        // Auto-trim video to 20 seconds for Twitter
        let uploadBuffer = buffer
        try {
            console.log(`Trimming video to ${TWITTER_VIDEO_CLIP_SECONDS}s for Twitter...`)
            uploadBuffer = await trimVideoForTwitter(buffer)
        } catch (trimErr: any) {
            console.error(`Video trimming failed, attempting upload with original:`, trimErr?.message)
            // Fall back to original buffer
        }

        // Upload video to Twitter using chunked upload (v1.1)
        const mediaId = await client.v1.uploadMedia(uploadBuffer, {
            mimeType: 'video/mp4' as any,
            additionalOwners: [],
        })
        console.log(`Uploaded video to Twitter, mediaId: ${mediaId}`)
        return mediaId
    } catch (err: any) {
        console.error(`Failed to upload video from ${url}:`, err?.message || err)
        return null
    }
}

// Server-side: Download video from B2, extract a single frame with ffmpeg, upload to Twitter
async function extractAndUploadFrameFromVideo(url: string, creds: TwitterCredentials): Promise<string | null> {
    try {
        // Authorize B2 for downloading
        let headers: Record<string, string> = {}
        const isB2Url = url.includes('backblazeb2.com')
        if (isB2Url) {
            try {
                const b2Auth = await authorizeB2()
                headers['Authorization'] = b2Auth.authorizationToken
            } catch (err: any) {
                console.warn('[Twitter] B2 auth failed for video frame extraction:', err?.message)
            }
        }

        // Download only first ~8MB of video (enough for a frame at 5s)
        headers['Range'] = 'bytes=0-8388607'
        console.log(`[Twitter] Downloading partial video for frame extraction...`)
        const response = await fetch(url, { headers })

        if (!response.ok && response.status !== 206) {
            console.error(`[Twitter] Video download failed: ${response.status} ${response.statusText}`)
            return null
        }

        const arrayBuffer = await response.arrayBuffer()
        const videoBuffer = Buffer.from(arrayBuffer)
        console.log(`[Twitter] Downloaded ${videoBuffer.length} bytes for frame extraction`)

        // Try dynamic ffmpeg import for frame extraction
        let ffmpegPath: string | null = null
        try {
            const ffmpegStatic = await import('ffmpeg-static')
            ffmpegPath = (ffmpegStatic as any).default || ffmpegStatic
        } catch {
            console.warn('[Twitter] ffmpeg-static not available, trying system ffmpeg')
            ffmpegPath = 'ffmpeg'
        }

        if (!ffmpegPath) {
            console.warn('[Twitter] No ffmpeg available for server-side frame extraction')
            return null
        }

        // Write video chunk to temp file, extract frame, clean up
        const os = await import('os')
        const path = await import('path')
        const fs = await import('fs')
        const { execSync } = await import('child_process')

        const tmpDir = os.tmpdir()
        const tmpVideo = path.join(tmpDir, `tw_vid_${Date.now()}.mp4`)
        const tmpFrame = path.join(tmpDir, `tw_frame_${Date.now()}.jpg`)

        try {
            fs.writeFileSync(tmpVideo, new Uint8Array(videoBuffer))

            // Extract frame at 2 seconds (safe for short clips too)
            execSync(
                `"${ffmpegPath}" -y -i "${tmpVideo}" -ss 2 -vframes 1 -q:v 2 -vf "scale=1280:-1" "${tmpFrame}"`,
                { encoding: 'utf8', timeout: 30000, stdio: 'pipe' }
            )

            if (!fs.existsSync(tmpFrame) || fs.statSync(tmpFrame).size === 0) {
                console.warn('[Twitter] Frame extraction produced no output')
                return null
            }

            const frameBuffer = fs.readFileSync(tmpFrame)
            console.log(`[Twitter] Extracted frame: ${frameBuffer.length} bytes`)

            // Upload frame to Twitter
            const client = new TwitterApi({
                appKey: creds.apiKey,
                appSecret: creds.apiSecret,
                accessToken: creds.accessToken,
                accessSecret: creds.accessTokenSecret,
            })

            const mediaId = await client.v1.uploadMedia(frameBuffer, {
                mimeType: 'image/jpeg' as any,
            })
            console.log(`[Twitter] Uploaded extracted frame, mediaId: ${mediaId}`)
            return mediaId
        } finally {
            // Clean up temp files
            try { if (fs.existsSync(tmpVideo)) fs.unlinkSync(tmpVideo) } catch { }
            try { if (fs.existsSync(tmpFrame)) fs.unlinkSync(tmpFrame) } catch { }
        }
    } catch (err: any) {
        console.error(`[Twitter] extractAndUploadFrameFromVideo failed:`, err?.message || err)
        return null
    }
}

// Extract B2 base filename from a B2 URL (without extension)
// e.g., "https://f005.backblazeb2.com/file/kbjkbj/videos/1234_some_video.mp4" → "1234_some_video"
function extractB2BaseName(videoUrl: string | undefined): string | null {
    if (!videoUrl || typeof videoUrl !== 'string') return null
    try {
        // Handle B2 URLs: https://f005.backblazeb2.com/file/bucket/videos/filename.ext
        // Also handle /api/b2-proxy?file=videos/filename.ext
        let filePath = ''

        if (videoUrl.includes('backblazeb2.com')) {
            const url = new URL(videoUrl)
            // Path is like /file/bucket/videos/filename.ext
            const parts = url.pathname.split('/')
            filePath = parts[parts.length - 1] // filename.ext
        } else if (videoUrl.includes('/api/b2-proxy')) {
            const url = new URL(videoUrl, 'http://dummy')
            const file = url.searchParams.get('file') || ''
            filePath = file.split('/').pop() || '' // filename.ext
        } else {
            // Generic URL: just get the last path segment
            filePath = videoUrl.split('/').pop() || ''
        }

        if (!filePath) return null

        // Remove extension
        const baseName = filePath.replace(/\.[^.]+$/, '')

        // URL decode
        return decodeURIComponent(baseName) || null
    } catch {
        return null
    }
}

// Get B2 bucket base URL from a videoUrl
// e.g., "https://f005.backblazeb2.com/file/kbjkbj/videos/filename.mp4" → "https://f005.backblazeb2.com/file/kbjkbj"
function getB2BucketUrl(videoUrl: string | undefined): string {
    if (!videoUrl || typeof videoUrl !== 'string') return ''
    try {
        if (videoUrl.includes('backblazeb2.com')) {
            const url = new URL(videoUrl)
            // Path: /file/bucket/videos/filename.ext → extract /file/bucket
            const pathParts = url.pathname.split('/')
            // pathParts = ['', 'file', 'bucket', 'videos', 'filename.ext']
            if (pathParts.length >= 3) {
                return `${url.origin}/file/${pathParts[2]}`
            }
        }
    } catch { }
    return ''
}

// Generate a branded card image and upload to Twitter (no ffmpeg/resvg needed, works on Vercel)
async function generateAndUploadBrandedImage(
    title: string,
    streamerName: string,
    creds: TwitterCredentials
): Promise<string | null> {
    try {
        // Create a minimal valid PNG image (100x100 dark branded image)
        // Using raw PNG generation without any external dependencies
        const { createBrandedPNG } = await generateMinimalPNG()
        const imageBuffer = createBrandedPNG()

        console.log(`[Twitter] Generated branded PNG: ${imageBuffer.length} bytes`)

        // Upload to Twitter
        const client = new TwitterApi({
            appKey: creds.apiKey,
            appSecret: creds.apiSecret,
            accessToken: creds.accessToken,
            accessSecret: creds.accessTokenSecret,
        })

        const mediaId = await client.v1.uploadMedia(imageBuffer, {
            mimeType: 'image/png' as any,
        })
        console.log(`[Twitter] Uploaded branded image, mediaId: ${mediaId}`)
        return mediaId
    } catch (err: any) {
        console.error(`[Twitter] generateAndUploadBrandedImage failed:`, err?.message || err)
        return null
    }
}

// Generate a minimal valid PNG buffer without any external dependencies
async function generateMinimalPNG() {
    const zlib = await import('zlib')

    function createBrandedPNG(): Buffer {
        const width = 800
        const height = 420

        // Create raw pixel data (RGBA) - dark gradient with green accent
        const pixelData = Buffer.alloc(width * height * 4)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4
                // Dark gradient background
                const gradientFactor = (x / width + y / height) / 2
                const r = Math.floor(10 + gradientFactor * 16)
                const g = Math.floor(10 + gradientFactor * 16)
                const b = Math.floor(15 + gradientFactor * 30)

                // Green accent line at bottom
                if (y >= height - 6) {
                    pixelData[idx] = 0      // R
                    pixelData[idx + 1] = 255 // G
                    pixelData[idx + 2] = 136 // B
                    pixelData[idx + 3] = 255 // A
                } else {
                    pixelData[idx] = r
                    pixelData[idx + 1] = g
                    pixelData[idx + 2] = b
                    pixelData[idx + 3] = 255
                }
            }
        }

        // Add a green glow circle in the center
        const cx = width / 2, cy = height / 2 - 20, radius = 120
        for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(height, Math.ceil(cy + radius)); y++) {
            for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(width, Math.ceil(cx + radius)); x++) {
                const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                if (dist < radius) {
                    const idx = (y * width + x) * 4
                    const intensity = Math.max(0, 1 - dist / radius) * 0.3
                    pixelData[idx + 1] = Math.min(255, pixelData[idx + 1] + Math.floor(255 * intensity)) // Green
                    pixelData[idx + 2] = Math.min(255, pixelData[idx + 2] + Math.floor(136 * intensity)) // Blue
                }
            }
        }

        // Build PNG file
        // PNG filter: prepend 0 (None filter) to each row
        const filteredData = Buffer.alloc(height * (1 + width * 4))
        for (let y = 0; y < height; y++) {
            filteredData[y * (1 + width * 4)] = 0 // None filter
            pixelData.copy(filteredData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
        }

        const compressedData = zlib.deflateSync(filteredData)

        // PNG signature
        const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

        // IHDR chunk
        const ihdrData = Buffer.alloc(13)
        ihdrData.writeUInt32BE(width, 0)
        ihdrData.writeUInt32BE(height, 4)
        ihdrData[8] = 8  // bit depth
        ihdrData[9] = 6  // color type (RGBA)
        ihdrData[10] = 0 // compression
        ihdrData[11] = 0 // filter
        ihdrData[12] = 0 // interlace
        const ihdr = createPNGChunk('IHDR', ihdrData)

        // IDAT chunk
        const idat = createPNGChunk('IDAT', compressedData)

        // IEND chunk
        const iend = createPNGChunk('IEND', Buffer.alloc(0))

        return Buffer.concat([signature, ihdr, idat, iend])
    }

    function createPNGChunk(type: string, data: Buffer): Buffer {
        const length = Buffer.alloc(4)
        length.writeUInt32BE(data.length)

        const typeBuffer = Buffer.from(type, 'ascii')
        const crcInput = Buffer.concat([typeBuffer, data])

        // CRC32 calculation
        let crc = 0xFFFFFFFF
        for (let i = 0; i < crcInput.length; i++) {
            crc = crc ^ crcInput[i]
            for (let j = 0; j < 8; j++) {
                if (crc & 1) {
                    crc = (crc >>> 1) ^ 0xEDB88320
                } else {
                    crc = crc >>> 1
                }
            }
        }
        crc = (crc ^ 0xFFFFFFFF) >>> 0

        const crcBuffer = Buffer.alloc(4)
        crcBuffer.writeUInt32BE(crc)

        return Buffer.concat([length, typeBuffer, data, crcBuffer])
    }

    return { createBrandedPNG }
}

async function postTweet(text: string, creds: TwitterCredentials, mediaIds: string[] = []): Promise<{ success: boolean; tweetId?: string; error?: string }> {
    try {
        const client = new TwitterApi({
            appKey: creds.apiKey,
            appSecret: creds.apiSecret,
            accessToken: creds.accessToken,
            accessSecret: creds.accessTokenSecret,
        })

        const rwClient = client.readWrite

        // Build tweet payload
        const tweetPayload: any = { text }
        if (mediaIds.length > 0) {
            tweetPayload.media = { media_ids: mediaIds }
        }

        const { data } = await rwClient.v2.tweet(tweetPayload)

        return {
            success: true,
            tweetId: data.id
        }
    } catch (error: any) {
        console.error('Twitter post error:', error?.data || error?.message || error)
        const errorMsg = error?.data?.detail
            || error?.data?.title
            || error?.data?.errors?.[0]?.message
            || error?.message
            || 'Unknown Twitter API error'
        return {
            success: false,
            error: `[${error?.code || error?.statusCode || '?'}] ${errorMsg}`
        }
    }
}
