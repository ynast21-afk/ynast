'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useStreamers } from '@/contexts/StreamerContext'
import { useAuth, getAuthToken } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { resolveContentType, isVideoFile, getAcceptedVideoExtensions } from '@/utils/mimeTypes'
import UserManagementPanel from '@/components/UserManagementPanel'

// ========================================
// 관리자 페이지 탭 정의
// ========================================
type AdminTab =
    | 'dashboard'
    | 'texts'
    | 'theme'
    | 'banner'
    | 'videos'
    | 'streamers'
    | 'users'
    | 'pricing'
    | 'navigation'
    | 'seo'
    | 'settings'
    | 'inquiries'
    | 'data'
    | 'security'

const gradientOptions = [
    { value: 'from-pink-900 to-purple-900', label: '핑크-퍼플' },
    { value: 'from-blue-900 to-indigo-900', label: '블루-인디고' },
    { value: 'from-cyan-900 to-teal-900', label: '시안-틸' },
    { value: 'from-amber-900 to-orange-900', label: '앰버-오렌지' },
    { value: 'from-rose-900 to-pink-900', label: '로즈-핑크' },
    { value: 'from-violet-900 to-purple-900', label: '바이올렛-퍼플' },
    { value: 'from-emerald-900 to-green-900', label: '에메랄드-그린' },
]

const colorPresets = [
    { name: 'Neon Green', value: '#00ff88' },
    { name: 'Electric Blue', value: '#00d4ff' },
    { name: 'Hot Pink', value: '#ff0080' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#ff6b00' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Gold', value: '#fbbf24' },
    { name: 'Cyan', value: '#22d3ee' },
]


interface BatchItem {
    id: string
    file: File
    customThumbnail?: File
    title: string
    streamerId: string
    tags: string
    minStreamingLevel: string
    minDownloadLevel: string
    status: 'pending' | 'uploading' | 'completed' | 'error'
    progress: number
}

// Helper for B2 SHA1
const calculateSHA1 = async (data: ArrayBuffer | Blob): Promise<string> => {
    const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data
    const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// fetchWithAuth is now defined inside AdminPage component to access useAuth() adminToken

export default function AdminPage() {
    console.log('--- ADMIN PAGE VERSION 2.8.3 (TOKEN HEADER FIX) ---')
    const { user, isLoading: authLoading, isAdmin, adminToken, getAdminHeaders } = useAuth()

    // Helper for authenticated fetch - uses adminToken from AuthContext or localStorage
    const fetchWithAuth = (url: string, options?: RequestInit): Promise<Response> => {
        const headers: Record<string, string> = {
            ...(options?.headers as Record<string, string> || {})
        }
        // Try all sources for admin token: React state → localStorage → sessionStorage (fallback)
        let token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null)

        // Fallback: Check sessionStorage if still no token
        if (!token && typeof window !== 'undefined') {
            const sessionToken = sessionStorage.getItem('admin_token')
            if (sessionToken) {
                console.log('[fetchWithAuth] Recovered token from sessionStorage')
                localStorage.setItem('admin_token', sessionToken)
                token = sessionToken
            }
        }

        if (token) {
            headers['x-admin-token'] = token
        }
        console.log('[fetchWithAuth v2.8.2] URL:', url, 'hasToken:', !!token, 'source:', adminToken ? 'context' : 'storage')
        return fetch(url, { ...options, headers: headers as HeadersInit })
    }
    const { streamers, videos, addStreamer, removeStreamer, addVideo, removeVideo, importData, downloadToken, migrateToB2, isServerSynced, updateStreamer, updateVideo } = useStreamers()
    const { settings, users, stats, inquiries, updateTexts, updateTheme, updateBanner, updateAnalytics, updatePopup, updatePricing, updateNavMenu, toggleNavItem, updateSocialLinks, toggleSocialLink, updateVideoDisplay, updateUserMembership, toggleUserBan, deleteInquiry } = useSiteSettings()

    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
    const [deleteModal, setDeleteModal] = useState<{ type: 'streamer' | 'video', id: string, name: string } | null>(null)
    const [editingVideo, setEditingVideo] = useState<any | null>(null)

    // Form states
    const [newStreamer, setNewStreamer] = useState({ name: '', koreanName: '', gradient: gradientOptions[0].value })
    const [newStreamerImage, setNewStreamerImage] = useState<File | null>(null)

    // Auto-thumbnail states (v2.3.0.9)
    const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null)
    const [generatedThumbnailFile, setGeneratedThumbnailFile] = useState<File | null>(null)
    const [newVideo, setNewVideo] = useState({
        title: '',
        streamerId: '',
        duration: '',
        isVip: true,
        tags: '',
        minStreamingLevel: 'vip',
        minDownloadLevel: 'vip'
    })
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null) // Manual thumbnail upload
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    // Batch upload states (v2.5)
    const [batchItems, setBatchItems] = useState<BatchItem[]>([])
    const [batchStreamerId, setBatchStreamerId] = useState('')
    const [isBatchUploading, setIsBatchUploading] = useState(false)
    const [batchCurrentIndex, setBatchCurrentIndex] = useState(0)
    const [batchProgress, setBatchProgress] = useState(0)
    const [batchGlobalTags, setBatchGlobalTags] = useState('')

    // Backup states (v2.4.0)
    const [backups, setBackups] = useState<any[]>([])
    const [isRestoring, setIsRestoring] = useState(false)
    const [isLoadingBackups, setIsLoadingBackups] = useState(false)

    // Text edit states
    const [textEdits, setTextEdits] = useState(settings.texts)

    // Theme edit states
    const [themeEdits, setThemeEdits] = useState(settings.theme)

    // Security logs states (v2.5.0)
    const [securityLogs, setSecurityLogs] = useState<any[]>([])
    const [isLoadingLogs, setIsLoadingLogs] = useState(false)
    const securityIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const fetchSecurityLogs = async () => {
        try {
            setIsLoadingLogs(true)
            const res = await fetch('/api/admin/logs')
            if (res.ok) {
                const data = await res.json()
                setSecurityLogs(data)
            }
        } catch (error) {
            console.error('Failed to fetch security logs', error)
        } finally {
            setIsLoadingLogs(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'security') {
            fetchSecurityLogs()
            // Auto refresh every 30 seconds while on this tab
            securityIntervalRef.current = setInterval(fetchSecurityLogs, 30000)
        } else {
            if (securityIntervalRef.current) clearInterval(securityIntervalRef.current)
        }
        return () => {
            if (securityIntervalRef.current) clearInterval(securityIntervalRef.current)
        }
    }, [activeTab])

    // Banner edit states
    const [bannerEdits, setBannerEdits] = useState(settings.banner)

    // Pricing edit states
    const [pricingEdits, setPricingEdits] = useState(settings.pricing)

    // Analytics edit states
    const [analyticsEdits, setAnalyticsEdits] = useState(settings.analytics)

    // sync with settings when they load from context (e.g. from localStorage)
    useEffect(() => {
        setTextEdits(settings.texts)
        setThemeEdits(settings.theme)
        setBannerEdits(settings.banner)
        setPricingEdits(settings.pricing)
        setAnalyticsEdits(settings.analytics)
    }, [settings])

    // notifications logic
    const [notifications, setNotifications] = useState<any[]>([])

    useEffect(() => {
        const saved = localStorage.getItem('kstreamer_admin_notifications')
        if (saved) {
            setNotifications(JSON.parse(saved).slice(0, 20))
        }

        if (activeTab === 'data') {
            fetchBackups()
        }
    }, [activeTab]) // Refresh when switching tabs

    const fetchBackups = async () => {
        setIsLoadingBackups(true)
        try {
            const res = await fetch('/api/admin/backup')
            if (res.ok) {
                const data = await res.json()
                // Sort by name descending (newest first)
                setBackups(data.sort((a: any, b: any) => b.fileName.localeCompare(a.fileName)))
            }
        } catch (err) {
            console.error('Failed to fetch backups:', err)
        } finally {
            setIsLoadingBackups(false)
        }
    }

    const handleRestore = async (fileName: string) => {
        if (!confirm(`[위험] 정말로 ${fileName} 백업 데이터로 복원하시겠습니까?\n현재 데이터가 모두 덮어씌워지며 복구할 수 없습니다.`)) {
            return
        }

        setIsRestoring(true)
        try {
            const res = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName })
            })

            if (res.ok) {
                alert('데이터 복원이 완료되었습니다. 페이지가 새로고침됩니다.')
                window.location.reload()
            } else {
                const error = await res.json()
                alert(`복원 실패: ${error.error || '알 수 없는 오류'}`)
            }
        } catch (err) {
            console.error('Restore error:', err)
            alert('복원 처리 중 오류가 발생했습니다.')
        } finally {
            setIsRestoring(false)
        }
    }

    const clearNotifications = () => {
        localStorage.setItem('kstreamer_admin_notifications', '[]')
        setNotifications([])
    }

    // Capture frames from video file and detect duration
    const generateThumbnail = (file: File, previewCount: number = 0): Promise<{ thumbnail: File, previews: File[], duration: string }> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video')
            video.preload = 'metadata'
            video.crossOrigin = 'anonymous'
            video.src = URL.createObjectURL(file)
            video.muted = true
            video.playsInline = true

            let duration = '0:00'

            const getFormattedDuration = (totalSeconds: number) => {
                if (isNaN(totalSeconds) || totalSeconds <= 0) return '0:00'
                const minutes = Math.floor(totalSeconds / 60)
                const seconds = Math.floor(totalSeconds % 60)
                return `${minutes}:${seconds.toString().padStart(2, '0')}`
            }

            video.onloadedmetadata = async () => {
                console.log('Video metadata loaded. Raw duration:', video.duration)

                let retryCount = 0
                while ((isNaN(video.duration) || video.duration === 0 || video.duration === Infinity) && retryCount < 10) {
                    await new Promise(r => setTimeout(r, 100))
                    retryCount++
                }

                duration = getFormattedDuration(video.duration)
                const vidDuration = video.duration

                const captureFrame = (time: number): Promise<Blob> => {
                    return new Promise((res, rej) => {
                        const onSeeked = () => {
                            video.removeEventListener('seeked', onSeeked)
                            const canvas = document.createElement('canvas')
                            canvas.width = video.videoWidth
                            canvas.height = video.videoHeight
                            const ctx = canvas.getContext('2d')
                            if (!ctx) return rej(new Error('Canvas context failed'))
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                            canvas.toBlob(blob => blob ? res(blob) : rej(new Error('Blob creation failed')), 'image/jpeg', 0.7)
                        }
                        video.addEventListener('seeked', onSeeked)
                        video.currentTime = time
                    })
                }

                try {
                    // 1. Main Thumbnail (at 10%)
                    const thumbBlob = await captureFrame(Math.max(1.0, vidDuration * 0.1))
                    const thumbnail = new File([thumbBlob], file.name.replace(/\.[^/.]+$/, "") + "_thumb.jpg", { type: 'image/jpeg' })

                    // 2. Previews (if requested)
                    const previews: File[] = []
                    if (previewCount > 0) {
                        const positions = [0.2, 0.4, 0.6, 0.8, 0.95]
                        for (let i = 0; i < previewCount; i++) {
                            const pBlob = await captureFrame(vidDuration * positions[i])
                            previews.push(new File([pBlob], `${file.name.replace(/\.[^/.]+$/, "")}_prev_${i}.jpg`, { type: 'image/jpeg' }))
                        }
                    }

                    URL.revokeObjectURL(video.src)
                    resolve({ thumbnail, previews, duration })
                } catch (err) {
                    URL.revokeObjectURL(video.src)
                    reject(err)
                }
            }

            video.onerror = (e) => {
                console.error('Video error during duration/thumb detection:', e)
                URL.revokeObjectURL(video.src)
                reject(new Error('Video loading failed for thumbnail'))
            }
        })
    }

    // Handlers
    const handleAddStreamer = async () => {
        if (!newStreamer.name.trim()) return

        let profileImageUrl = ''

        // 1. Image Upload if selected
        if (newStreamerImage) {
            try {
                const credsRes = await fetchWithAuth('/api/upload?type=upload')
                if (!credsRes.ok) throw new Error('Failed to get B2 credentials')
                const creds = await credsRes.json()

                const sha1 = await calculateSHA1(newStreamerImage)
                const fileName = `profiles/${Date.now()}_${newStreamerImage.name}`

                const uploadRes = await fetch(creds.uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': creds.authorizationToken,
                        'X-Bz-File-Name': encodeURIComponent(fileName),
                        'Content-Type': newStreamerImage.type,
                        'Content-Length': newStreamerImage.size.toString(),
                        'X-Bz-Content-Sha1': sha1,
                    },
                    body: newStreamerImage,
                })

                if (!uploadRes.ok) throw new Error('Profile Image Upload failed')
                profileImageUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${fileName}`
                console.log('Profile image uploaded:', profileImageUrl)
            } catch (error) {
                console.error('Failed to upload profile image:', error)
                alert('이미지 업로드에 실패했습니다. (텍스트 정보만 저장됩니다)')
            }
        }

        // 2. Add Streamer (Random gradient fallback)
        const randomGradient = gradientOptions[Math.floor(Math.random() * gradientOptions.length)].value

        await addStreamer({
            name: newStreamer.name.trim(),
            koreanName: newStreamer.koreanName.trim() || undefined,
            gradient: newStreamer.gradient,
            profileImage: profileImageUrl || undefined,
        })
        setNewStreamer({ name: '', koreanName: '', gradient: gradientOptions[0].value })
        setNewStreamerImage(null)

        // Reset file input
        const fileInput = document.getElementById('streamer-profile-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''

        alert('✅ 스트리머가 추가되었습니다!')
    }

    const handleAddVideo = async () => {
        // Allow empty title if file is selected (will default to filename)
        if ((!newVideo.title.trim() && !videoFile) || !newVideo.streamerId) {
            alert('영상 제목(또는 파일)과 스트리머를 입력해주세요.')
            return
        }

        const streamer = streamers.find(s => s.id === newVideo.streamerId)
        if (!streamer) return

        setIsUploading(true)
        setUploadProgress(0)
        let videoUrl = ''
        let thumbnailUrl = ''
        let detectedDuration = '0:00'

        // 파일이 선택된 경우 업로드 진행
        if (videoFile) {
            // 1. Determine final thumbnail source
            let finalThumbFile: File | null = null
            let previewFiles: File[] = []

            if (thumbnailFile) {
                console.log('Using manually uploaded thumbnail')
                finalThumbFile = thumbnailFile
                // We still need duration and previews from the video
                try {
                    const result = await generateThumbnail(videoFile, 5)
                    detectedDuration = result.duration || '0:00'
                    previewFiles = result.previews
                } catch (thumbErr) {
                    console.warn('Thumbnail/preview extraction failed, continuing without:', thumbErr)
                }
            } else if (generatedThumbnailFile) {
                console.log('Using pre-generated thumbnail')
                finalThumbFile = generatedThumbnailFile
                detectedDuration = newVideo.duration || '0:00'
                try {
                    const result = await generateThumbnail(videoFile, 5)
                    previewFiles = result.previews
                } catch (thumbErr) {
                    console.warn('Preview extraction failed, continuing without:', thumbErr)
                }
            } else {
                console.log('Generating thumbnail and previews on-the-fly...')
                try {
                    const result = await generateThumbnail(videoFile, 5)
                    finalThumbFile = result.thumbnail
                    detectedDuration = result.duration
                    previewFiles = result.previews
                } catch (thumbErr) {
                    console.warn('Auto thumbnail/preview generation failed, continuing without:', thumbErr)
                }
            }

            setUploadProgress(1)

            const previewUrls: string[] = []

            try {
                // 1. 썸네일 및 미리보기 업로드 (Client-side Capture)
                try {
                    const credsRes = await fetchWithAuth('/api/upload?type=upload')
                    if (!credsRes.ok) throw new Error('Failed to get B2 credentials')
                    const creds = await credsRes.json()

                    // Upload Main Thumbnail
                    if (finalThumbFile) {
                        const thumbSha1 = await calculateSHA1(finalThumbFile)
                        const thumbFileName = `thumbnails/${Date.now()}_${finalThumbFile.name}`

                        const uploadRes = await fetch(creds.uploadUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': creds.authorizationToken,
                                'X-Bz-File-Name': encodeURIComponent(thumbFileName),
                                'Content-Type': resolveContentType(finalThumbFile.name, finalThumbFile.type),
                                'Content-Length': finalThumbFile.size.toString(),
                                'X-Bz-Content-Sha1': thumbSha1,
                            },
                            body: finalThumbFile,
                        })

                        if (uploadRes.ok) {
                            thumbnailUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${thumbFileName}`
                        }
                    }

                    // Upload Previews
                    for (let i = 0; i < previewFiles.length; i++) {
                        const pFile = previewFiles[i]
                        const pSha1 = await calculateSHA1(pFile)
                        const pFileName = `previews/${Date.now()}_${pFile.name}`

                        const pUploadRes = await fetch(creds.uploadUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': creds.authorizationToken,
                                'X-Bz-File-Name': encodeURIComponent(pFileName),
                                'Content-Type': resolveContentType(pFile.name, pFile.type),
                                'Content-Length': pFile.size.toString(),
                                'X-Bz-Content-Sha1': pSha1,
                            },
                            body: pFile,
                        })

                        if (pUploadRes.ok) {
                            previewUrls.push(`${creds.downloadUrl}/file/${creds.bucketName}/${pFileName}`)
                        }
                    }
                } catch (err) {
                    console.error('Thumbnail/Preview upload failed:', err)
                }

                const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB
                const isLargeFile = videoFile.size > 5 * 1024 * 1024 // 5MB

                if (isLargeFile) {
                    console.log('Initiating Multi-part upload...')
                    const formData = new FormData()
                    formData.append('action', 'start_large_file')
                    formData.append('fileName', videoFile.name)
                    formData.append('contentType', resolveContentType(videoFile.name, videoFile.type))

                    const startRes = await fetchWithAuth('/api/upload', { method: 'POST', body: formData })
                    if (!startRes.ok) {
                        const err = await startRes.text()
                        console.error('Start large file failed:', err)
                        throw new Error(`Failed to start large file: ${err}`)
                    }
                    const { fileId } = await startRes.json()
                    console.log('Multi-part upload started. File ID:', fileId)

                    const partSha1Array: string[] = []
                    const totalParts = Math.ceil(videoFile.size / CHUNK_SIZE)

                    for (let i = 0; i < totalParts; i++) {
                        const start = i * CHUNK_SIZE
                        const end = Math.min(start + CHUNK_SIZE, videoFile.size)
                        const chunk = videoFile.slice(start, end)
                        const chunkBuffer = await chunk.arrayBuffer()
                        const sha1 = await calculateSHA1(chunkBuffer)
                        partSha1Array.push(sha1)

                        // Get upload URL for this part
                        const partUrlRes = await fetchWithAuth(`/api/upload?type=upload_part&fileId=${fileId}`)
                        if (!partUrlRes.ok) throw new Error('Failed to get part upload URL')
                        const { uploadUrl, authorizationToken } = await partUrlRes.json()

                        console.log(`Uploading part ${i + 1}/${totalParts}...`)
                        // Upload part
                        const uploadPartRes = await fetch(uploadUrl, {
                            method: 'POST',
                            mode: 'cors',
                            headers: {
                                'Authorization': authorizationToken,
                                'X-Bz-Part-Number': (i + 1).toString(),
                                'Content-Length': chunk.size.toString(),
                                'X-Bz-Content-Sha1': sha1,
                                'Content-Type': 'application/octet-stream',
                            },
                            body: chunk,
                        })

                        if (!uploadPartRes.ok) {
                            const err = await uploadPartRes.text()
                            console.error(`Part ${i + 1} upload failed:`, err)
                            if (uploadPartRes.status === 0 || uploadPartRes.status === 403) {
                                throw new Error(`Part ${i + 1} failed. B2 CORS settings likely missing "X-Bz-Part-Number" header.`)
                            }
                            throw new Error(`Failed to upload part ${i + 1}: ${err}`)
                        }

                        console.log(`Part ${i + 1} done.`)
                        setUploadProgress(Math.floor(((i + 1) / totalParts) * 90))
                    }

                    console.log('Finishing large file...')
                    // Finish large file
                    const finishData = new FormData()
                    finishData.append('action', 'finish_large_file')
                    finishData.append('fileId', fileId)
                    finishData.append('partSha1Array', JSON.stringify(partSha1Array))

                    const finishRes = await fetchWithAuth('/api/upload', { method: 'POST', body: finishData })
                    if (!finishRes.ok) {
                        const err = await finishRes.text()
                        console.error('Finish large file failed:', err)
                        throw new Error(`Failed to finish large file: ${err}`)
                    }
                    const finishResult = await finishRes.json()
                    videoUrl = finishResult.downloadUrl
                    console.log('Multi-part upload SUCCESS.')
                } else {
                    // --- Single Direct Upload Flow ---
                    const credsRes = await fetchWithAuth('/api/upload?type=upload')
                    if (!credsRes.ok) throw new Error('Failed to get B2 credentials')
                    const creds = await credsRes.json()

                    const sha1 = await calculateSHA1(videoFile)
                    const fileName = `videos/${Date.now()}_${videoFile.name}`

                    const uploadRes = await fetch(creds.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': creds.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(fileName),
                            'Content-Type': resolveContentType(videoFile.name, videoFile.type),
                            'Content-Length': videoFile.size.toString(),
                            'X-Bz-Content-Sha1': sha1,
                        },
                        body: videoFile,
                    })

                    if (!uploadRes.ok) throw new Error('B2 upload failed')
                    videoUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${fileName}`
                }

                await addVideo({
                    title: newVideo.title.trim(),
                    streamerId: newVideo.streamerId,
                    streamerName: streamer.name,
                    duration: detectedDuration !== '0:00' ? detectedDuration : (newVideo.duration || '0:00'),
                    isVip: newVideo.isVip,
                    minStreamingLevel: newVideo.minStreamingLevel,
                    minDownloadLevel: newVideo.minDownloadLevel,
                    views: 0,
                    likes: 0,
                    uploadedAt: 'Just now',
                    videoUrl: videoUrl || undefined,
                    thumbnailUrl: thumbnailUrl || undefined,
                    previewUrls: previewUrls.length > 0 ? previewUrls : undefined,
                    tags: newVideo.tags.split(/[,\#]+/).map(t => t.trim()).filter(Boolean),
                    gradient: '' // Set empty gradient as we are moving away from it
                } as any)

                setUploadProgress(100)
            } catch (error) {
                // ... existing catch block ...
                console.error('Upload failed:', error)
                alert('비디오 업로드에 실패했습니다. (B2 Upload Error)')
                setIsUploading(false)
                setUploadProgress(0)
                return
            }
        } else {
            // 파일 없이 추가하는 경우 (기존 로직 유지)
            await addVideo({
                title: newVideo.title.trim(),
                streamerId: newVideo.streamerId,
                streamerName: streamer.name,
                duration: newVideo.duration || '0:00',
                isVip: newVideo.isVip,
                minStreamingLevel: newVideo.minStreamingLevel,
                minDownloadLevel: newVideo.minDownloadLevel,
                views: 0,
                likes: 0,
                gradient: streamer.gradient,
                uploadedAt: 'Just now',
                videoUrl: videoUrl || undefined,
                tags: newVideo.tags.split(/[,\#]+/).map(t => t.trim()).filter(Boolean)
            })
        }

        setNewVideo({
            title: '',
            streamerId: '',
            duration: '',
            isVip: true,
            tags: '',
            minStreamingLevel: 'vip',
            minDownloadLevel: 'vip'
        })
        setVideoFile(null)
        setThumbnailFile(null)
        setPreviewThumbnail(null)
        setGeneratedThumbnailFile(null)
        setIsUploading(false)
        setUploadProgress(0)

        // 파일 입력 초기화
        const fileInput = document.getElementById('video-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''

        alert('✅ 영상이 추가되었습니다!')
    }

    // Helper to create thumbnail from File object and detect duration (for batch upload)
    // createThumbnailFromFile unified into generateThumbnail above

    const updateBatchItem = (id: string, updates: Partial<BatchItem>) => {
        setBatchItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
    }

    const removeBatchItem = (id: string) => {
        setBatchItems(prev => prev.filter(item => item.id !== id))
    }

    const handleUpdateVideo = async () => {
        if (!editingVideo) return
        const selectedStreamer = streamers.find(s => s.id === editingVideo.streamerId)
        await updateVideo(editingVideo.id, {
            title: editingVideo.title,
            streamerId: editingVideo.streamerId,
            streamerName: selectedStreamer?.name || editingVideo.streamerName,
            minStreamingLevel: editingVideo.minStreamingLevel,
            minDownloadLevel: editingVideo.minDownloadLevel,
            isVip: editingVideo.minStreamingLevel === 'vip' || editingVideo.minStreamingLevel === 'premium',
            tags: typeof editingVideo.tags === 'string' ? (editingVideo.tags as string).split(/[,\#]+/).map((t: string) => t.trim()).filter(Boolean) : editingVideo.tags
        })
        setEditingVideo(null)
    }

    const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        const files = Array.from(e.target.files)

        // Filter for allowed video formats (확장자 기반 - 폭넓은 지원)
        const validFiles = files.filter(file => isVideoFile(file))

        if (validFiles.length !== files.length) {
            alert(`⚠️ 일부 파일이 제외되었습니다.\n(지원 형식: MP4, WebM, MOV, AVI, MKV, WMV, FLV 등)\n\n제외된 파일: ${files.length - validFiles.length}개`)
        }

        const newItems: BatchItem[] = validFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            title: file.name.replace(/\.[^/.]+$/, ""),
            streamerId: '',
            tags: '',
            minStreamingLevel: 'vip',
            minDownloadLevel: 'vip',
            status: 'pending',
            progress: 0
        }))
        setBatchItems(prev => [...prev, ...newItems])
        // Reset input
        e.target.value = ''
    }

    const handleBatchUpload = async () => {
        const pendingItems = batchItems.filter(item => item.status === 'pending')
        if (pendingItems.length === 0) {
            alert('업로드할 대기 항목이 없습니다.')
            return
        }

        if (!batchStreamerId && pendingItems.some(i => !i.streamerId)) {
            alert('전체 대상 스트리머를 지정하거나, 개별 항목에 스트리머를 지정해주세요.')
            return
        }

        setIsBatchUploading(true)
        setBatchCurrentIndex(0)

        for (let i = 0; i < pendingItems.length; i++) {
            setBatchCurrentIndex(i)
            const item = pendingItems[i]
            const file = item.file

            // Mark item as uploading
            setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'uploading', progress: 0 } : it))

            const targetStreamerId = item.streamerId || batchStreamerId
            const streamer = streamers.find(s => s.id === targetStreamerId)
            const title = item.title || file.name.replace(/\.[^/.]+$/, "")

            let b2VideoUrl = ''
            let b2ThumbUrl = ''
            let previewUrls: string[] = []
            let finalDuration = '0:00'

            try {
                // 1. Duration extraction (always needed) & Auto-assets generation (fallback)
                let autoThumbBlob: File | null = null
                let autoPreviewFiles: File[] = []
                try {
                    const genResult = await generateThumbnail(file, 5)
                    autoThumbBlob = genResult.thumbnail
                    autoPreviewFiles = genResult.previews
                    finalDuration = genResult.duration
                } catch (thumbErr) {
                    console.warn(`[Batch] Thumbnail/preview extraction failed for ${file.name}, continuing upload without auto-thumbnail:`, thumbErr)
                }

                // 2. Determine which thumbnail to upload
                let thumbToUpload: Blob | File | null = autoThumbBlob

                if (item.customThumbnail) {
                    console.log(`[Batch] Using custom thumbnail for ${file.name}`)
                    thumbToUpload = item.customThumbnail
                }

                const credsRes = await fetchWithAuth('/api/upload?type=upload')
                const creds = await credsRes.json()

                // 3. Upload Thumbnail (if available)
                if (thumbToUpload) {
                    const thumbExt = item.customThumbnail ? item.customThumbnail.name.split('.').pop() : 'jpg'
                    const thumbContentType = item.customThumbnail ? item.customThumbnail.type : 'image/jpeg'
                    const thumbSha1 = await calculateSHA1(thumbToUpload)
                    const thumbName = `thumbnails/${Date.now()}_${file.name.substring(0, file.name.lastIndexOf('.')) || 'video'}.${thumbExt}`

                    const thumbUploadRes = await fetch(creds.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': creds.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(thumbName),
                            'Content-Type': item.customThumbnail ? resolveContentType(item.customThumbnail.name, item.customThumbnail.type) : 'image/jpeg',
                            'Content-Length': thumbToUpload.size.toString(),
                            'X-Bz-Content-Sha1': thumbSha1,
                        },
                        body: thumbToUpload,
                    })

                    if (thumbUploadRes.ok) {
                        b2ThumbUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${thumbName}`
                    }
                }

                // 4. Upload Previews
                for (let j = 0; j < autoPreviewFiles.length; j++) {
                    const pFile = autoPreviewFiles[j]
                    const pSha1 = await calculateSHA1(pFile)
                    const pFileName = `previews/${Date.now()}_${pFile.name}`

                    const pUploadRes = await fetch(creds.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': creds.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(pFileName),
                            'Content-Type': resolveContentType(pFile.name, pFile.type),
                            'Content-Length': pFile.size.toString(),
                            'X-Bz-Content-Sha1': pSha1,
                        },
                        body: pFile,
                    })

                    if (pUploadRes.ok) {
                        previewUrls.push(`${creds.downloadUrl}/file/${creds.bucketName}/${pFileName}`)
                    }
                }

                const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB
                const isLargeFile = file.size > 5 * 1024 * 1024 // 5MB

                if (isLargeFile) {
                    // --- Multi-part Upload Flow ---
                    const formData = new FormData()
                    formData.append('action', 'start_large_file')
                    formData.append('fileName', file.name)
                    formData.append('contentType', resolveContentType(file.name, file.type))

                    const startRes = await fetchWithAuth('/api/upload', { method: 'POST', body: formData })
                    if (!startRes.ok) throw new Error('Failed to start large file')
                    const { fileId } = await startRes.json()

                    const partSha1Array: string[] = []
                    const totalParts = Math.ceil(file.size / CHUNK_SIZE)

                    for (let j = 0; j < totalParts; j++) {
                        const start = j * CHUNK_SIZE
                        const end = Math.min(start + CHUNK_SIZE, file.size)
                        const chunk = file.slice(start, end)
                        const chunkBuffer = await chunk.arrayBuffer()
                        const sha1 = await calculateSHA1(chunkBuffer)
                        partSha1Array.push(sha1)

                        // Retry logic for part upload (Max 3 attempts)
                        let uploaded = false
                        let lastError = null

                        for (let attempt = 1; attempt <= 3; attempt++) {
                            try {
                                const partUrlRes = await fetchWithAuth(`/api/upload?type=upload_part&fileId=${fileId}`)
                                if (!partUrlRes.ok) throw new Error('Failed to get part upload URL')
                                const { uploadUrl, authorizationToken } = await partUrlRes.json()

                                const uploadPartRes = await fetch(uploadUrl, {
                                    method: 'POST',
                                    mode: 'cors',
                                    headers: {
                                        'Authorization': authorizationToken,
                                        'X-Bz-Part-Number': (j + 1).toString(),
                                        'Content-Length': chunk.size.toString(),
                                        'X-Bz-Content-Sha1': sha1,
                                        'Content-Type': 'application/octet-stream',
                                    },
                                    body: chunk,
                                })

                                if (!uploadPartRes.ok) {
                                    // 503 or 500 errors -> Retry
                                    if (uploadPartRes.status >= 500 || uploadPartRes.status === 429) {
                                        throw new Error(`Server status ${uploadPartRes.status}`)
                                    }
                                    // 4xx errors -> Fail immediately (except 408/429)
                                    throw new Error(`Fatal upload error ${uploadPartRes.status}`)
                                }

                                uploaded = true
                                break // Success!
                            } catch (err: any) {
                                console.warn(`Part ${j + 1} upload failed (Attempt ${attempt}/3):`, err)
                                lastError = err
                                if (attempt < 3) {
                                    await new Promise(r => setTimeout(r, 1000 * attempt)) // Backoff: 1s, 2s
                                }
                            }
                        }

                        if (!uploaded) throw lastError || new Error(`Failed to upload part ${j + 1} after 3 attempts`)

                        // Progress Update (Granular)
                        const currentFileProgress = (j + 1) / totalParts
                        const totalProgress = ((i + currentFileProgress) / pendingItems.length) * 100
                        setBatchProgress(totalProgress)

                        // Item Progress
                        const itemProgress = Math.round(currentFileProgress * 100)
                        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, progress: itemProgress } : it))
                    }

                    const finishData = new FormData()
                    finishData.append('action', 'finish_large_file')
                    finishData.append('fileId', fileId)
                    finishData.append('partSha1Array', JSON.stringify(partSha1Array))

                    const finishRes = await fetchWithAuth('/api/upload', { method: 'POST', body: finishData })
                    if (!finishRes.ok) throw new Error('Failed to finish large file')
                    const finishResult = await finishRes.json()
                    b2VideoUrl = finishResult.downloadUrl
                } else {
                    const sha1 = await calculateSHA1(file)
                    const fileName = `videos/${Date.now()}_${file.name}`

                    const uploadRes = await fetch(creds.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': creds.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(fileName),
                            'Content-Type': resolveContentType(file.name, file.type),
                            'Content-Length': file.size.toString(),
                            'X-Bz-Content-Sha1': sha1,
                        },
                        body: file,
                    })

                    if (!uploadRes.ok) throw new Error('B2 upload failed')
                    b2VideoUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${fileName}`
                }

                // Add video to list
                await addVideo({
                    title,
                    streamerId: targetStreamerId,
                    streamerName: streamer?.name || 'Unknown',
                    duration: finalDuration,
                    videoUrl: b2VideoUrl,
                    thumbnailUrl: b2ThumbUrl,
                    previewUrls: previewUrls.length > 0 ? previewUrls : undefined,
                    gradient: gradientOptions[Math.floor(Math.random() * gradientOptions.length)].value,
                    uploadedAt: new Date().toLocaleDateString(),
                    isVip: item.minStreamingLevel === 'vip' || item.minStreamingLevel === 'premium',
                    minStreamingLevel: item.minStreamingLevel,
                    minDownloadLevel: item.minDownloadLevel,
                    views: 0,
                    likes: 0,
                    tags: Array.from(new Set([
                        ...(batchGlobalTags ? batchGlobalTags.split(/[,\#]+/).map(t => t.trim()).filter(Boolean) : []),
                        ...(item.tags ? item.tags.split(/[,\#]+/).map(t => t.trim()).filter(Boolean) : [])
                    ]))
                })

                setBatchProgress(((i + 1) / pendingItems.length) * 100)
                setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'completed', progress: 100 } : it))

            } catch (error: any) {
                const errMsg = error?.message || String(error)
                console.error(`Batch upload item failed [${file.name}]:`, errMsg, error)
                setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', progress: 0, errorMessage: errMsg } : it))
            }
        }

        setIsBatchUploading(false)
        setBatchProgress(0)
        setBatchCurrentIndex(0)

        // Show result summary with error details
        const completedCount = pendingItems.filter((_, idx) => {
            const currentItems = batchItems
            return true  // We'll check the state after
        }).length
        // Use a timeout to allow state to settle before showing alert
        setTimeout(() => {
            const currentItems = document.querySelectorAll('[data-batch-status]')
            const errorItems = batchItems.filter(it => it.status === 'error')
            const successItems = batchItems.filter(it => it.status === 'completed')
            if (errorItems.length > 0) {
                const errorDetails = errorItems.map(it => `• ${it.file.name}: ${(it as any).errorMessage || '알 수 없는 오류'}`).join('\n')
                alert(`⚠️ 업로드 결과: ${successItems.length}개 성공, ${errorItems.length}개 실패\n\n실패 상세:\n${errorDetails}`)
            } else {
                alert('✅ 일괄 업로드가 완료되었습니다!')
            }
        }, 100)
    }
    const handleConfirmDelete = async () => {
        if (!deleteModal) return

        if (deleteModal.type === 'streamer') {
            await removeStreamer(deleteModal.id)
        } else {
            // Find video to get URLs for B2 deletion
            const videoToDelete = videos.find(v => v.id === deleteModal.id)
            if (videoToDelete) {
                console.log(`[Admin] Deleting video files from B2 for: ${videoToDelete.title}`)

                // Delete video file
                if (videoToDelete.videoUrl && videoToDelete.videoUrl.includes('backblazeb2.com')) {
                    fetchWithAuth(`/api/upload?url=${encodeURIComponent(videoToDelete.videoUrl)}`, { method: 'DELETE' })
                        .catch(err => console.error('Failed to delete video from B2:', err))
                }

                // Delete thumbnail file
                if (videoToDelete.thumbnailUrl && videoToDelete.thumbnailUrl.includes('backblazeb2.com')) {
                    fetchWithAuth(`/api/upload?url=${encodeURIComponent(videoToDelete.thumbnailUrl)}`, { method: 'DELETE' })
                        .catch(err => console.error('Failed to delete thumbnail from B2:', err))
                }
            }
            await removeVideo(deleteModal.id)
        }
        setDeleteModal(null)
    }

    const handleSaveTexts = () => {
        updateTexts(textEdits)
        alert('✅ 문구가 저장되었습니다!')
    }

    const handleSaveTheme = () => {
        updateTheme(themeEdits)
        alert('✅ 테마가 저장되었습니다!')
    }

    const handleSaveBanner = () => {
        updateBanner(bannerEdits)
        alert('✅ 배너 설정이 저장되었습니다!')
    }

    const handleSavePricing = () => {
        updatePricing(pricingEdits)
        alert('✅ 가격 설정이 저장되었습니다!')
    }

    const handleSaveAnalytics = () => {
        updateAnalytics(analyticsEdits)
        alert('✅ 설정이 저장되었습니다!')
    }

    const handleExportData = () => {
        const data = {
            streamers,
            videos,
            settings,
            exportDate: new Date().toISOString()
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kdance_backup_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string)
                if (data.streamers && data.videos) {
                    const success = await importData({ streamers: data.streamers, videos: data.videos })
                    if (success) {
                        alert('✅ 데이터 가져오기가 완료되었습니다! (스트리머/비디오)')
                        window.location.reload() // Reload to ensure all contexts sync
                    } else {
                        alert('❌ 데이터 형식이 올바르지 않습니다.')
                    }
                } else {
                    alert('❌ 필수 데이터(streamers, videos)가 누락되었습니다.')
                }
            } catch (err) {
                console.error('Import failed:', err)
                alert('❌ 파일 읽기 중 오류가 발생했습니다.')
            }
        }
        reader.readAsText(file)
    }

    // 로딩 중
    if (authLoading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-secondary">로딩 중...</p>
                </div>
            </div>
        )
    }

    // 로그인하지 않은 경우
    if (!user) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <span className="text-6xl mb-4 block">🔒</span>
                    <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
                    <p className="text-text-secondary mb-6">관리자 페이지에 접근하려면 먼저 로그인해주세요.</p>
                    <Link href="/login" className="inline-block gradient-button text-black px-8 py-3 rounded-lg font-semibold">
                        로그인하러 가기
                    </Link>
                </div>
            </div>
        )
    }

    // 관리자가 아닌 경우
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <span className="text-6xl mb-4 block">⛔</span>
                    <h1 className="text-2xl font-bold mb-4 text-red-400">접근 권한 없음</h1>
                    <p className="text-text-secondary mb-6">관리자만 이 페이지에 접근할 수 있습니다.</p>
                    <p className="text-sm text-text-secondary mb-6">현재 로그인: <span className="text-white">{user.email}</span></p>
                    <Link href="/" className="inline-block gradient-button text-black px-8 py-3 rounded-lg font-semibold">
                        홈으로 돌아가기
                    </Link>
                </div>
            </div>
        )
    }

    // 탭 목록
    const tabs: { id: AdminTab; icon: string; label: string }[] = [
        { id: 'dashboard', icon: '📊', label: '대시보드' },
        { id: 'texts', icon: '📝', label: '사이트 문구' },
        { id: 'theme', icon: '🎨', label: '테마/디자인' },
        { id: 'banner', icon: '📢', label: '배너/공지' },
        { id: 'videos', icon: '🎬', label: '영상 관리' },
        { id: 'streamers', icon: '👥', label: '스트리머' },
        { id: 'users', icon: '👤', label: '사용자' },
        { id: 'pricing', icon: '💰', label: '멤버십 가격' },
        { id: 'navigation', icon: '🔗', label: '메뉴/링크' },
        { id: 'seo', icon: '🔍', label: 'SEO/마케팅' },
        { id: 'inquiries', icon: '✉️', label: '문의 내역' },
        { id: 'data', icon: '💾', label: '데이터 백업' },
        { id: 'settings', icon: '⚙️', label: '사이트 설정' },
        { id: 'security', icon: '🛡️', label: '보안 모니터링' },
    ]

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div className="bg-bg-secondary rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-red-400">⚠️ 삭제 확인</h3>
                        <p className="text-text-secondary mb-6">
                            <span className="text-white font-semibold">&quot;{deleteModal.name}&quot;</span>
                            {deleteModal.type === 'streamer' ? '를 삭제하시겠습니까? 해당 스트리머의 모든 비디오도 함께 삭제됩니다.' : '를 삭제하시겠습니까?'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-text-secondary hover:bg-white/5">
                                취소
                            </button>
                            <button onClick={handleConfirmDelete} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Header */}
            <div className="bg-bg-secondary border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="text-2xl font-bold text-accent-primary">kStreamer</Link>
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold">ADMIN</span>
                        </div>
                        <div className="text-sm text-text-secondary">
                            👋 {user.name}님 환영합니다
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <div className="w-56 shrink-0">
                        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-3 sticky top-6">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === tab.id
                                        ? 'bg-accent-primary/20 text-accent-primary font-semibold'
                                        : 'text-text-secondary hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    <span className="text-sm">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">

                            {/* Storage Diagnostic Tool (Only visible in dev or for debugging) */}
                            <div className="bg-black/40 border border-blue-500/30 rounded-2xl p-6 mb-8">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <span className="text-blue-400">🔍</span> Storage Diagnostic (v1.5.0)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                                    <div className="p-3 bg-black/60 rounded-lg">
                                        <div className="text-gray-400 mb-1">Current State</div>
                                        <div className="flex justify-between">
                                            <span>Videos:</span>
                                            <span className="text-green-400 font-bold">{videos.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Streamers:</span>
                                            <span className="text-blue-400 font-bold">{streamers.length}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-black/60 rounded-lg">
                                        <div className="text-gray-400 mb-1">Browser Storage</div>
                                        <div className="flex justify-between">
                                            <span>videos count:</span>
                                            <span className="text-yellow-400 font-bold">
                                                {typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('videos') || '[]').length : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>settings check:</span>
                                            <span className="text-blue-400 font-bold">
                                                {typeof window !== 'undefined' && localStorage.getItem('kstreamer_site_settings') ? 'OK' : 'MISSING'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                    <button
                                        onClick={() => {
                                            if (confirm('⚠️ WARNING: This will clear all videos and reset to defaults. Proceed?')) {
                                                localStorage.removeItem('videos')
                                                localStorage.removeItem('streamers')
                                                window.location.reload()
                                            }
                                        }}
                                        className="px-3 py-1.5 bg-red-900/30 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/20 transition-all"
                                    >
                                        Reset to Defaults (Wipe)
                                    </button>
                                    <button
                                        onClick={() => {
                                            console.log('FULL STORAGE DUMP:', { ...localStorage })
                                            alert('Console에 전체 주소와 저장값이 출력되었습니다 (F12 확인)')
                                        }}
                                        className="px-3 py-1.5 bg-blue-900/30 border border-blue-500/50 text-blue-400 rounded-md hover:bg-blue-500/20 transition-all"
                                    >
                                        Log Full Dump
                                    </button>
                                </div>
                            </div>

                            {/* ========== 대시보드 탭 ========== */}
                            {activeTab === 'dashboard' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">📊 대시보드</h1>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                        <div className="bg-gradient-to-br from-blue-900/50 to-blue-600/30 rounded-xl p-5 border border-blue-500/20">
                                            <p className="text-blue-300 text-sm mb-1">총 방문자</p>
                                            <p className="text-3xl font-bold">{stats.totalVisits.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-900/50 to-green-600/30 rounded-xl p-5 border border-green-500/20">
                                            <p className="text-green-300 text-sm mb-1">오늘 방문</p>
                                            <p className="text-3xl font-bold">{stats.todayVisits}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-900/50 to-purple-600/30 rounded-xl p-5 border border-purple-500/20">
                                            <p className="text-purple-300 text-sm mb-1">총 영상</p>
                                            <p className="text-3xl font-bold">{videos.length}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-pink-900/50 to-pink-600/30 rounded-xl p-5 border border-pink-500/20">
                                            <p className="text-pink-300 text-sm mb-1">스트리머</p>
                                            <p className="text-3xl font-bold">{streamers.length}</p>
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-6 mb-8">
                                        <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                                            <h3 className="font-semibold mb-4">🎬 최근 영상</h3>
                                            {videos.slice(0, 5).map(video => (
                                                <div key={video.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                                                    <span className="truncate flex-1">{video.title}</span>
                                                    <span className="text-xs text-text-secondary ml-2">{video.uploadedAt}</span>
                                                </div>
                                            ))}
                                            {videos.length === 0 && <p className="text-text-secondary text-sm">영상이 없습니다</p>}
                                        </div>

                                        <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                                            <h3 className="font-semibold mb-4">👥 인기 스트리머</h3>
                                            {streamers.sort((a, b) => b.videoCount - a.videoCount).slice(0, 5).map(s => (
                                                <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                                                    <span>{s.name}</span>
                                                    <span className="text-xs text-accent-primary">{s.videoCount} videos</span>
                                                </div>
                                            ))}
                                            {streamers.length === 0 && <p className="text-text-secondary text-sm">스트리머가 없습니다</p>}
                                        </div>
                                    </div>

                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold">🔔 실시간 알림</h3>
                                            <button onClick={clearNotifications} className="text-xs text-text-secondary hover:text-accent-primary transition-colors">전체 삭제</button>
                                        </div>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <p className="text-text-secondary text-sm italic text-center py-4">새로운 알림이 없습니다.</p>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div key={notif.id} className="p-3 bg-bg-secondary rounded-lg border border-white/5 text-xs">
                                                        <div className="flex justify-between mb-1">
                                                            <span className={`font-bold ${notif.type === 'payment' ? 'text-green-400' :
                                                                notif.type === 'comment' ? 'text-blue-400' :
                                                                    'text-pink-400'
                                                                }`}>
                                                                {notif.type === 'payment' ? '💰 결제' : notif.type === 'comment' ? '💬 댓글' : '❤️ 찜'}
                                                            </span>
                                                            <span className="text-text-tertiary">{new Date(notif.time).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-white">{notif.message}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 사이트 문구 탭 ========== */}
                            {activeTab === 'texts' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">📝 사이트 문구 편집</h1>
                                    <div className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-text-secondary mb-2">사이트 이름</label>
                                                <input
                                                    type="text"
                                                    value={textEdits.siteName}
                                                    onChange={e => setTextEdits({ ...textEdits, siteName: e.target.value })}
                                                    className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-text-secondary mb-2">사이트 슬로건</label>
                                                <input
                                                    type="text"
                                                    value={textEdits.siteSlogan}
                                                    onChange={e => setTextEdits({ ...textEdits, siteSlogan: e.target.value })}
                                                    className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">🏠 홈페이지</h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">히어로 타이틀</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.heroTitle}
                                                        onChange={e => setTextEdits({ ...textEdits, heroTitle: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">히어로 서브타이틀</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.heroSubtitle}
                                                        onChange={e => setTextEdits({ ...textEdits, heroSubtitle: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">📄 페이지별</h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Videos 페이지 타이틀</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.videosPageTitle}
                                                        onChange={e => setTextEdits({ ...textEdits, videosPageTitle: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Actors 페이지 타이틀</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.actorsPageTitle}
                                                        onChange={e => setTextEdits({ ...textEdits, actorsPageTitle: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">📋 푸터</h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">저작권 문구</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.footerCopyright}
                                                        onChange={e => setTextEdits({ ...textEdits, footerCopyright: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">푸터 설명</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.footerDescription}
                                                        onChange={e => setTextEdits({ ...textEdits, footerDescription: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={handleSaveTexts} className="gradient-button text-black px-8 py-3 rounded-xl font-semibold">
                                            💾 변경사항 저장
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ========== 테마/디자인 탭 ========== */}
                            {activeTab === 'theme' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">🎨 테마 / 디자인</h1>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm text-text-secondary mb-3">메인 테마 컬러</label>
                                            <div className="flex flex-wrap gap-3">
                                                {colorPresets.map(color => (
                                                    <button
                                                        key={color.value}
                                                        onClick={() => setThemeEdits({ ...themeEdits, primaryColor: color.value, primaryColorName: color.name })}
                                                        className={`w-12 h-12 rounded-xl border-2 transition-all ${themeEdits.primaryColor === color.value ? 'border-white scale-110' : 'border-transparent'
                                                            }`}
                                                        style={{ backgroundColor: color.value }}
                                                        title={color.name}
                                                    />
                                                ))}
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={themeEdits.primaryColor}
                                                    onChange={e => setThemeEdits({ ...themeEdits, primaryColor: e.target.value, primaryColorName: 'Custom' })}
                                                    className="w-12 h-12 rounded-lg cursor-pointer"
                                                />
                                                <span className="text-text-secondary">또는 직접 선택</span>
                                                <span className="text-white font-mono">{themeEdits.primaryColor}</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <label className="block text-sm text-text-secondary mb-3">배경 스타일</label>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setThemeEdits({ ...themeEdits, backgroundStyle: 'solid' })}
                                                    className={`px-4 py-2 rounded-lg border ${themeEdits.backgroundStyle === 'solid' ? 'border-accent-primary bg-accent-primary/20' : 'border-white/20'}`}
                                                >
                                                    단색
                                                </button>
                                                <button
                                                    onClick={() => setThemeEdits({ ...themeEdits, backgroundStyle: 'gradient' })}
                                                    className={`px-4 py-2 rounded-lg border ${themeEdits.backgroundStyle === 'gradient' ? 'border-accent-primary bg-accent-primary/20' : 'border-white/20'}`}
                                                >
                                                    그라데이션
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">미리보기</h3>
                                            <div
                                                className="rounded-xl p-8 border border-white/10"
                                                style={{
                                                    backgroundColor: themeEdits.backgroundStyle === 'solid' ? themeEdits.backgroundColor : undefined,
                                                    backgroundImage: themeEdits.backgroundStyle === 'gradient'
                                                        ? `linear-gradient(to bottom right, ${themeEdits.gradientFrom}, ${themeEdits.gradientTo})`
                                                        : undefined
                                                }}
                                            >
                                                <p className="text-2xl font-bold mb-2" style={{ color: themeEdits.primaryColor }}>
                                                    kStreamer dance
                                                </p>
                                                <p className="text-text-secondary">테마 미리보기</p>
                                                <button className="mt-4 px-4 py-2 rounded-lg font-semibold" style={{ backgroundColor: themeEdits.primaryColor, color: '#000' }}>
                                                    버튼 예시
                                                </button>
                                            </div>
                                        </div>

                                        <button onClick={handleSaveTheme} className="gradient-button text-black px-8 py-3 rounded-xl font-semibold">
                                            💾 테마 저장
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ========== 배너/공지 탭 ========== */}
                            {activeTab === 'banner' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">📢 배너 / 공지사항</h1>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <label className="text-sm text-text-secondary">상단 배너 표시</label>
                                            <button
                                                onClick={() => setBannerEdits({ ...bannerEdits, enabled: !bannerEdits.enabled })}
                                                className={`w-14 h-8 rounded-full transition-all ${bannerEdits.enabled ? 'bg-accent-primary' : 'bg-gray-600'}`}
                                            >
                                                <div className={`w-6 h-6 bg-white rounded-full transition-all ${bannerEdits.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                            </button>
                                            <span className={bannerEdits.enabled ? 'text-accent-primary' : 'text-text-secondary'}>
                                                {bannerEdits.enabled ? 'ON' : 'OFF'}
                                            </span>
                                        </div>

                                        {bannerEdits.enabled && (
                                            <>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">배너 메시지</label>
                                                    <input
                                                        type="text"
                                                        value={bannerEdits.message}
                                                        onChange={e => setBannerEdits({ ...bannerEdits, message: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                        placeholder="🎉 Welcome to kStreamer dance!"
                                                    />
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm text-text-secondary mb-2">링크 텍스트</label>
                                                        <input
                                                            type="text"
                                                            value={bannerEdits.linkText}
                                                            onChange={e => setBannerEdits({ ...bannerEdits, linkText: e.target.value })}
                                                            className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-text-secondary mb-2">링크 URL</label>
                                                        <input
                                                            type="text"
                                                            value={bannerEdits.linkUrl}
                                                            onChange={e => setBannerEdits({ ...bannerEdits, linkUrl: e.target.value })}
                                                            className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm text-text-secondary mb-2">배경색</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={bannerEdits.backgroundColor}
                                                                onChange={e => setBannerEdits({ ...bannerEdits, backgroundColor: e.target.value })}
                                                                className="w-12 h-12 rounded-lg cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={bannerEdits.backgroundColor}
                                                                onChange={e => setBannerEdits({ ...bannerEdits, backgroundColor: e.target.value })}
                                                                className="flex-1 px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-text-secondary mb-2">텍스트색</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={bannerEdits.textColor}
                                                                onChange={e => setBannerEdits({ ...bannerEdits, textColor: e.target.value })}
                                                                className="w-12 h-12 rounded-lg cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={bannerEdits.textColor}
                                                                onChange={e => setBannerEdits({ ...bannerEdits, textColor: e.target.value })}
                                                                className="flex-1 px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Banner Preview */}
                                                <div>
                                                    <h3 className="font-semibold mb-3">미리보기</h3>
                                                    <div
                                                        className="p-4 rounded-xl flex items-center justify-center gap-4"
                                                        style={{ backgroundColor: bannerEdits.backgroundColor, color: bannerEdits.textColor }}
                                                    >
                                                        <span>{bannerEdits.message}</span>
                                                        <span className="underline font-semibold">{bannerEdits.linkText} →</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <button onClick={handleSaveBanner} className="gradient-button text-black px-8 py-3 rounded-xl font-semibold">
                                            💾 배너 설정 저장
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ========== 영상 관리 탭 ========== */}
                            {activeTab === 'videos' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">🎬 영상 관리 ({videos.length}개)</h1>

                                    {/* Video Display Settings */}
                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-white flex items-center gap-2">
                                                    ⚙️ 썸네일 표시 설정
                                                </h3>
                                                <p className="text-xs text-text-tertiary mt-1">
                                                    비활성화 시 모든 등급의 사용자에게 썸네일 및 미리보기가 자물쇠 없이 공개됩니다. (영상 재생/다운로드는 등급 제한 유지)
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-text-secondary">{settings.videoDisplay?.thumbnailLockEnabled !== false ? '🔒 자물쇠 표시' : '🔓 전체 공개'}</span>
                                                <button
                                                    onClick={() => updateVideoDisplay({ thumbnailLockEnabled: !(settings.videoDisplay?.thumbnailLockEnabled !== false) })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${settings.videoDisplay?.thumbnailLockEnabled !== false ? 'bg-accent-primary' : 'bg-white/20'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${settings.videoDisplay?.thumbnailLockEnabled !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Batch Upload Section (Replaces Single Upload) */}
                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10 mb-6 overflow-hidden">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-accent-primary">📦 비디오 대량 업로드 (Bulk Upload)</h3>
                                            <span className="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded font-mono">v3.0</span>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Global Controls */}
                                            <div className="grid md:grid-cols-2 gap-4 bg-bg-secondary/30 p-4 rounded-xl border border-white/5">
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">기본 스트리머 (Batch Default)</label>
                                                    <select
                                                        value={batchStreamerId}
                                                        onChange={e => setBatchStreamerId(e.target.value)}
                                                        className="w-full px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                        disabled={isBatchUploading}
                                                    >
                                                        <option value="">(선택 안함 - 개별 지정)</option>
                                                        {streamers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">파일 선택 (다중 선택 / 드래그)</label>
                                                    <div className="relative group">
                                                        <input
                                                            id="batch-file-input"
                                                            type="file"
                                                            accept="video/mp4,video/webm"
                                                            multiple
                                                            onChange={handleBatchFileSelect}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            disabled={isBatchUploading}
                                                        />
                                                        <div className="w-full px-4 py-3 bg-bg-secondary border border-dashed border-white/30 rounded-lg text-text-secondary text-center group-hover:border-accent-primary group-hover:text-accent-primary transition-all flex items-center justify-center gap-2">
                                                            <span className="text-xl">📂</span>
                                                            Click or Drag files here (MP4, WebM)
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Selected Files Queue */}
                                            {batchItems.length > 0 && (
                                                <div className="bg-bg-secondary rounded-lg p-4 border border-white/5">
                                                    <div className="flex justify-between items-center mb-3 text-sm">
                                                        <span className="text-text-secondary">대기열: <span className="text-white font-bold">{batchItems.length}</span>개 파일</span>
                                                        {isBatchUploading && <span className="text-accent-primary animate-pulse font-bold">🚀 업로드 진행 중...</span>}
                                                    </div>

                                                    <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                                        {batchItems.map((item) => (
                                                            <div key={item.id} className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${item.status === 'error' ? 'border-red-500/50 bg-red-500/10' : item.status === 'completed' ? 'border-green-500/50 bg-green-500/10' : item.status === 'uploading' ? 'border-accent-primary/50 bg-accent-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}>

                                                                <div className="flex items-start justify-between gap-4">
                                                                    {/* File Info */}
                                                                    <div className="w-1/3 min-w-[200px]">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-lg">🎬</span>
                                                                            <span className="text-sm font-medium text-white truncate" title={item.file.name}>{item.file.name}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-xs text-text-tertiary">
                                                                            <span>{(item.file.size / (1024 * 1024)).toFixed(1)}MB</span>
                                                                            <span>•</span>
                                                                            <span className="uppercase">{item.file.name.split('.').pop()?.toUpperCase() || 'VIDEO'}</span>
                                                                        </div>
                                                                        {item.status === 'completed' && <div className="mt-2 text-green-400 text-xs font-bold">✅ 업로드 완료</div>}
                                                                        {item.status === 'error' && <div className="mt-2 text-red-400 text-xs font-bold">❌ 실패</div>}
                                                                        {item.status === 'uploading' && <div className="mt-2 text-accent-primary text-xs font-bold">⏳ {item.progress}%</div>}
                                                                    </div>

                                                                    {/* Metadata Interface */}
                                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <div className="md:col-span-2 flex items-center gap-4 bg-black/30 p-2 rounded-lg border border-white/5">
                                                                            <div className="relative w-16 h-16 bg-bg-secondary rounded overflow-hidden flex-shrink-0 border border-white/10 group">
                                                                                {item.customThumbnail ? (
                                                                                    <img
                                                                                        src={URL.createObjectURL(item.customThumbnail)}
                                                                                        alt="Preview"
                                                                                        className="w-full h-full object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-text-tertiary">
                                                                                        <span>Auto</span>
                                                                                        <span>Thumb</span>
                                                                                    </div>
                                                                                )}
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0]
                                                                                        if (file) updateBatchItem(item.id, { customThumbnail: file })
                                                                                    }}
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                                    disabled={item.status !== 'pending'}
                                                                                />
                                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white pointer-events-none">
                                                                                    Change
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <label className="block text-[10px] text-text-tertiary mb-1">수동 썸네일 (선택 사항)</label>
                                                                                <div className="text-[11px] text-text-secondary leading-tight">
                                                                                    {item.customThumbnail ? (
                                                                                        <span className="text-accent-primary font-medium">{item.customThumbnail.name}</span>
                                                                                    ) : (
                                                                                        "영상의 첫 프레임이 자동으로 추출됩니다."
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {item.customThumbnail && (
                                                                                <button
                                                                                    onClick={() => updateBatchItem(item.id, { customThumbnail: undefined })}
                                                                                    className="text-xs text-red-400 hover:text-red-300 px-2"
                                                                                >
                                                                                    취소
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">비디오 제목 (미입력 시 파일명)</label>
                                                                            <input
                                                                                type="text"
                                                                                value={item.title}
                                                                                onChange={(e) => updateBatchItem(item.id, { title: e.target.value })}
                                                                                placeholder={item.file.name.replace(/\.[^/.]+$/, "")}
                                                                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent-primary outline-none placeholder:text-gray-600"
                                                                                disabled={item.status !== 'pending'}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">스트리머</label>
                                                                            <select
                                                                                value={item.streamerId}
                                                                                onChange={(e) => updateBatchItem(item.id, { streamerId: e.target.value })}
                                                                                className={`w-full px-3 py-2 text-sm bg-black/40 border rounded outline-none ${!item.streamerId && !batchStreamerId ? 'border-red-500/50 text-red-300' : 'border-white/10 text-white focus:border-accent-primary'}`}
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="">
                                                                                    {batchStreamerId
                                                                                        ? `(기본: ${streamers.find(s => s.id === batchStreamerId)?.name})`
                                                                                        : '⚠️ 스트리머 선택 필수'}
                                                                                </option>
                                                                                {streamers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">태그 (# 또는 , 로 구분)</label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="text"
                                                                                    value={item.tags}
                                                                                    placeholder="#댄스, kpop"
                                                                                    onChange={(e) => updateBatchItem(item.id, { tags: e.target.value })}
                                                                                    className="w-full pl-8 pr-3 py-2 text-sm bg-black/40 border border-white/10 rounded text-accent-primary focus:border-accent-primary outline-none placeholder:text-gray-600"
                                                                                    disabled={item.status !== 'pending'}
                                                                                />
                                                                                <span className="absolute left-3 top-2 text-text-tertiary">#</span>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">스트리밍 권한</label>
                                                                            <select
                                                                                value={item.minStreamingLevel}
                                                                                onChange={(e) => updateBatchItem(item.id, { minStreamingLevel: e.target.value })}
                                                                                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="guest">Guest (전체)</option>
                                                                                <option value="basic">Basic</option>
                                                                                <option value="vip">VIP</option>
                                                                                <option value="premium">Premium</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">다운로드 권한</label>
                                                                            <select
                                                                                value={item.minDownloadLevel}
                                                                                onChange={(e) => updateBatchItem(item.id, { minDownloadLevel: e.target.value })}
                                                                                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="guest">Guest (전체)</option>
                                                                                <option value="basic">Basic</option>
                                                                                <option value="vip">VIP</option>
                                                                                <option value="premium">Premium</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    {/* Delete Action */}
                                                                    {item.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => removeBatchItem(item.id)}
                                                                            className="p-1 text-text-tertiary hover:text-red-400 transition-colors"
                                                                            title="목록에서 제거"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Progress Bar */}
                                                                {item.status === 'uploading' && (
                                                                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className="bg-accent-primary h-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"
                                                                            style={{ width: `${item.progress}%` }}
                                                                        ></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end mt-4 pt-4 border-t border-white/10">
                                                        <button
                                                            onClick={handleBatchUpload}
                                                            disabled={isBatchUploading || batchItems.filter(i => i.status === 'pending').length === 0}
                                                            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 transform active:scale-95 ${isBatchUploading || batchItems.filter(i => i.status === 'pending').length === 0
                                                                ? 'bg-gray-700 opacity-50 cursor-not-allowed text-gray-400'
                                                                : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20'}`}
                                                        >
                                                            {isBatchUploading ? (
                                                                <>
                                                                    <span className="animate-spin text-xl">⏳</span>
                                                                    업로드 중 ({batchItems.filter(i => i.status === 'completed').length}/{batchItems.length})
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="text-xl">🚀</span>
                                                                    {batchItems.length}개 동영상 일괄 업로드
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Video List */}
                                    < div className="space-y-2" >
                                        {
                                            videos.map(video => (
                                                <div key={video.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-white/10">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 relative ${!video.thumbnailUrl ? 'bg-gradient-to-br from-gray-700 to-gray-800' : ''}`}>
                                                            {video.thumbnailUrl ? (
                                                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30">
                                                                    No Thumb
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-1 right-1 px-1 bg-black/60 rounded text-[10px] text-white font-mono">
                                                                {video.duration}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{video.title}</p>
                                                            <p className="text-sm text-text-secondary">@{video.streamerName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setEditingVideo({ ...video, tags: (video.tags || []).join(', ') })}
                                                            className="text-xs text-text-secondary hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                                                        >
                                                            수정
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteModal({ type: 'video', id: video.id, name: video.title })}
                                                            className="px-3 py-1 text-red-400 hover:bg-red-500/20 rounded-lg text-sm"
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div >
                                            ))
                                        }
                                        {videos.length === 0 && <p className="text-text-secondary text-center py-8">등록된 영상이 없습니다</p>}
                                    </div >

                                    {/* Edit Video Modal */}
                                    {editingVideo && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-md p-6 relative">
                                                <h3 className="text-lg font-bold text-white mb-4">영상 정보 수정</h3>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs text-text-tertiary mb-1">제목</label>
                                                        <input
                                                            type="text"
                                                            value={editingVideo.title}
                                                            onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, title: e.target.value } : null)}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs text-text-tertiary mb-1">스트리머 (카테고리)</label>
                                                        <select
                                                            value={editingVideo.streamerId}
                                                            onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, streamerId: e.target.value } : null)}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                        >
                                                            {streamers.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs text-text-tertiary mb-1">태그 (쉼표로 구분)</label>
                                                        <input
                                                            type="text"
                                                            value={editingVideo.tags as any}
                                                            onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, tags: e.target.value } : null)}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                            placeholder="예: 댄스, 커버, 4K"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs text-text-tertiary mb-1">스트리밍 권한</label>
                                                            <select
                                                                value={editingVideo.minStreamingLevel}
                                                                onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, minStreamingLevel: e.target.value } : null)}
                                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                            >
                                                                <option value="guest">Guest (전체)</option>
                                                                <option value="basic">Basic</option>
                                                                <option value="vip">VIP</option>
                                                                <option value="premium">Premium</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-text-tertiary mb-1">다운로드 권한</label>
                                                            <select
                                                                value={editingVideo.minDownloadLevel}
                                                                onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, minDownloadLevel: e.target.value } : null)}
                                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                            >
                                                                <option value="guest">Guest (전체)</option>
                                                                <option value="basic">Basic</option>
                                                                <option value="vip">VIP</option>
                                                                <option value="premium">Premium</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2 mt-6">
                                                    <button
                                                        onClick={() => setEditingVideo(null)}
                                                        className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={handleUpdateVideo}
                                                        className="gradient-button text-black px-4 py-2 rounded-lg text-sm font-semibold"
                                                    >
                                                        저장
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Batch Upload Section */}
                                    < div className="bg-bg-primary rounded-xl p-5 border border-white/10 mt-6 overflow-hidden" >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-accent-primary">📦 비디오 일괄 업로드 (Migration)</h3>
                                            <span className="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded font-mono">B2 Bulk Mode</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">대상 스트리머 선택</label>
                                                    <select
                                                        value={batchStreamerId}
                                                        onChange={e => setBatchStreamerId(e.target.value)}
                                                        className="w-full px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                        disabled={isBatchUploading}
                                                    >
                                                        <option value="">스트리머 선택</option>
                                                        {streamers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.koreanName || s.name})</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">일괄 적용 태그 (새로 추가되는 파일에 기본 적용)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="예: kpop, dance, tutorial"
                                                        value={batchGlobalTags}
                                                        onChange={e => setBatchGlobalTags(e.target.value)}
                                                        className="w-full px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                        disabled={isBatchUploading}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">비디오 파일 선택 (다중 선택 가능)</label>
                                                    <div className="relative">
                                                        <input
                                                            id="batch-file-input"
                                                            type="file"
                                                            accept="video/*"
                                                            multiple
                                                            onChange={handleBatchFileSelect}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            disabled={isBatchUploading}
                                                        />
                                                        <div className="w-full px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-accent-primary text-center hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-2">
                                                            <span>📂</span> 파일 선택 / 드래그 앤 드롭
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Selected Files List */}
                                            {batchItems.length > 0 && (
                                                <div className="bg-bg-secondary rounded-lg p-4 border border-white/5">
                                                    <div className="flex justify-between items-center mb-3 text-sm">
                                                        <span className="text-text-secondary">대기열: <span className="text-white font-bold">{batchItems.length}</span>개 파일</span>
                                                        {isBatchUploading && <span className="text-accent-primary animate-pulse">업로드 진행 중...</span>}
                                                    </div>

                                                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                        {batchItems.map((item) => (
                                                            <div key={item.id} className={`flex flex-col gap-2 p-3 rounded-lg border ${item.status === 'error' ? 'border-red-500/30 bg-red-500/5' : item.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-white/5'}`}>
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex flex-col gap-1 mb-1 w-full">
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    value={item.title}
                                                                                    onChange={(e) => updateBatchItem(item.id, { title: e.target.value })}
                                                                                    placeholder={item.file.name}
                                                                                    className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-text-secondary focus:text-white focus:border-accent-primary outline-none"
                                                                                    disabled={item.status !== 'pending'}
                                                                                />
                                                                                <span className="text-xs text-text-tertiary whitespace-nowrap">{(item.file.size / (1024 * 1024)).toFixed(1)}MB</span>
                                                                            </div>
                                                                            {item.status === 'completed' && <span className="text-xs text-green-400 font-bold">✓ 완료</span>}
                                                                            {item.status === 'error' && <span className="text-xs text-red-400 font-bold">FAILED</span>}
                                                                            {item.status === 'uploading' && <span className="text-xs text-accent-primary font-bold">{item.progress}%</span>}
                                                                        </div>
                                                                        <select
                                                                            value={item.streamerId || batchStreamerId}
                                                                            onChange={(e) => updateBatchItem(item.id, { streamerId: e.target.value })}
                                                                            className="w-full px-2 py-1 text-xs bg-black/30 border border-white/10 rounded text-text-secondary focus:text-white focus:border-accent-primary outline-none mb-1"
                                                                            disabled={item.status !== 'pending'}
                                                                        >
                                                                            <option value="">(기본값: {streamers.find(s => s.id === batchStreamerId)?.name || '선택'})</option>
                                                                            {streamers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                        </select>
                                                                        {/* Tag Input for individual item */}
                                                                        <input
                                                                            type="text"
                                                                            value={item.tags}
                                                                            placeholder="태그 입력 (비워두면 태그 없음)"
                                                                            onChange={(e) => updateBatchItem(item.id, { tags: e.target.value })}
                                                                            className="w-full px-2 py-1 text-xs bg-black/30 border border-white/10 rounded text-text-secondary focus:text-white focus:border-accent-primary outline-none"
                                                                            disabled={item.status !== 'pending'}
                                                                        />

                                                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                                                            <select
                                                                                value={item.minStreamingLevel}
                                                                                onChange={(e) => updateBatchItem(item.id, { minStreamingLevel: e.target.value })}
                                                                                className="px-2 py-1 text-[10px] bg-black/30 border border-white/10 rounded text-text-secondary focus:text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="guest">Stream: Guest</option>
                                                                                <option value="basic">Stream: Basic</option>
                                                                                <option value="vip">Stream: VIP</option>
                                                                                <option value="premium">Stream: Premium</option>
                                                                            </select>
                                                                            <select
                                                                                value={item.minDownloadLevel}
                                                                                onChange={(e) => updateBatchItem(item.id, { minDownloadLevel: e.target.value })}
                                                                                className="px-2 py-1 text-[10px] bg-black/30 border border-white/10 rounded text-text-secondary focus:text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="guest">Down: Guest</option>
                                                                                <option value="basic">Down: Basic</option>
                                                                                <option value="vip">Down: VIP</option>
                                                                                <option value="premium">Down: Premium</option>
                                                                            </select>
                                                                        </div>

                                                                        {/* Custom Thumbnail Input */}
                                                                        <div className="mt-2 flex items-center gap-2">
                                                                            <label className="text-[10px] text-text-tertiary shrink-0">🖼️ 썸네일:</label>
                                                                            <div className="flex-1 relative">
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0]
                                                                                        if (file) updateBatchItem(item.id, { customThumbnail: file })
                                                                                    }}
                                                                                    className="w-full text-xs text-text-secondary file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                                                                                    disabled={item.status !== 'pending'}
                                                                                />
                                                                            </div>
                                                                            {item.customThumbnail && (
                                                                                <button
                                                                                    onClick={() => updateBatchItem(item.id, { customThumbnail: undefined })}
                                                                                    className="text-xs text-red-400 hover:text-red-300"
                                                                                    title="썸네일 제거"
                                                                                >
                                                                                    🗑️
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {item.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => removeBatchItem(item.id)}
                                                                            className="text-text-tertiary hover:text-red-400 p-1"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {item.status === 'uploading' && (
                                                                    <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                                                        <div className="bg-accent-primary h-full transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end mt-4">
                                                        <button
                                                            onClick={handleBatchUpload}
                                                            disabled={isBatchUploading || batchItems.filter(i => i.status === 'pending').length === 0 || !batchStreamerId}
                                                            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${isBatchUploading || batchItems.filter(i => i.status === 'pending').length === 0 || !batchStreamerId ? 'bg-gray-600 opacity-50 cursor-not-allowed text-gray-400' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'}`}
                                                        >
                                                            {isBatchUploading ? '업로드 진행 중...' : '🔥 업로드 시작'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 스트리머 탭 ========== */}
                            {activeTab === 'streamers' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">👥 스트리머 관리 ({streamers.length}명)</h1>

                                    {/* Add Streamer Form */}
                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10 mb-6">
                                        <h3 className="font-semibold mb-4">➕ 새 스트리머 추가</h3>
                                        <div className="grid md:grid-cols-4 gap-4">
                                            <input
                                                type="text"
                                                placeholder="영문 이름"
                                                value={newStreamer.name}
                                                onChange={e => setNewStreamer({ ...newStreamer, name: e.target.value })}
                                                className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                            />
                                            <input
                                                type="text"
                                                placeholder="한글 이름 (선택)"
                                                value={newStreamer.koreanName}
                                                onChange={e => setNewStreamer({ ...newStreamer, koreanName: e.target.value })}
                                                className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                            />
                                            <div className="flex items-center gap-2 bg-bg-secondary border border-white/10 rounded-lg px-2 relative min-w-[200px]">
                                                <span className="text-xl shrink-0">🖼️</span>
                                                <input
                                                    id="streamer-profile-input"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => setNewStreamerImage(e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                                                />
                                            </div>
                                            <button onClick={handleAddStreamer} disabled={!newStreamer.name} className="gradient-button text-black rounded-lg font-semibold whitespace-nowrap disabled:opacity-50">
                                                추가
                                            </button>
                                        </div>
                                    </div>

                                    {/* Streamer List */}
                                    <div className="space-y-2">
                                        {streamers.map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-white/10">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-12 h-12 rounded-full overflow-hidden group/icon cursor-pointer">
                                                        {/* Base Gradient (Always visible as fallback) */}
                                                        <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />

                                                        {s.profileImage && (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={s.profileImage.includes('backblazeb2.com') && downloadToken
                                                                    ? `${s.profileImage}${s.profileImage.includes('?') ? '&' : '?'}Authorization=${downloadToken}`
                                                                    : s.profileImage
                                                                }
                                                                alt={s.name}
                                                                className="absolute inset-0 w-full h-full object-cover bg-gray-800"
                                                                onError={(e) => {
                                                                    console.error(`Failed to load profile image for ${s.name}:`, s.profileImage);
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        )}

                                                        {/* Edit Overlay */}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity">
                                                            <span className="text-[10px] text-white font-bold">EDIT</span>
                                                        </div>

                                                        {/* Hidden File Input for Profile Image */}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0]
                                                                if (!file) return

                                                                if (confirm(`'${s.name}'의 프로필 사진을 변경하시겠습니까?`)) {
                                                                    try {
                                                                        // Reuse existing upload logic flow
                                                                        const credsRes = await fetchWithAuth('/api/upload?type=upload')
                                                                        const creds = await credsRes.json()
                                                                        const sha1 = await calculateSHA1(file)
                                                                        const fileName = `profiles/${Date.now()}_${file.name}`

                                                                        const uploadRes = await fetch(creds.uploadUrl, {
                                                                            method: 'POST',
                                                                            headers: {
                                                                                'Authorization': creds.authorizationToken,
                                                                                'X-Bz-File-Name': encodeURIComponent(fileName),
                                                                                'Content-Type': resolveContentType(file.name, file.type),
                                                                                'Content-Length': file.size.toString(),
                                                                                'X-Bz-Content-Sha1': sha1,
                                                                            },
                                                                            body: file,
                                                                        })

                                                                        if (uploadRes.ok) {
                                                                            const imageUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${fileName}`
                                                                            await updateStreamer(s.id, { profileImage: imageUrl })
                                                                            alert('✅ 프로필 사진이 변경되었습니다!')
                                                                        } else {
                                                                            throw new Error('Upload failed')
                                                                        }
                                                                    } catch (err) {
                                                                        console.error(err)
                                                                        alert('❌ 사진 업로드 실패')
                                                                    }
                                                                }
                                                            }}
                                                            title="프로필 사진 변경"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium flex items-center gap-2">
                                                            {s.name}
                                                            {s.koreanName && <span className="text-text-secondary">({s.koreanName})</span>}
                                                            <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded">
                                                                Click Icon to Edit
                                                            </span>
                                                        </p>
                                                        <p className="text-sm text-text-secondary">{s.videoCount} videos</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setDeleteModal({ type: 'streamer', id: s.id, name: s.name })}
                                                    className="px-3 py-1 text-red-400 hover:bg-red-500/20 rounded-lg text-sm"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        ))}
                                        {streamers.length === 0 && <p className="text-text-secondary text-center py-8">등록된 스트리머가 없습니다</p>}
                                    </div>
                                </div>
                            )}

                            {/* ========== 사용자 관리 탭 (Server-side Auth) ========== */}
                            {activeTab === 'users' && (
                                <UserManagementPanel getAdminHeaders={() => {
                                    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
                                    return token ? { 'x-admin-token': token } : {} as Record<string, string>
                                }} />
                            )}

                            {/* ========== 멤버십 가격 탭 ========== */}
                            {activeTab === 'pricing' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">💰 멤버십 플랜 설정 (VIP)</h1>
                                    <div className="bg-bg-primary rounded-xl p-8 border border-white/10">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="text-xl font-bold text-accent-primary mb-2">VIP Membership Plan</h3>
                                                <p className="text-text-secondary">단일 VIP 플랜을 구성하고 관리합니다.</p>
                                            </div>
                                            <div className="px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg border border-accent-primary/30">
                                                Active Plan
                                            </div>
                                        </div>

                                        <div className="space-y-6 max-w-3xl">
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">플랜 이름</label>
                                                    <input
                                                        type="text"
                                                        value={pricingEdits.vip?.title || ''}
                                                        onChange={e => setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, title: e.target.value } })}
                                                        placeholder="예: VIP PLAN"
                                                        className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">설명 (짧은 소개)</label>
                                                    <input
                                                        type="text"
                                                        value={pricingEdits.vip?.description || ''}
                                                        onChange={e => setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, description: e.target.value } })}
                                                        placeholder="예: The ultimate K-Dance experience"
                                                        className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">월간 가격 ($)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-3.5 text-text-secondary">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={pricingEdits.vip?.monthlyPrice || 0}
                                                            onChange={e => setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, monthlyPrice: parseFloat(e.target.value) } })}
                                                            className="w-full pl-8 pr-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary font-mono text-lg"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">연간 가격 ($)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-3.5 text-text-secondary">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={pricingEdits.vip?.yearlyPrice || 0}
                                                            onChange={e => setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, yearlyPrice: parseFloat(e.target.value) } })}
                                                            className="w-full pl-8 pr-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary font-mono text-lg"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-white/10 pt-6">
                                                <label className="block text-sm text-text-secondary mb-4">제공 혜택 (Features)</label>
                                                <div className="space-y-3">
                                                    {(pricingEdits.vip?.features || []).map((feature, index) => (
                                                        <div key={index} className="flex gap-3">
                                                            <input
                                                                type="text"
                                                                value={feature}
                                                                onChange={e => {
                                                                    const newFeatures = [...(pricingEdits.vip?.features || [])]
                                                                    newFeatures[index] = e.target.value
                                                                    setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, features: newFeatures } })
                                                                }}
                                                                className="flex-1 px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newFeatures = (pricingEdits.vip?.features || []).filter((_, i) => i !== index)
                                                                    setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, features: newFeatures } })
                                                                }}
                                                                className="px-4 py-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/20"
                                                            >
                                                                삭제
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newFeatures = [...(pricingEdits.vip?.features || []), 'New Feature']
                                                            setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, features: newFeatures } })
                                                        }}
                                                        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-text-secondary hover:text-white hover:border-white/40 transition-colors"
                                                    >
                                                        + 혜택 추가하기
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                                            <button onClick={handleSavePricing} className="gradient-button text-black px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/40 transform hover:-translate-y-1 transition-all">
                                                💾 변경사항 적용하기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 네비게이션/링크 탭 ========== */}
                            {activeTab === 'navigation' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">🔗 메뉴 & 소셜 링크</h1>

                                    <div className="space-y-8">
                                        {/* Navigation Menu */}
                                        <div>
                                            <h3 className="font-semibold mb-4">📋 상단 메뉴</h3>
                                            <div className="space-y-2">
                                                {settings.navMenu.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-white/10">
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                onClick={() => toggleNavItem(item.id)}
                                                                className={`w-10 h-6 rounded-full transition-all ${item.visible ? 'bg-accent-primary' : 'bg-gray-600'}`}
                                                            >
                                                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${item.visible ? 'translate-x-5' : 'translate-x-1'}`} />
                                                            </button>
                                                            <span className={item.visible ? 'text-white' : 'text-text-secondary'}>{item.label}</span>
                                                        </div>
                                                        <span className="text-sm text-text-secondary font-mono">{item.href}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Social Links */}
                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">🌐 소셜 링크</h3>
                                            <div className="space-y-2">
                                                {settings.socialLinks.map(link => (
                                                    <div key={link.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-white/10">
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                onClick={() => toggleSocialLink(link.id)}
                                                                className={`w-10 h-6 rounded-full transition-all ${link.visible ? 'bg-accent-primary' : 'bg-gray-600'}`}
                                                            >
                                                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${link.visible ? 'translate-x-5' : 'translate-x-1'}`} />
                                                            </button>
                                                            <span className={link.visible ? 'text-white' : 'text-text-secondary'}>{link.platform}</span>
                                                        </div>
                                                        <span className="text-sm text-text-secondary truncate max-w-xs">{link.url}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 문의 내역 탭 ========== */}
                            {activeTab === 'inquiries' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h1 className="text-2xl font-bold">✉️ 문의 내역</h1>
                                        <span className="px-3 py-1 bg-accent-primary/20 text-accent-primary rounded-full text-sm">
                                            총 {inquiries.length}건
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {inquiries.length === 0 ? (
                                            <div className="text-center py-12 bg-bg-primary rounded-xl border border-white/10">
                                                <p className="text-text-secondary">문의 내역이 없습니다.</p>
                                            </div>
                                        ) : (
                                            inquiries.map(inquiry => (
                                                <div key={inquiry.id} className="bg-bg-primary rounded-xl p-6 border border-white/10 relative group">
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('정말 이 문의를 삭제하시겠습니까?')) {
                                                                deleteInquiry(inquiry.id)
                                                            }
                                                        }}
                                                        className="absolute top-6 right-6 p-2 text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="삭제"
                                                    >
                                                        🗑️
                                                    </button>

                                                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-text-secondary">보낸 사람:</span>
                                                            <span className="font-semibold">{inquiry.name}</span>
                                                            <span className="text-text-secondary">({inquiry.email})</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-text-secondary">날짜:</span>
                                                            <span>{new Date(inquiry.createdAt).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-text-secondary">구분:</span>
                                                            <span className="px-2 py-0.5 bg-white/5 rounded text-xs">{inquiry.subject}</span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-bg-secondary p-4 rounded-lg border border-white/5 text-sm whitespace-pre-wrap leading-relaxed">
                                                        {inquiry.message}
                                                    </div>

                                                    <div className="mt-4 flex gap-2">
                                                        <a
                                                            href={`mailto:${inquiry.email}?subject=Re: ${encodeURIComponent(inquiry.subject)}`}
                                                            className="text-xs px-3 py-1.5 bg-accent-primary text-black font-bold rounded hover:opacity-90 transition-opacity"
                                                        >
                                                            답장하기
                                                        </a>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ========== 보안 로그 탭 (v2.5.0) ========== */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-2xl font-bold flex items-center gap-2">
                                            🛡️ 실시간 보안 모니터링
                                            {isLoadingLogs && <span className="animate-spin text-sm">⏳</span>}
                                        </h1>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={fetchSecurityLogs}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-all"
                                            >
                                                새로고침
                                            </button>
                                        </div>
                                    </div>

                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-bg-primary p-5 rounded-2xl border border-white/10">
                                            <p className="text-text-secondary text-xs mb-1">총 로그 (최근 100건)</p>
                                            <p className="text-2xl font-bold">{securityLogs.length}</p>
                                        </div>
                                        <div className="bg-bg-primary p-5 rounded-2xl border border-white/10">
                                            <p className="text-red-400 text-xs mb-1">공격 의심 (ATTACK)</p>
                                            <p className="text-2xl font-bold text-red-500">
                                                {securityLogs.filter(l => l.type === 'ATTACK').length}
                                            </p>
                                        </div>
                                        <div className="bg-bg-primary p-5 rounded-2xl border border-white/10">
                                            <p className="text-amber-400 text-xs mb-1">차단 건수 (BLOCK)</p>
                                            <p className="text-2xl font-bold text-amber-500">
                                                {securityLogs.filter(l => l.type === 'BLOCK').length}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Logs Table */}
                                    <div className="bg-bg-primary rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white/5 text-text-secondary text-xs uppercase tracking-wider">
                                                        <th className="px-6 py-4 font-semibold">시간</th>
                                                        <th className="px-6 py-4 font-semibold">유형</th>
                                                        <th className="px-6 py-4 font-semibold">IP 주소</th>
                                                        <th className="px-6 py-4 font-semibold">사유 / 경로</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {securityLogs.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-12 text-center text-text-tertiary">
                                                                기록된 보안 로그가 없습니다.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        securityLogs.map((log) => (
                                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                                                <td className="px-6 py-4 text-xs font-mono text-text-secondary">
                                                                    {new Date(log.timestamp).toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === 'ATTACK' ? 'bg-red-500/20 text-red-400' :
                                                                        log.type === 'BLOCK' ? 'bg-amber-500/20 text-amber-400' :
                                                                            'bg-blue-500/20 text-blue-400'
                                                                        }`}>
                                                                        {log.type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-mono text-white">
                                                                    {log.ip}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm text-white mb-0.5">{log.reason}</div>
                                                                    <div className="text-[10px] text-text-tertiary font-mono">{log.path}</div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Info Box */}
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                        <p className="text-xs text-blue-400 leading-relaxed">
                                            💡 <strong>보안 수치 안내:</strong> 현재 API Rate Limit는 IP당 10초 내 20회 요청으로 설정되어 있습니다.
                                            초과 시 자동으로 <code>BLOCK</code> 상태로 로깅되며, 반복적인 위협은 <code>ATTACK</code>으로 분류됩니다.
                                            실제 방어 효율을 높이려면 Cloudflare WAF 설정을 권장합니다.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ========== 설정 탭 ========== */}
                            {activeTab === 'settings' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">⚙️ 사이트 설정</h1>
                                    <div className="bg-bg-primary rounded-xl p-6 border border-white/10 mb-6">
                                        <h3 className="font-semibold mb-4 text-accent-primary">📊 Google Analytics</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="ga-enabled"
                                                    checked={analyticsEdits.enabled}
                                                    onChange={e => setAnalyticsEdits({ ...analyticsEdits, enabled: e.target.checked })}
                                                    className="w-5 h-5 rounded border-white/20 bg-bg-secondary text-accent-primary focus:ring-accent-primary"
                                                />
                                                <label htmlFor="ga-enabled" className="text-sm cursor-pointer select-none">사용 설정</label>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-text-secondary mb-2">추적 ID (G-XXXXXXXXXX)</label>
                                                <input
                                                    type="text"
                                                    value={analyticsEdits.googleAnalyticsId}
                                                    onChange={e => setAnalyticsEdits({ ...analyticsEdits, googleAnalyticsId: e.target.value })}
                                                    placeholder="G-ABC1234567"
                                                    className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary font-mono"
                                                />
                                                <p className="text-xs text-text-secondary mt-1">
                                                    Google Analytics 대시보드에서 측정 ID를 확인하세요.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveAnalytics}
                                            className="px-6 py-3 bg-accent-primary text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
                                        >
                                            설정 저장하기
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ========== SEO 탭 ========== */}
                            {activeTab === 'seo' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">🔍 SEO & 마케팅 설정</h1>

                                    <div className="space-y-6">
                                        <div className="bg-bg-primary rounded-xl p-6 border border-white/10">
                                            <h3 className="font-semibold mb-4 text-accent-primary">📄 검색 엔진 파일</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Sitemap URL</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value="https://kdance.xyz/sitemap.xml"
                                                            className="flex-1 px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-secondary font-mono text-sm"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText('https://kdance.xyz/sitemap.xml')
                                                                alert('복사되었습니다!')
                                                            }}
                                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                                        >
                                                            복사
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Robots.txt URL</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value="https://kdance.xyz/robots.txt"
                                                            className="flex-1 px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-secondary font-mono text-sm"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText('https://kdance.xyz/robots.txt')
                                                                alert('복사되었습니다!')
                                                            }}
                                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                                        >
                                                            복사
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Server Migration Section */}
                                                <div className="pt-6 border-t border-white/10 mt-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-white mb-1">
                                                                Server Data Migration
                                                                {isServerSynced && <span className="ml-2 text-xs bg-green-500 text-black px-2 py-0.5 rounded-full font-bold">SYNCED</span>}
                                                            </h3>
                                                            <p className="text-xs text-text-tertiary">
                                                                Move your local data to B2 Cloud Storage for SEO and Multi-device access.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm('Upload all local data to B2 Server? This will overwrite existing server data.')) return
                                                                const success = await migrateToB2()
                                                                if (success) alert('✅ Migration Successful! Data is now on server.')
                                                                else alert('❌ Migration Failed. Check console.')
                                                            }}
                                                            disabled={isServerSynced}
                                                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isServerSynced
                                                                ? 'bg-green-500/20 text-green-500 cursor-default'
                                                                : 'bg-accent-primary hover:bg-accent-secondary text-black shadow-lg hover:scale-105'
                                                                }`}
                                                        >
                                                            {isServerSynced ? 'Running on Server' : 'Migrate to Server'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-bg-primary rounded-xl p-6 border border-white/10">
                                            <h3 className="font-semibold mb-4 text-accent-primary">✅ 소유권 확인</h3>
                                            <p className="text-sm text-text-secondary mb-4">
                                                Google/Naver에서 발급받은 확인 코드를 알려주시면 제가 즉시 반영해 드립니다.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Google Verification ID</label>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value="OoRNUH40e5AbJhU5TXIq1_LtDkDwIL4jhST76dBAoq8"
                                                        className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-secondary font-mono text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Naver Verification ID</label>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value="naver_verification_code_placeholder"
                                                        className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-secondary font-mono text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 데이터 백업 탭 ========== */}
                            {activeTab === 'data' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">💾 데이터 백업 및 마이그레이션</h1>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Export Section */}
                                        <div className="bg-bg-primary rounded-2xl p-6 border border-white/10">
                                            <div className="text-3xl mb-4">📤</div>
                                            <h3 className="text-xl font-bold mb-2">백업 데이터 내보내기</h3>
                                            <p className="text-text-secondary text-sm mb-6">
                                                현재 브라우저에 저장된 모든 스트리머와 비디오 데이터를 JSON 파일로 다운로드합니다.
                                                다른 PC나 브라우저에서 작업할 때 유용합니다.
                                            </p>
                                            <div className="space-y-4">
                                                <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs">
                                                    <div className="flex justify-between mb-2 pb-1 border-b border-white/10">
                                                        <span className="text-text-secondary">B2 Download Token:</span>
                                                        <span className={downloadToken ? 'text-green-400' : 'text-red-400'}>
                                                            {downloadToken ? 'SYNCED' : 'MISSING'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between mb-2 pb-1 border-b border-white/10">
                                                        <span className="text-text-secondary">Token Length:</span>
                                                        <span>{downloadToken ? downloadToken.length : 0} chars</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-text-secondary">Next.js Environment:</span>
                                                        <span className="text-blue-400">{process.env.NODE_ENV}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const diagnostic = {
                                                                tokenPresent: !!downloadToken,
                                                                tokenPrefix: downloadToken?.substring(0, 10),
                                                                videosCount: videos.length,
                                                                streamersCount: streamers.length,
                                                                userAgent: navigator.userAgent
                                                            }
                                                            console.log('DIAGNOSTIC DATA:', diagnostic)
                                                            alert('Diagnostic data logged to console. Please check F12.')
                                                        }}
                                                        className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-semibold"
                                                    >
                                                        🔍 Run Detailed Sync Check
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleExportData}
                                                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-semibold flex items-center justify-center gap-2"
                                            >
                                                <span>📄</span> JSON 백업 파일 다운로드
                                            </button>
                                        </div>

                                        {/* Import Section */}
                                        <div className="bg-bg-primary rounded-2xl p-6 border border-white/10">
                                            <div className="text-3xl mb-4">📥</div>
                                            <h3 className="text-xl font-bold mb-2">데이터 가져오기</h3>
                                            <p className="text-text-secondary text-sm mb-6">
                                                이전에 백업한 JSON 파일을 업로드하여 데이터를 복원하거나 통합합니다.
                                                기존 데이터와 ID가 겹칠 경우 백업 파일의 데이터로 덮어씌워집니다.
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleImportData}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="w-full py-3 bg-accent-primary/20 border border-accent-primary/30 text-accent-primary rounded-xl font-semibold flex items-center justify-center gap-2">
                                                    <span>📂</span> 백업 파일 선택하기
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ========== 시스템 복구 센터 (B2 자동 백업) ========== */}
                                    <div className="mt-8 bg-bg-primary rounded-2xl border border-white/10 overflow-hidden">
                                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    <span className="text-blue-400">🛡️</span> B2 시스템 복구 센터
                                                </h3>
                                                <p className="text-text-secondary text-sm mt-1">
                                                    저장 시마다 자동으로 생성된 최근 50개의 스냅샷 목록입니다.
                                                </p>
                                            </div>
                                            <button
                                                onClick={fetchBackups}
                                                disabled={isLoadingBackups}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                            >
                                                {isLoadingBackups ? '🔄' : '🔃 Refresh'}
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 text-text-secondary text-xs uppercase">
                                                    <tr>
                                                        <th className="px-6 py-3">파일 이름</th>
                                                        <th className="px-6 py-3">생성 일시</th>
                                                        <th className="px-6 py-3">크기 (KB)</th>
                                                        <th className="px-6 py-3 text-right">작업</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {backups.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-10 text-center text-text-secondary">
                                                                {isLoadingBackups ? '백업 목록을 불러오는 중...' : '생성된 백업이 없습니다.'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        backups.map((b) => (
                                                            <tr key={b.fileId} className="hover:bg-white/[0.02] transition-colors">
                                                                <td className="px-6 py-4 font-mono text-xs">{b.fileName}</td>
                                                                <td className="px-6 py-4 text-sm">
                                                                    {new Date(b.uploadTimestamp).toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm">
                                                                    {(b.contentLength / 1024).toFixed(1)} KB
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <button
                                                                        onClick={() => handleRestore(b.fileName)}
                                                                        disabled={isRestoring}
                                                                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                                    >
                                                                        복구하기
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-2xl">
                                        <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                                            💡 마이그레이션 팁
                                        </h4>
                                        <ul className="text-sm text-text-secondary space-y-2 list-disc list-inside">
                                            <li>로컬 기기에서 영상 업로드 후, 이 백업 파일을 사용하여 실제 서버(Production)에 동일한 데이터를 옮길 수 있습니다.</li>
                                            <li>백업 파일에는 영상 파일 자체가 포함되지 않으며, Backblaze B2에 업로드된 URL 정보가 포함됩니다.</li>
                                            <li>정기적으로 백업을 수행하여 데이터 손실을 방지하세요.</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <SecurityMonitorPanel />
                            )}
                        </div >
                    </div >
                </div >
            </div >
        </div >
    )
}

// ═══════════════════════════════════════════════════════════════════════
// Security Monitor Panel Component
// ═══════════════════════════════════════════════════════════════════════
function SecurityMonitorPanel() {
    const { getAdminHeaders } = useAuth()
    const [logs, setLogs] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterSeverity, setFilterSeverity] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>('all')

    const fetchLogs = async () => {
        setLoading(true)
        setError(null)
        try {
            const headers = getAdminHeaders()
            const res = await fetch('/api/security-logs', { headers })
            if (!res.ok) {
                if (res.status === 401) {
                    setError('인증이 필요합니다. 재로그인 해주세요.')
                } else {
                    setError('보안 로그를 불러오지 못했습니다.')
                }
                return
            }
            const data = await res.json()
            setLogs(data.logs || [])
            setStats(data.stats || null)
        } catch {
            setError('서버 연결에 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 30000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const severityColor = (s: string) => {
        switch (s) {
            case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30'
            case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
            case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
            case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30'
            default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
        }
    }

    const typeLabel = (t: string) => {
        const map: Record<string, string> = {
            'AUTH_SUCCESS': '✅ 인증 성공',
            'AUTH_FAILURE': '❌ 인증 실패',
            'UNAUTHORIZED_ACCESS': '🚫 미인증 접근',
            'FILE_UPLOAD': '📤 파일 업로드',
            'FILE_DELETE': '🗑️ 파일 삭제',
            'DB_MODIFY': '💾 DB 수정',
            'SETTINGS_MODIFY': '⚙️ 설정 변경',
            'RATE_LIMIT_HIT': '⚡ 속도 제한',
            'SUSPICIOUS_REQUEST': '🔍 의심 요청',
            'ADMIN_LOGIN': '🔐 관리자 로그인',
            'ADMIN_LOGIN_FAILED': '🔴 로그인 실패',
            'API_ERROR': '⚠️ API 오류',
        }
        return map[t] || t
    }

    const getThreatLevel = () => {
        if (!stats) return { level: '안전', color: 'text-green-400', bg: 'bg-green-500/20', icon: '🟢' }
        if (stats.criticalEvents > 5) return { level: '위험', color: 'text-red-400', bg: 'bg-red-500/20', icon: '🔴' }
        if (stats.criticalEvents > 0 || stats.blockedLast24h > 10) return { level: '주의', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '🟠' }
        if (stats.blockedLast24h > 0) return { level: '경고', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '🟡' }
        return { level: '안전', color: 'text-green-400', bg: 'bg-green-500/20', icon: '🟢' }
    }

    const filteredLogs = logs.filter(log => {
        if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false
        if (filterType !== 'all' && log.type !== filterType) return false
        return true
    })

    const threat = getThreatLevel()

    if (loading && !stats) {
        return (
            <div className="text-center py-20">
                <div className="inline-block w-10 h-10 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary">보안 로그 로딩 중...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">🛡️ 보안 모니터링</h2>
                <button
                    onClick={fetchLogs}
                    className="px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition text-sm"
                >
                    🔄 새로고침
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                    ⚠️ {error}
                </div>
            )}

            {/* Threat Level Banner */}
            <div className={`p-6 rounded-2xl border ${threat.bg} border-white/10`}>
                <div className="flex items-center gap-4">
                    <span className="text-4xl">{threat.icon}</span>
                    <div>
                        <h3 className={`text-xl font-bold ${threat.color}`}>현재 위협 수준: {threat.level}</h3>
                        <p className="text-sm text-text-secondary mt-1">
                            지난 24시간: 총 {stats?.last24h || 0}건의 이벤트, {stats?.blockedLast24h || 0}건 차단, {stats?.uniqueIPs || 0}개 고유 IP
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-bg-secondary rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-white">{stats.last24h}</div>
                        <div className="text-sm text-text-secondary mt-1">24시간 이벤트</div>
                    </div>
                    <div className="bg-bg-secondary rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-red-400">{stats.blockedLast24h}</div>
                        <div className="text-sm text-text-secondary mt-1">차단된 요청</div>
                    </div>
                    <div className="bg-bg-secondary rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-orange-400">{stats.criticalEvents}</div>
                        <div className="text-sm text-text-secondary mt-1">위험 이벤트</div>
                    </div>
                    <div className="bg-bg-secondary rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-blue-400">{stats.uniqueIPs}</div>
                        <div className="text-sm text-text-secondary mt-1">고유 IP</div>
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            {stats?.byType && (
                <div className="bg-bg-secondary rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold mb-4">📊 이벤트 유형별 통계 (24시간)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
                            <span>🚫</span>
                            <div>
                                <div className="text-sm text-red-400 font-bold">{stats.byType.unauthorized}</div>
                                <div className="text-xs text-text-secondary">미인증 접근</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg">
                            <span>⚡</span>
                            <div>
                                <div className="text-sm text-orange-400 font-bold">{stats.byType.rateLimited}</div>
                                <div className="text-xs text-text-secondary">속도 제한</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                            <span>🔴</span>
                            <div>
                                <div className="text-sm text-yellow-400 font-bold">{stats.byType.loginFailed}</div>
                                <div className="text-xs text-text-secondary">로그인 실패</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
                            <span>🗑️</span>
                            <div>
                                <div className="text-sm text-purple-400 font-bold">{stats.byType.fileDeleted}</div>
                                <div className="text-xs text-text-secondary">파일 삭제</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Blocked IPs */}
            {stats?.topBlockedIPs?.length > 0 && (
                <div className="bg-bg-secondary rounded-2xl p-6 border border-red-500/20">
                    <h3 className="text-lg font-bold mb-4 text-red-400">🚨 차단된 IP 목록 (Top 10)</h3>
                    <div className="space-y-2">
                        {stats.topBlockedIPs.map((ip: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-red-400 font-mono text-sm">{ip.ip}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-red-400 font-bold">{ip.count}회 차단</span>
                                    <span className="text-xs text-text-secondary">
                                        마지막: {new Date(ip.lastSeen).toLocaleString('ko-KR')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <select
                    value={filterSeverity}
                    onChange={e => setFilterSeverity(e.target.value)}
                    className="bg-bg-secondary border border-white/10 rounded-lg px-4 py-2 text-sm"
                >
                    <option value="all">모든 심각도</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                </select>
                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="bg-bg-secondary border border-white/10 rounded-lg px-4 py-2 text-sm"
                >
                    <option value="all">모든 유형</option>
                    <option value="UNAUTHORIZED_ACCESS">미인증 접근</option>
                    <option value="RATE_LIMIT_HIT">속도 제한</option>
                    <option value="ADMIN_LOGIN_FAILED">로그인 실패</option>
                    <option value="FILE_DELETE">파일 삭제</option>
                    <option value="FILE_UPLOAD">파일 업로드</option>
                    <option value="DB_MODIFY">DB 수정</option>
                    <option value="ADMIN_LOGIN">관리자 로그인</option>
                </select>
                <span className="text-sm text-text-secondary">
                    {filteredLogs.length}건 표시
                </span>
            </div>

            {/* Event Log Table */}
            <div className="bg-bg-secondary rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold">📋 보안 이벤트 로그</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary">
                            <span className="text-4xl block mb-3">🛡️</span>
                            <p>아직 기록된 보안 이벤트가 없습니다.</p>
                            <p className="text-xs mt-2">ADMIN_API_SECRET 환경 변수를 설정하면 보안 로깅이 활성화됩니다.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 sticky top-0">
                                <tr>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">시간</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">유형</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">심각도</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">IP</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">내용</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">차단</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLogs.slice(0, 100).map((log: any) => (
                                    <tr key={log.id} className={`hover:bg-white/5 ${log.blocked ? 'bg-red-500/5' : ''}`}>
                                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">{typeLabel(log.type)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${severityColor(log.severity)}`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{log.ip}</td>
                                        <td className="px-4 py-3 text-text-secondary max-w-xs truncate" title={log.details}>{log.details}</td>
                                        <td className="px-4 py-3">
                                            {log.blocked ? <span className="text-red-400 font-bold">차단</span> : <span className="text-green-400">허용</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Setup Guide */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
                <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">🔑 보안 설정 가이드</h3>
                <div className="text-sm text-text-secondary space-y-3">
                    <p>다음 환경 변수를 Vercel 프로젝트 설정에 추가해주세요:</p>
                    <div className="bg-black/40 rounded-lg p-4 font-mono text-xs space-y-1">
                        <p><span className="text-green-400">ADMIN_API_SECRET</span>=&lt;임의의 긴 문자열&gt;</p>
                        <p><span className="text-green-400">ADMIN_EMAIL</span>=ynast21@gmail.com</p>
                        <p><span className="text-green-400">ADMIN_PASSWORD_HASH</span>=&lt;SHA-256 해시값&gt;</p>
                    </div>
                    <p className="text-yellow-400">⚠️ ADMIN_API_SECRET을 설정하지 않으면 모든 보호 API가 인증 없이 요청을 거부합니다.</p>
                    <p>설정 후 재배포하면 모든 관리자 API에 자동으로 보안이 적용됩니다.</p>
                </div>
            </div>
        </div>
    )
}
