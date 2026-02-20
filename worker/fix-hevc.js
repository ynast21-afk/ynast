/**
 * Fix HEVC video: Download from B2, transcode to H.264, re-upload, update DB
 * 
 * Usage: node fix-hevc.js "구미오" (searches by title keyword)
 *    or: node fix-hevc.js --all  (fixes ALL HEVC videos)
 *    or: node fix-hevc.js --scan (scan only, no transcoding)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const crypto = require('crypto')
const https = require('https')
const http = require('http')

require('dotenv').config({ path: path.join(__dirname, '.env') })
require('dotenv').config({ path: path.join(__dirname, '.env.local') })

const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_KEY = process.env.B2_APPLICATION_KEY
const B2_BUCKET_ID = process.env.B2_BUCKET_ID
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME

const { apiRequest, SITE_URL, ADMIN_TOKEN } = require('./firebase-direct')

const TEMP_DIR = path.join(__dirname, 'temp')

async function getB2Auth() {
    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: { 'Authorization': 'Basic ' + Buffer.from(`${B2_KEY_ID}:${B2_KEY}`).toString('base64') }
    })
    if (!res.ok) throw new Error(`B2 auth failed: ${res.status}`)
    return res.json()
}

/**
 * Download a file from a URL using Node.js https/http modules
 * Handles Korean/special characters in URLs properly
 */
function downloadFile(url, destPath, authToken = null) {
    return new Promise((resolve, reject) => {
        // Properly encode the URL for non-ASCII characters
        const urlObj = new URL(url)
        // Re-encode the pathname to handle Korean chars
        urlObj.pathname = urlObj.pathname.split('/').map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/')

        const encodedUrl = urlObj.toString()
        const transport = encodedUrl.startsWith('https') ? https : http

        const options = {
            headers: {}
        }
        if (authToken) {
            options.headers['Authorization'] = authToken
        }

        console.log(`  ⬇ 다운로드: ${decodeURIComponent(urlObj.pathname.split('/').pop())}`)

        const file = fs.createWriteStream(destPath)

        transport.get(encodedUrl, options, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close()
                fs.unlinkSync(destPath)
                downloadFile(response.headers.location, destPath, authToken)
                    .then(resolve)
                    .catch(reject)
                return
            }

            if (response.statusCode !== 200) {
                file.close()
                reject(new Error(`Download failed: HTTP ${response.statusCode}`))
                return
            }

            const totalSize = parseInt(response.headers['content-length'] || '0')
            let downloaded = 0

            response.on('data', (chunk) => {
                downloaded += chunk.length
                if (totalSize > 0 && downloaded % (5 * 1024 * 1024) < chunk.length) {
                    const pct = ((downloaded / totalSize) * 100).toFixed(0)
                    process.stdout.write(`\r  ⬇ ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`)
                }
            })

            response.pipe(file)
            file.on('finish', () => {
                file.close()
                if (totalSize > 0) process.stdout.write('\n')
                resolve(downloaded)
            })
        }).on('error', (err) => {
            file.close()
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
            reject(err)
        })
    })
}

function detectCodec(filePath) {
    try {
        return execSync(
            `ffprobe -v error -analyzeduration 100M -probesize 100M -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
            { encoding: 'utf8', timeout: 30000 }
        ).trim().toLowerCase()
    } catch (e) {
        console.warn(`  ⚠️ 코덱 감지 실패:`, e.message?.substring(0, 100))
        return 'unknown'
    }
}

async function uploadToB2(auth, filePath, b2FileName) {
    const fileData = fs.readFileSync(filePath)
    const fileSize = fileData.length
    const ext = path.extname(b2FileName).toLowerCase()
    const contentType = ext === '.mp4' ? 'video/mp4' : 'application/octet-stream'

    // Get upload URL
    const upUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: { 'Authorization': auth.authorizationToken },
        body: JSON.stringify({ bucketId: B2_BUCKET_ID })
    })
    const upUrl = await upUrlRes.json()

    // Compute SHA1
    const sha1 = crypto.createHash('sha1').update(fileData).digest('hex')

    console.log(`  ⬆ B2 업로드: ${b2FileName} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`)

    const uploadRes = await fetch(upUrl.uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': upUrl.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(b2FileName),
            'Content-Type': contentType,
            'Content-Length': String(fileSize),
            'X-Bz-Content-Sha1': sha1,
        },
        body: fileData,
    })

    if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        throw new Error(`B2 upload failed (${uploadRes.status}): ${errText}`)
    }

    return `/api/b2-proxy?file=${encodeURIComponent(b2FileName)}`
}

async function main() {
    const searchTerm = process.argv[2]
    const scanOnly = searchTerm === '--scan'

    if (!searchTerm) {
        console.log('Usage: node fix-hevc.js "검색어" (제목 키워드)')
        console.log('       node fix-hevc.js --all  (모든 HEVC 영상 수정)')
        console.log('       node fix-hevc.js --scan (HEVC 영상 스캔만)')
        process.exit(1)
    }

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

    const auth = await getB2Auth()
    console.log('✅ B2 인증 완료')

    // Get full database
    const db = await apiRequest('/api/db')
    const allVideos = db.videos || []
    console.log(`📂 전체 영상: ${allVideos.length}개`)

    // Filter by search term
    let targets
    if (searchTerm === '--all' || scanOnly) {
        targets = allVideos
        console.log(`🔍 모든 영상을 HEVC 검사합니다...`)
    } else {
        targets = allVideos.filter(v =>
            (v.title && v.title.includes(searchTerm)) ||
            (v.id && v.id.includes(searchTerm))
        )
        console.log(`🔍 "${searchTerm}" 검색 결과: ${targets.length}개`)
    }

    if (targets.length === 0) {
        console.log('⚠️ 검색 결과가 없습니다.')
        process.exit(0)
    }

    let fixedCount = 0
    let hevcCount = 0

    for (const video of targets) {
        console.log(`\n${'═'.repeat(60)}`)
        console.log(`📹 ${video.title || video.id}`)

        // Get B2 file path from video URL
        if (!video.videoUrl) {
            console.log('  ⏭️ videoUrl 없음')
            continue
        }

        let b2FilePath = ''
        let directUrl = ''
        try {
            if (video.videoUrl.includes('backblazeb2.com')) {
                // Direct B2 URL: https://f005.backblazeb2.com/file/bucket/videos/filename.mp4
                const url = new URL(video.videoUrl)
                const parts = url.pathname.split('/') // ['', 'file', 'bucket', 'videos', 'filename.mp4']
                if (parts.length >= 4) {
                    b2FilePath = decodeURIComponent(parts.slice(3).join('/'))
                    directUrl = video.videoUrl
                }
            } else if (video.videoUrl.includes('/api/b2-proxy')) {
                // Proxy URL: /api/b2-proxy?file=videos/filename.mp4
                const parsed = new URL(video.videoUrl, 'http://dummy')
                b2FilePath = parsed.searchParams.get('file') || ''
                if (b2FilePath) {
                    directUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${b2FilePath}`
                }
            }
        } catch {
            console.log(`  ⏭️ videoUrl 파싱 실패: ${video.videoUrl?.substring(0, 80)}`)
            continue
        }

        if (!b2FilePath) {
            console.log(`  ⏭️ B2 파일 경로 추출 실패: ${video.videoUrl?.substring(0, 80)}`)
            continue
        }

        console.log(`  📁 B2 경로: ${b2FilePath}`)

        const tempVideo = path.join(TEMP_DIR, `hevc_${video.id}.mp4`)
        const transcodedVideo = path.join(TEMP_DIR, `hevc_${video.id}_h264.mp4`)

        try {
            // Download the file using Node.js (handles Korean filenames properly)
            await downloadFile(directUrl, tempVideo, auth.authorizationToken)

            if (!fs.existsSync(tempVideo) || fs.statSync(tempVideo).size < 100) {
                console.log(`  ❌ 다운로드 실패`)
                continue
            }

            const fileSize = (fs.statSync(tempVideo).size / 1024 / 1024).toFixed(1)
            console.log(`  ✅ 다운로드 완료: ${fileSize}MB`)

            // Detect codec from local file
            const codec = detectCodec(tempVideo)
            console.log(`  🎬 코덱: ${codec}`)

            if (codec !== 'hevc' && codec !== 'h265') {
                console.log(`  ✅ H.264 코덱 → OK`)
                continue
            }

            hevcCount++
            console.log(`  ⚠️ HEVC 감지!`)

            if (scanOnly) {
                console.log(`  📋 [SCAN] 트랜스코딩 필요: ${video.title}`)
                continue
            }

            // Transcode HEVC → H.264
            console.log(`  🔄 H.264로 트랜스코딩 중... (오래 걸릴 수 있음)`)
            try {
                execSync(
                    `ffmpeg -y -i "${tempVideo}" -c:v libx264 -crf 23 -preset medium -c:a aac -movflags +faststart "${transcodedVideo}"`,
                    { timeout: 7200000, stdio: 'pipe' } // 2 hour timeout
                )
            } catch (e) {
                console.error(`  ❌ 트랜스코딩 실패:`, e.message?.substring(0, 200))
                continue
            }

            if (!fs.existsSync(transcodedVideo) || fs.statSync(transcodedVideo).size < 1000) {
                console.log(`  ❌ 트랜스코딩 결과 파일이 유효하지 않음`)
                continue
            }

            const newSize = (fs.statSync(transcodedVideo).size / 1024 / 1024).toFixed(1)
            console.log(`  ✅ 트랜스코딩 완료: ${fileSize}MB → ${newSize}MB`)

            // Upload to B2 (overwrite same path)
            const newProxyUrl = await uploadToB2(auth, transcodedVideo, b2FilePath)
            console.log(`  ✅ B2 업로드 완료 (기존 경로 덮어쓰기): ${b2FilePath}`)

            fixedCount++
            console.log(`  🎉 수정 완료!`)

        } catch (e) {
            console.error(`  ❌ 오류:`, e.message?.substring(0, 300))
        } finally {
            if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo)
            if (fs.existsSync(transcodedVideo)) fs.unlinkSync(transcodedVideo)
        }
    }

    console.log(`\n${'═'.repeat(60)}`)
    console.log(`📊 결과:`)
    console.log(`   전체 검사: ${targets.length}개`)
    console.log(`   HEVC 감지: ${hevcCount}개`)
    console.log(`   수정 완료: ${fixedCount}개`)
}

main().catch(e => console.error('Fatal:', e))
