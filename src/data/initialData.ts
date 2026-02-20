export interface Streamer {
    id: string
    name: string
    koreanName?: string
    profileImage?: string
    videoCount: number
    followers: number // Real follower count
    gradient: string
    createdAt: string
}

export interface Video {
    id: string
    title: string
    streamerId: string
    streamerName: string
    views: number
    likes: number
    duration: string
    isVip: boolean
    minStreamingLevel?: string // 'guest' | 'basic' | 'vip' | 'premium'
    minDownloadLevel?: string  // 'guest' | 'basic' | 'vip' | 'premium'
    gradient: string
    uploadedAt: string
    createdAt: string
    videoUrl?: string
    thumbnailUrl?: string
    previewUrls?: string[]
    tags?: string[]
    orientation?: 'horizontal' | 'vertical'
}

export const initialStreamers: Streamer[] = [
    { id: '1', name: 'golaniyuie0', koreanName: '고라니', videoCount: 14, followers: 0, gradient: 'from-pink-700 to-purple-700', createdAt: '2026-01-01' },
    { id: '2', name: 'm0m099', koreanName: '모모', videoCount: 13, followers: 0, gradient: 'from-blue-700 to-indigo-700', createdAt: '2026-01-02' },
    { id: '3', name: 'rud9281', koreanName: '루디', videoCount: 12, followers: 0, gradient: 'from-cyan-700 to-teal-700', createdAt: '2026-01-03' },
    { id: '4', name: 'eunyoung1238', koreanName: '은영', videoCount: 8, followers: 0, gradient: 'from-amber-700 to-orange-700', createdAt: '2026-01-04' },
    { id: '5', name: 'smmms2002', koreanName: '썸썸', videoCount: 7, followers: 0, gradient: 'from-rose-700 to-pink-700', createdAt: '2026-01-05' },
    { id: '6', name: 'sonming52', koreanName: '손밍', videoCount: 7, followers: 0, gradient: 'from-violet-700 to-purple-700', createdAt: '2026-01-06' },
    { id: '7', name: 'haumpah', koreanName: '하움파', videoCount: 6, followers: 0, gradient: 'from-emerald-700 to-green-700', createdAt: '2026-01-07' },
    { id: '8', name: 'aiswi2208', koreanName: '아이스위', videoCount: 6, followers: 0, gradient: 'from-slate-700 to-gray-700', createdAt: '2026-01-08' },
    { id: '9', name: 'bumzi98', koreanName: '범지', videoCount: 6, followers: 0, gradient: 'from-orange-700 to-red-700', createdAt: '2026-01-09' },
    { id: '10', name: 'dmsdms1247', koreanName: '은은', videoCount: 5, followers: 0, gradient: 'from-teal-700 to-cyan-700', createdAt: '2026-01-10' },
    { id: '11', name: 'e000e77', koreanName: '이공', videoCount: 5, followers: 0, gradient: 'from-fuchsia-700 to-pink-700', createdAt: '2026-01-11' },
    { id: '12', name: 'milkkim123', koreanName: '밀크킴', videoCount: 5, followers: 0, gradient: 'from-indigo-700 to-blue-700', createdAt: '2026-01-12' },
]

export const initialVideos: Video[] = [
    { id: '1', title: '2026-02-06_Dance Cover - NewJeans', streamerId: '1', streamerName: 'golaniyuie0', views: 2800, likes: 12, duration: '21:36', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-purple-700 to-pink-700', uploadedAt: '1d ago', createdAt: '2026-02-06', videoUrl: 'https://f005.backblazeb2.com/file/yna-backup/test-preview-1.mp4', thumbnailUrl: 'https://f005.backblazeb2.com/file/yna-backup/thumbnails/test-thumbnail-1.jpg' },
    { id: '2', title: '2026-02-06_K-Pop Tutorial Vol.1', streamerId: '2', streamerName: 'm0m099', views: 3400, likes: 12, duration: '10:03', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-indigo-700 to-blue-700', uploadedAt: '1d ago', createdAt: '2026-02-06', videoUrl: 'https://f005.backblazeb2.com/file/yna-backup/test-preview-2.mp4' },
    { id: '3', title: '2026-02-05_Freestyle Session', streamerId: '3', streamerName: 'rud9281', views: 2400, likes: 13, duration: '44:09', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-cyan-700 to-teal-700', uploadedAt: '1d ago', createdAt: '2026-02-05', videoUrl: 'https://f005.backblazeb2.com/file/yna-backup/test-preview-3.mp4' },
    { id: '4', title: '2026-02-05_aespa Choreography', streamerId: '4', streamerName: 'eunyoung1238', views: 2800, likes: 13, duration: '19:08', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-amber-700 to-orange-700', uploadedAt: '1d ago', createdAt: '2026-02-05' },
    { id: '5', title: '2026-02-04_TWICE Dance Practice', streamerId: '5', streamerName: 'smmms2002', views: 3500, likes: 11, duration: '8:22', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-rose-700 to-pink-700', uploadedAt: '2d ago', createdAt: '2026-02-04' },
    { id: '6', title: '2026-02-04_IVE Performance', streamerId: '6', streamerName: 'sonming52', views: 1700, likes: 11, duration: '21:19', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-violet-700 to-purple-700', uploadedAt: '2d ago', createdAt: '2026-02-04' },
    { id: '7', title: '2026-02-03_Dance Battle Highlights', streamerId: '7', streamerName: 'haumpah', views: 2400, likes: 17, duration: '14:49', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-emerald-700 to-green-700', uploadedAt: '3d ago', createdAt: '2026-02-03' },
    { id: '8', title: '2026-02-03_LE SSERAFIM Cover', streamerId: '8', streamerName: 'aiswi2208', views: 1700, likes: 9, duration: '45:01', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-blue-700 to-indigo-700', uploadedAt: '3d ago', createdAt: '2026-02-03' },
    { id: '9', title: '2026-02-02_Blackpink Dance Tutorial', streamerId: '9', streamerName: 'bumzi98', views: 1100, likes: 14, duration: '40:56', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-pink-700 to-red-700', uploadedAt: '4d ago', createdAt: '2026-02-02' },
    { id: '10', title: 'Street Dance Basics', streamerId: '10', streamerName: 'dmsdms1247', views: 1100, likes: 14, duration: '45:02', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-slate-700 to-gray-700', uploadedAt: '4d ago', createdAt: '2026-02-02' },
    { id: '11', title: 'Hip Hop Foundations', streamerId: '11', streamerName: 'e000e77', views: 933, likes: 14, duration: '1:08:54', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-orange-700 to-amber-700', uploadedAt: '5d ago', createdAt: '2026-02-01' },
    { id: '12', title: 'K-Pop Random Play', streamerId: '12', streamerName: 'milkkim123', views: 1200, likes: 13, duration: '20:31', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-teal-700 to-cyan-700', uploadedAt: '5d ago', createdAt: '2026-02-01' },
    { id: '13', title: 'Dance Challenge', streamerId: '1', streamerName: 'golaniyuie0', views: 1000, likes: 13, duration: '43:40', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-fuchsia-700 to-pink-700', uploadedAt: '6d ago', createdAt: '2026-01-31' },
    { id: '14', title: 'BTS Choreography', streamerId: '2', streamerName: 'm0m099', views: 1200, likes: 13, duration: '27:12', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-purple-700 to-violet-700', uploadedAt: '6d ago', createdAt: '2026-01-31' },
    { id: '15', title: 'Dance Practice Room', streamerId: '3', streamerName: 'rud9281', views: 779, likes: 14, duration: '25:45', isVip: true, minStreamingLevel: 'vip', minDownloadLevel: 'vip', gradient: 'from-indigo-700 to-blue-700', uploadedAt: '1w ago', createdAt: '2026-01-30' },
]
