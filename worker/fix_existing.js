// Fix existing videos: use curl for partial download, then ffprobe/ffmpeg
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const crypto = require('crypto')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN
const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_KEY = process.env.B2_APPLICATION_KEY
const B2_BUCKET_ID = process.env.B2_BUCKET_ID
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME

async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${SITE_URL}${endpoint}`
    const opts = { method, headers: { 'Content-Type': 'application/json' } }
    if (ADMIN_TOKEN) opts.headers['x-admin-token'] = ADMIN_TOKEN
    if (body) opts.body = JSON.stringify(body)
    const r = await fetch(url, opts)
    return r.json()
}

async function getB2Auth() {
    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: { 'Authorization': 'Basic ' + Buffer.from(`${B2_KEY_ID}:${B2_KEY}`).toString('base64') }
    })
    return res.json()
}

async function main() {
    const auth = await getB2Auth()
    console.log('B2 OK')

    const db = await apiRequest('/api/db')
    const targets = db.videos.filter(v => v.duration === '0:00' && !v.thumbnailUrl)
    console.log('Fix:', targets.length, 'videos')

    for (const video of targets) {
        console.log(`\n--- ${video.title} ---`)

        const proxyUrl = new URL(video.videoUrl, 'http://localhost')
        const b2FilePath = proxyUrl.searchParams.get('file')
        if (!b2FilePath) { console.log('  SKIP'); continue }

        const directUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${b2FilePath}`

        const tempDir = path.join(__dirname, 'temp')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
        const tempVideo = path.join(tempDir, `fix_${video.id}.mp4`)
        const tempThumb = path.join(tempDir, `fix_${video.id}_thumb.jpg`)

        try {
            // Download using curl (full file - needed for correct duration)
            console.log('  Downloading via curl...')
            execSync(
                `curl -s -o "${tempVideo}" -H "Authorization: ${auth.authorizationToken}" "${directUrl}"`,
                { timeout: 300000 }
            )

            if (!fs.existsSync(tempVideo)) {
                console.log('  Download failed')
                continue
            }
            const size = fs.statSync(tempVideo).size
            console.log(`  Downloaded: ${(size / 1024 / 1024).toFixed(1)}MB`)

            // Duration
            let duration = '0:00'
            try {
                const out = execSync(
                    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempVideo}"`,
                    { encoding: 'utf8', timeout: 30000 }
                ).trim()
                const ts = Math.round(parseFloat(out))
                if (ts > 0) {
                    const h = Math.floor(ts / 3600), m = Math.floor((ts % 3600) / 60), s = ts % 60
                    duration = h > 0
                        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                        : `${m}:${String(s).padStart(2, '0')}`
                }
                console.log(`  Duration: ${duration}`)
            } catch (e) { console.warn('  ffprobe:', e.message?.substring(0, 100)) }

            // Thumbnail
            let thumbnailUrl = null
            try {
                execSync(
                    `ffmpeg -y -i "${tempVideo}" -ss 3 -vframes 1 -q:v 2 -vf "scale=640:-1" "${tempThumb}"`,
                    { timeout: 30000, stdio: 'pipe' }
                )
                if (fs.existsSync(tempThumb) && fs.statSync(tempThumb).size > 100) {
                    console.log(`  Thumb OK: ${fs.statSync(tempThumb).size}B`)

                    // Upload thumb to B2
                    const upUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
                        method: 'POST',
                        headers: { 'Authorization': auth.authorizationToken },
                        body: JSON.stringify({ bucketId: B2_BUCKET_ID })
                    })
                    const upUrl = await upUrlRes.json()
                    const thumbData = fs.readFileSync(tempThumb)
                    const sha1 = crypto.createHash('sha1').update(thumbData).digest('hex')
                    const b2Name = `thumbnails/${Date.now()}_${video.id}.jpg`

                    const uploadRes = await fetch(upUrl.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': upUrl.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(b2Name),
                            'Content-Type': 'image/jpeg',
                            'Content-Length': String(thumbData.length),
                            'X-Bz-Content-Sha1': sha1,
                        },
                        body: thumbData,
                    })
                    if (uploadRes.ok) {
                        thumbnailUrl = `/api/b2-proxy?file=${encodeURIComponent(b2Name)}`
                        console.log(`  Uploaded: ${b2Name}`)
                    }
                }
            } catch (e) { console.warn('  Thumb:', e.message?.substring(0, 100)) }
            finally { if (fs.existsSync(tempThumb)) fs.unlinkSync(tempThumb) }

            // Update
            const idx = db.videos.findIndex(v => v.id === video.id)
            if (idx >= 0) {
                if (duration !== '0:00') db.videos[idx].duration = duration
                if (thumbnailUrl) db.videos[idx].thumbnailUrl = thumbnailUrl
                db.videos[idx].createdAt = new Date().toISOString()
                console.log(`  DB updated [${idx}]`)
            }
        } catch (e) {
            console.error(`  Error: ${e.message?.substring(0, 200)}`)
        } finally {
            if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo)
        }
    }

    console.log('\nSaving...')
    const res = await apiRequest('/api/db', 'POST', db)
    console.log('Save:', JSON.stringify(res))
}

main().catch(e => console.error('Fatal:', e))
