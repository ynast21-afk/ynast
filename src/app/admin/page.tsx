'use client'

import { useState } from 'react'
import Link from 'next/link'

// Sample video data for management
const sampleVideos = [
    {
        id: '1',
        title: 'Cyberpunk City Night Walk 8K',
        creator: 'NeonWalker',
        size: '2.4 GB',
        duration: '12:45',
        uploadDate: '2026-02-05',
        views: 1234,
        access: { streaming: ['vip', 'premium'], download: ['premium'] },
        status: 'published'
    },
    {
        id: '2',
        title: 'Digital Art Masterclass',
        creator: 'ArtistPro',
        size: '1.8 GB',
        duration: '08:32',
        uploadDate: '2026-02-04',
        views: 3567,
        access: { streaming: ['basic', 'vip', 'premium'], download: ['vip', 'premium'] },
        status: 'published'
    },
    {
        id: '3',
        title: 'Synthwave Mix 2024',
        creator: 'LofiGirl',
        size: '850 MB',
        duration: '15:20',
        uploadDate: '2026-02-03',
        views: 890,
        access: { streaming: ['premium'], download: ['premium'] },
        status: 'draft'
    },
]

type AccessLevel = 'basic' | 'vip' | 'premium'

interface VideoAccess {
    streaming: AccessLevel[]
    download: AccessLevel[]
}

export default function AdminPage() {
    const [videos, setVideos] = useState(sampleVideos)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [editingVideo, setEditingVideo] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'videos' | 'upload' | 'stats'>('videos')

    const toggleAccess = (videoId: string, type: 'streaming' | 'download', level: AccessLevel) => {
        setVideos(videos.map(video => {
            if (video.id === videoId) {
                const currentAccess = video.access[type]
                const newAccess = currentAccess.includes(level)
                    ? currentAccess.filter(l => l !== level)
                    : [...currentAccess, level]
                return {
                    ...video,
                    access: { ...video.access, [type]: newAccess }
                }
            }
            return video
        }))
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Admin Header */}
            <header className="bg-bg-secondary border-b border-white/10 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-2xl font-bold text-accent-primary">
                            StreamVault
                        </Link>
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                            ADMIN
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-text-secondary text-sm">관리자님 환영합니다</span>
                        <Link href="/" className="text-sm text-accent-primary hover:underline">
                            사이트로 돌아가기
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Tab Navigation */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'videos'
                                ? 'bg-accent-primary text-black'
                                : 'bg-bg-secondary hover:bg-bg-tertiary'
                            }`}
                    >
                        📹 영상 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'upload'
                                ? 'bg-accent-primary text-black'
                                : 'bg-bg-secondary hover:bg-bg-tertiary'
                            }`}
                    >
                        📤 영상 업로드
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'stats'
                                ? 'bg-accent-primary text-black'
                                : 'bg-bg-secondary hover:bg-bg-tertiary'
                            }`}
                    >
                        📊 통계
                    </button>
                </div>

                {/* Videos Management Tab */}
                {activeTab === 'videos' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold">영상 관리</h1>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className="gradient-button text-black px-6 py-3 rounded-lg font-semibold"
                            >
                                + 새 영상 업로드
                            </button>
                        </div>

                        {/* Video List */}
                        <div className="space-y-4">
                            {videos.map((video) => (
                                <div
                                    key={video.id}
                                    className="bg-bg-secondary rounded-xl p-6 border border-white/10"
                                >
                                    <div className="flex gap-6">
                                        {/* Thumbnail Placeholder */}
                                        <div className="w-48 h-28 bg-gradient-to-br from-purple-900 to-cyan-900 rounded-lg flex-shrink-0 flex items-center justify-center">
                                            <span className="text-4xl">🎬</span>
                                        </div>

                                        {/* Video Info */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="text-lg font-semibold">{video.title}</h3>
                                                    <p className="text-sm text-text-secondary">@{video.creator}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${video.status === 'published'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {video.status === 'published' ? '게시됨' : '초안'}
                                                </span>
                                            </div>

                                            <div className="flex gap-6 text-sm text-text-secondary mb-4">
                                                <span>⏱ {video.duration}</span>
                                                <span>💾 {video.size}</span>
                                                <span>👁 {video.views.toLocaleString()} views</span>
                                                <span>📅 {video.uploadDate}</span>
                                            </div>

                                            {/* Access Control */}
                                            <div className="bg-bg-tertiary rounded-lg p-4">
                                                <h4 className="text-sm font-semibold mb-3">🔐 접근 권한 설정</h4>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Streaming Access */}
                                                    <div>
                                                        <p className="text-xs text-text-secondary mb-2">📺 스트리밍 허용</p>
                                                        <div className="flex gap-2">
                                                            {(['basic', 'vip', 'premium'] as AccessLevel[]).map((level) => (
                                                                <button
                                                                    key={level}
                                                                    onClick={() => toggleAccess(video.id, 'streaming', level)}
                                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${video.access.streaming.includes(level)
                                                                            ? level === 'premium'
                                                                                ? 'bg-accent-secondary text-white'
                                                                                : level === 'vip'
                                                                                    ? 'bg-accent-primary text-black'
                                                                                    : 'bg-blue-500 text-white'
                                                                            : 'bg-bg-secondary text-text-secondary border border-white/20'
                                                                        }`}
                                                                >
                                                                    {level.toUpperCase()}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Download Access */}
                                                    <div>
                                                        <p className="text-xs text-text-secondary mb-2">📥 다운로드 허용</p>
                                                        <div className="flex gap-2">
                                                            {(['basic', 'vip', 'premium'] as AccessLevel[]).map((level) => (
                                                                <button
                                                                    key={level}
                                                                    onClick={() => toggleAccess(video.id, 'download', level)}
                                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${video.access.download.includes(level)
                                                                            ? level === 'premium'
                                                                                ? 'bg-accent-secondary text-white'
                                                                                : level === 'vip'
                                                                                    ? 'bg-accent-primary text-black'
                                                                                    : 'bg-blue-500 text-white'
                                                                            : 'bg-bg-secondary text-text-secondary border border-white/20'
                                                                        }`}
                                                                >
                                                                    {level.toUpperCase()}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2">
                                            <button className="px-4 py-2 bg-bg-tertiary rounded-lg text-sm hover:bg-white/10 transition-colors">
                                                ✏️ 수정
                                            </button>
                                            <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
                                                🗑️ 삭제
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-6">새 영상 업로드</h1>

                        <div className="bg-bg-secondary rounded-xl p-8 border border-white/10">
                            {/* Drag & Drop Zone */}
                            <div className="border-2 border-dashed border-accent-primary/50 rounded-xl p-12 text-center mb-8 hover:border-accent-primary hover:bg-accent-primary/5 transition-all cursor-pointer">
                                <div className="text-6xl mb-4">📤</div>
                                <h3 className="text-xl font-semibold mb-2">영상 파일을 드래그하거나 클릭하세요</h3>
                                <p className="text-text-secondary mb-4">MP4, MOV, AVI, MKV 지원 • 최대 10GB</p>
                                <input type="file" className="hidden" accept="video/*" />
                                <button className="gradient-button text-black px-8 py-3 rounded-lg font-semibold">
                                    파일 선택
                                </button>
                            </div>

                            {/* Video Details Form */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">영상 제목 *</label>
                                    <input
                                        type="text"
                                        placeholder="영상 제목을 입력하세요"
                                        className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-primary transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">설명</label>
                                    <textarea
                                        placeholder="영상에 대한 설명을 입력하세요"
                                        rows={4}
                                        className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-primary transition-colors resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">크리에이터</label>
                                        <input
                                            type="text"
                                            placeholder="크리에이터 이름"
                                            className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-primary transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">카테고리</label>
                                        <select className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-primary transition-colors">
                                            <option>선택하세요</option>
                                            <option>Music</option>
                                            <option>Dance</option>
                                            <option>Gaming</option>
                                            <option>Tech</option>
                                            <option>Lifestyle</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Access Control */}
                                <div className="bg-bg-tertiary rounded-lg p-6">
                                    <h4 className="font-semibold mb-4">🔐 접근 권한 설정</h4>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-text-secondary mb-3">📺 스트리밍 허용 등급</p>
                                            <div className="space-y-2">
                                                {['Basic (무료)', 'VIP', 'Premium+'].map((level) => (
                                                    <label key={level} className="flex items-center gap-3 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 accent-accent-primary" />
                                                        <span>{level}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-secondary mb-3">📥 다운로드 허용 등급</p>
                                            <div className="space-y-2">
                                                {['Basic (무료)', 'VIP', 'Premium+'].map((level) => (
                                                    <label key={level} className="flex items-center gap-3 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 accent-accent-primary" />
                                                        <span>{level}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Thumbnail */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">썸네일 이미지</label>
                                    <div className="flex gap-4">
                                        <div className="w-48 h-28 bg-bg-tertiary border border-dashed border-white/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-accent-primary transition-colors">
                                            <span className="text-text-secondary">+ 업로드</span>
                                        </div>
                                        <p className="text-sm text-text-secondary">
                                            권장 크기: 1280x720px<br />
                                            지원 형식: JPG, PNG, WebP
                                        </p>
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="flex gap-4 pt-4">
                                    <button className="gradient-button text-black px-8 py-3 rounded-lg font-semibold">
                                        📤 업로드 및 게시
                                    </button>
                                    <button className="px-8 py-3 bg-bg-tertiary rounded-lg font-semibold hover:bg-white/10 transition-colors">
                                        💾 초안으로 저장
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Tab */}
                {activeTab === 'stats' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-6">📊 통계 대시보드</h1>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                <div className="text-3xl mb-2">🎬</div>
                                <div className="text-3xl font-bold text-accent-primary">1,247</div>
                                <div className="text-sm text-text-secondary">총 영상 수</div>
                            </div>
                            <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                <div className="text-3xl mb-2">👥</div>
                                <div className="text-3xl font-bold text-accent-primary">8,432</div>
                                <div className="text-sm text-text-secondary">VIP 회원</div>
                            </div>
                            <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                <div className="text-3xl mb-2">👁</div>
                                <div className="text-3xl font-bold text-accent-primary">2.4M</div>
                                <div className="text-sm text-text-secondary">총 조회수</div>
                            </div>
                            <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                <div className="text-3xl mb-2">💰</div>
                                <div className="text-3xl font-bold text-accent-secondary">$24,580</div>
                                <div className="text-sm text-text-secondary">이번 달 수익</div>
                            </div>
                        </div>

                        {/* Storage Usage */}
                        <div className="bg-bg-secondary rounded-xl p-6 border border-white/10 mb-6">
                            <h3 className="font-semibold mb-4">💾 스토리지 사용량</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-4 bg-bg-tertiary rounded-full overflow-hidden">
                                    <div className="w-[45%] h-full bg-gradient-to-r from-accent-primary to-accent-secondary" />
                                </div>
                                <span className="text-sm">22.5 TB / 50 TB</span>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                            <h3 className="font-semibold mb-4">📋 최근 활동</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-4 py-2 border-b border-white/5">
                                    <span className="text-accent-primary">📤</span>
                                    <span className="flex-1">새 영상 업로드: "Cyberpunk City 8K"</span>
                                    <span className="text-sm text-text-secondary">2시간 전</span>
                                </div>
                                <div className="flex items-center gap-4 py-2 border-b border-white/5">
                                    <span className="text-green-400">👤</span>
                                    <span className="flex-1">새 VIP 가입: user@example.com</span>
                                    <span className="text-sm text-text-secondary">3시간 전</span>
                                </div>
                                <div className="flex items-center gap-4 py-2 border-b border-white/5">
                                    <span className="text-yellow-400">⚙️</span>
                                    <span className="flex-1">영상 권한 변경: "Dance Mix Vol.3"</span>
                                    <span className="text-sm text-text-secondary">5시간 전</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
