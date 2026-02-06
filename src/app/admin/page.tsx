'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useStreamers, Streamer, Video } from '@/contexts/StreamerContext'
import { useAuth } from '@/contexts/AuthContext'

type AccessLevel = 'basic' | 'vip' | 'premium'

const gradientOptions = [
    { value: 'from-pink-900 to-purple-900', label: '핑크-퍼플' },
    { value: 'from-blue-900 to-indigo-900', label: '블루-인디고' },
    { value: 'from-cyan-900 to-teal-900', label: '시안-틸' },
    { value: 'from-amber-900 to-orange-900', label: '앰버-오렌지' },
    { value: 'from-rose-900 to-pink-900', label: '로즈-핑크' },
    { value: 'from-violet-900 to-purple-900', label: '바이올렛-퍼플' },
    { value: 'from-emerald-900 to-green-900', label: '에메랄드-그린' },
]

export default function AdminPage() {
    const { user, isLoading, isAdmin } = useAuth()
    const { streamers, videos, addStreamer, removeStreamer, addVideo, removeVideo } = useStreamers()
    const [activeTab, setActiveTab] = useState<'videos' | 'upload' | 'streamers' | 'stats'>('videos')

    // New streamer form
    const [newStreamer, setNewStreamer] = useState({
        name: '',
        koreanName: '',
        gradient: gradientOptions[0].value,
    })

    // New video form
    const [newVideo, setNewVideo] = useState({
        title: '',
        streamerId: '',
        duration: '',
        isVip: true,
    })

    // Delete confirmation modal
    const [deleteModal, setDeleteModal] = useState<{ type: 'streamer' | 'video', id: string, name: string } | null>(null)

    const handleAddStreamer = () => {
        if (!newStreamer.name.trim()) return
        addStreamer({
            name: newStreamer.name.trim(),
            koreanName: newStreamer.koreanName.trim() || undefined,
            gradient: newStreamer.gradient,
        })
        setNewStreamer({ name: '', koreanName: '', gradient: gradientOptions[0].value })
    }

    const handleAddVideo = () => {
        if (!newVideo.title.trim() || !newVideo.streamerId || !newVideo.duration.trim()) return
        const streamer = streamers.find(s => s.id === newVideo.streamerId)
        if (!streamer) return

        addVideo({
            title: newVideo.title.trim(),
            streamerId: newVideo.streamerId,
            streamerName: streamer.name,
            duration: newVideo.duration.trim(),
            isVip: newVideo.isVip,
            views: '0',
            likes: '0',
            gradient: streamer.gradient,
            uploadedAt: 'Just now',
        })
        setNewVideo({ title: '', streamerId: '', duration: '', isVip: true })
        setActiveTab('videos')
    }

    const handleConfirmDelete = () => {
        if (!deleteModal) return
        if (deleteModal.type === 'streamer') {
            removeStreamer(deleteModal.id)
        } else {
            removeVideo(deleteModal.id)
        }
        setDeleteModal(null)
    }

    // 로딩 중
    if (isLoading) {
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
                    <p className="text-text-secondary mb-6">
                        관리자 페이지에 접근하려면 먼저 로그인해주세요.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block gradient-button text-black px-8 py-3 rounded-lg font-semibold"
                    >
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
                    <p className="text-text-secondary mb-6">
                        관리자만 이 페이지에 접근할 수 있습니다.
                    </p>
                    <p className="text-sm text-text-secondary mb-6">
                        현재 로그인: <span className="text-white">{user.email}</span>
                    </p>
                    <Link
                        href="/"
                        className="inline-block gradient-button text-black px-8 py-3 rounded-lg font-semibold"
                    >
                        홈으로 돌아가기
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div className="bg-bg-secondary rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-red-400">⚠️ 삭제 확인</h3>
                        <p className="text-text-secondary mb-6">
                            <span className="text-white font-semibold">"{deleteModal.name}"</span>
                            {deleteModal.type === 'streamer'
                                ? '를 삭제하시겠습니까? 해당 스트리머의 모든 비디오도 함께 삭제됩니다.'
                                : '를 삭제하시겠습니까?'
                            }
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                            >
                                삭제
                            </button>
                            <button
                                onClick={() => setDeleteModal(null)}
                                className="flex-1 px-4 py-3 bg-bg-tertiary rounded-lg font-medium hover:bg-white/10 transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Header */}
            <header className="bg-bg-secondary border-b border-white/10 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-2xl font-bold text-accent-primary">
                            kStreamer dance
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
                <div className="flex gap-4 mb-8 flex-wrap">
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
                        onClick={() => setActiveTab('streamers')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'streamers'
                            ? 'bg-accent-primary text-black'
                            : 'bg-bg-secondary hover:bg-bg-tertiary'
                            }`}
                    >
                        👥 스트리머 관리
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
                            <h1 className="text-2xl font-bold">영상 관리 ({videos.length}개)</h1>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className="gradient-button text-black px-6 py-3 rounded-lg font-semibold"
                            >
                                + 새 영상 업로드
                            </button>
                        </div>

                        {videos.length === 0 ? (
                            <div className="text-center py-16 bg-bg-secondary rounded-xl">
                                <span className="text-6xl mb-4 block">📹</span>
                                <h3 className="text-xl font-bold mb-2">영상이 없습니다</h3>
                                <p className="text-text-secondary mb-4">첫 번째 영상을 업로드해보세요!</p>
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className="gradient-button text-black px-6 py-3 rounded-lg font-semibold"
                                >
                                    영상 업로드하기
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {videos.map((video) => (
                                    <div
                                        key={video.id}
                                        className="bg-bg-secondary rounded-xl p-6 border border-white/10"
                                    >
                                        <div className="flex gap-6">
                                            {/* Thumbnail */}
                                            <div className={`w-48 h-28 bg-gradient-to-br ${video.gradient} rounded-lg flex-shrink-0 flex items-center justify-center`}>
                                                {video.isVip && (
                                                    <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded">
                                                        VIP
                                                    </span>
                                                )}
                                            </div>

                                            {/* Video Info */}
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold mb-1">{video.title}</h3>
                                                <Link
                                                    href={`/actors/${video.streamerId}`}
                                                    className="text-sm text-accent-primary hover:underline"
                                                >
                                                    @{video.streamerName}
                                                </Link>
                                                <div className="flex gap-6 text-sm text-text-secondary mt-2">
                                                    <span>⏱ {video.duration}</span>
                                                    <span>👁 {video.views} views</span>
                                                    <span>❤️ {video.likes} likes</span>
                                                    <span>📅 {video.uploadedAt}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => setDeleteModal({ type: 'video', id: video.id, name: video.title })}
                                                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                                                >
                                                    🗑️ 삭제
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-6">새 영상 업로드</h1>

                        <div className="bg-bg-secondary rounded-xl p-8 border border-white/10">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">영상 제목 *</label>
                                    <input
                                        type="text"
                                        value={newVideo.title}
                                        onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                                        placeholder="예: 2026-02-06_Dance Cover - NewJeans"
                                        className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-primary transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">스트리머 선택 *</label>
                                        <select
                                            value={newVideo.streamerId}
                                            onChange={(e) => setNewVideo({ ...newVideo, streamerId: e.target.value })}
                                            className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-primary transition-colors"
                                        >
                                            <option value="">스트리머를 선택하세요</option>
                                            {streamers.map((streamer) => (
                                                <option key={streamer.id} value={streamer.id}>
                                                    {streamer.name} {streamer.koreanName && `(${streamer.koreanName})`}
                                                </option>
                                            ))}
                                        </select>
                                        {streamers.length === 0 && (
                                            <p className="text-yellow-400 text-sm mt-2">
                                                ⚠️ 스트리머가 없습니다. 먼저 스트리머를 등록해주세요.
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">재생 시간 *</label>
                                        <input
                                            type="text"
                                            value={newVideo.duration}
                                            onChange={(e) => setNewVideo({ ...newVideo, duration: e.target.value })}
                                            placeholder="예: 21:36"
                                            className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-primary transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newVideo.isVip}
                                            onChange={(e) => setNewVideo({ ...newVideo, isVip: e.target.checked })}
                                            className="w-5 h-5 accent-accent-primary"
                                        />
                                        <span className="font-medium">VIP 전용 영상</span>
                                    </label>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={handleAddVideo}
                                        disabled={!newVideo.title || !newVideo.streamerId || !newVideo.duration}
                                        className="gradient-button text-black px-8 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        📤 업로드
                                    </button>
                                    <button
                                        onClick={() => setNewVideo({ title: '', streamerId: '', duration: '', isVip: true })}
                                        className="px-8 py-3 bg-bg-tertiary rounded-lg font-semibold hover:bg-white/10 transition-colors"
                                    >
                                        초기화
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Streamers Management Tab */}
                {activeTab === 'streamers' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-6">👥 스트리머 관리 ({streamers.length}명)</h1>

                        {/* Add New Streamer Form */}
                        <div className="bg-bg-secondary rounded-xl p-6 border border-white/10 mb-8">
                            <h3 className="font-semibold mb-4">➕ 새 스트리머 등록</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">영문 이름 *</label>
                                    <input
                                        type="text"
                                        value={newStreamer.name}
                                        onChange={(e) => setNewStreamer({ ...newStreamer, name: e.target.value })}
                                        placeholder="golaniyuie0"
                                        className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-primary transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">한국어 이름</label>
                                    <input
                                        type="text"
                                        value={newStreamer.koreanName}
                                        onChange={(e) => setNewStreamer({ ...newStreamer, koreanName: e.target.value })}
                                        placeholder="고라니"
                                        className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-primary transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">프로필 색상</label>
                                    <select
                                        value={newStreamer.gradient}
                                        onChange={(e) => setNewStreamer({ ...newStreamer, gradient: e.target.value })}
                                        className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-primary transition-colors"
                                    >
                                        {gradientOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleAddStreamer}
                                        disabled={!newStreamer.name.trim()}
                                        className="w-full gradient-button text-black px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        등록
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Streamers List */}
                        {streamers.length === 0 ? (
                            <div className="text-center py-16 bg-bg-secondary rounded-xl">
                                <span className="text-6xl mb-4 block">👥</span>
                                <h3 className="text-xl font-bold mb-2">스트리머가 없습니다</h3>
                                <p className="text-text-secondary">위 폼에서 첫 번째 스트리머를 등록해보세요!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {streamers.map((streamer) => (
                                    <div
                                        key={streamer.id}
                                        className="bg-bg-secondary rounded-xl p-4 border border-white/10 flex items-center gap-4"
                                    >
                                        {/* Profile */}
                                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${streamer.gradient} flex items-center justify-center flex-shrink-0`}>
                                            <span className="text-2xl">👤</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate">{streamer.name}</h3>
                                            {streamer.koreanName && (
                                                <p className="text-sm text-text-secondary">{streamer.koreanName}</p>
                                            )}
                                            <Link
                                                href={`/actors/${streamer.id}`}
                                                className="text-xs text-accent-primary hover:underline"
                                            >
                                                🎬 {streamer.videoCount}개 영상 보기
                                            </Link>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => setDeleteModal({ type: 'streamer', id: streamer.id, name: streamer.name })}
                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                            title="스트리머 삭제"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Stats Tab */}
                {activeTab === 'stats' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-6">📊 통계 대시보드</h1>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                <div className="text-3xl mb-2">🎬</div>
                                <div className="text-3xl font-bold text-accent-primary">{videos.length}</div>
                                <div className="text-sm text-text-secondary">총 영상 수</div>
                            </div>
                            <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                <div className="text-3xl mb-2">👥</div>
                                <div className="text-3xl font-bold text-accent-primary">{streamers.length}</div>
                                <div className="text-sm text-text-secondary">등록된 스트리머</div>
                            </div>
                            <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                <div className="text-3xl mb-2">🏆</div>
                                <div className="text-3xl font-bold text-accent-primary">
                                    {videos.filter(v => v.isVip).length}
                                </div>
                                <div className="text-sm text-text-secondary">VIP 영상</div>
                            </div>
                            <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                <div className="text-3xl mb-2">🎯</div>
                                <div className="text-3xl font-bold text-accent-secondary">
                                    {streamers.length > 0
                                        ? Math.round(videos.length / streamers.length * 10) / 10
                                        : 0
                                    }
                                </div>
                                <div className="text-sm text-text-secondary">평균 영상/스트리머</div>
                            </div>
                        </div>

                        {/* Top Streamers */}
                        <div className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                            <h3 className="font-semibold mb-4">🏆 인기 스트리머 TOP 5</h3>
                            <div className="space-y-3">
                                {[...streamers]
                                    .sort((a, b) => b.videoCount - a.videoCount)
                                    .slice(0, 5)
                                    .map((streamer, index) => (
                                        <div key={streamer.id} className="flex items-center gap-4 py-2 border-b border-white/5">
                                            <span className="w-8 text-center font-bold text-accent-primary">#{index + 1}</span>
                                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${streamer.gradient} flex items-center justify-center`}>
                                                <span>👤</span>
                                            </div>
                                            <span className="flex-1">{streamer.name}</span>
                                            <span className="text-text-secondary">{streamer.videoCount}개 영상</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
