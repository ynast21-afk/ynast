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
        // Fallback chain: mediaUrls → base64Images → thumbnailUrl → videoUrl (server-side)
        let mediaIds: string[] = []
        if (mediaType === 'video' && videoClipUrl) {
            // Video clip mode: upload single MP4 video
            const videoMediaId = await uploadVideoFromUrl(videoClipUrl, creds)
            if (videoMediaId) {
                mediaIds = [videoMediaId]
                console.log(`[Twitter] Uploaded video clip, mediaId: ${videoMediaId}`)
            }
        } else if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
            // Image mode: upload up to 4 images from URLs (previewUrls from B2)
            const urlsToUpload = mediaUrls.slice(0, 4)
            mediaIds = await uploadMediaFromUrls(urlsToUpload, creds)
            console.log(`[Twitter] Uploaded ${mediaIds.length} media from previewUrls`)
        } else if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
            // Base64 image mode: upload images directly from base64 data
            mediaIds = await uploadMediaFromBase64(base64Images.slice(0, 4), creds)
            console.log(`[Twitter] Uploaded ${mediaIds.length} base64 media`)
        }

        // 🔄 Server-side fallback: if no media uploaded yet, try thumbnailUrl or videoUrl
        if (mediaIds.length === 0) {
            console.log('[Twitter] No media from primary sources, trying server-side fallbacks...')

            // Fallback 1: thumbnailUrl (single image, fast)
            if (thumbnailUrl && typeof thumbnailUrl === 'string') {
                try {
                    console.log(`[Twitter] Fallback: using thumbnailUrl`)
                    const thumbIds = await uploadMediaFromUrls([thumbnailUrl], creds)
                    if (thumbIds.length > 0) {
                        mediaIds = thumbIds
                        console.log(`[Twitter] ✅ Fallback thumbnailUrl succeeded`)
                    }
                } catch (err: any) {
                    console.warn(`[Twitter] Fallback thumbnailUrl failed:`, err?.message)
                }
            }

            // Fallback 2: extract frame from videoUrl on server (B2 download + ffmpeg)
            if (mediaIds.length === 0 && videoUrl && typeof videoUrl === 'string') {
                try {
                    console.log(`[Twitter] Fallback: extracting frame from videoUrl server-side`)
                    const frameMediaId = await extractAndUploadFrameFromVideo(videoUrl, creds)
                    if (frameMediaId) {
                        mediaIds = [frameMediaId]
                        console.log(`[Twitter] ✅ Fallback server-side frame extraction succeeded`)
                    }
                } catch (err: any) {
                    console.warn(`[Twitter] Fallback server-side frame extraction failed:`, err?.message)
                }
            }

            if (mediaIds.length === 0) {
                console.warn('[Twitter] ⚠️ All media fallbacks exhausted, posting text-only tweet')
            }
        }

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
