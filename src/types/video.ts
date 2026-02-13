// Video types and interfaces for StreamVault

export type AccessLevel = 'basic' | 'vip' | 'premium'

export interface VideoAccess {
    streaming: AccessLevel[]
    download: AccessLevel[]
    quality: {
        basic: 'SD' | 'HD' | '4K'
        vip: 'SD' | 'HD' | '4K'
        premium: 'SD' | 'HD' | '4K'
    }
}

export interface Video {
    id: string
    title: string
    description?: string
    creator: string
    category?: string
    duration: string
    size: string
    views: number
    likes: number
    uploadDate: string
    thumbnailUrl?: string
    previewUrls?: string[]
    videoUrl?: string
    access: VideoAccess
    status: 'draft' | 'published' | 'archived'
    tags?: string[]
}

export interface User {
    id: string
    email: string
    name: string
    membership: AccessLevel
    subscriptionStart?: string
    subscriptionEnd?: string
    downloadedVideos?: string[]
    watchHistory?: string[]
}

export interface Creator {
    id: string
    name: string
    bio?: string
    avatarUrl?: string
    subscribers: number
    totalViews: number
    videos: string[]
    socialLinks?: {
        twitter?: string
        instagram?: string
        youtube?: string
    }
}

// Helper functions
export function canStream(userLevel: AccessLevel, videoAccess: VideoAccess): boolean {
    return videoAccess.streaming.includes(userLevel)
}

export function canDownload(userLevel: AccessLevel, videoAccess: VideoAccess): boolean {
    return videoAccess.download.includes(userLevel)
}

export function getMaxQuality(userLevel: AccessLevel, videoAccess: VideoAccess): 'SD' | 'HD' | '4K' {
    return videoAccess.quality[userLevel]
}

export function formatViews(views: number): string {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M'
    }
    if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K'
    }
    return views.toString()
}

export function formatFileSize(bytes: number): string {
    if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + ' GB'
    }
    if (bytes >= 1048576) {
        return (bytes / 1048576).toFixed(2) + ' MB'
    }
    return (bytes / 1024).toFixed(2) + ' KB'
}
