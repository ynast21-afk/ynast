'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useStreamers } from '@/contexts/StreamerContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

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
    | 'settings'

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

export default function AdminPage() {
    const { user, isLoading: authLoading, isAdmin } = useAuth()
    const { streamers, videos, addStreamer, removeStreamer, addVideo, removeVideo } = useStreamers()
    const { settings, users, stats, updateTexts, updateTheme, updateBanner, updateAnalytics, updatePopup, updatePricing, updateNavMenu, toggleNavItem, updateSocialLinks, toggleSocialLink, updateUserMembership, toggleUserBan } = useSiteSettings()

    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
    const [deleteModal, setDeleteModal] = useState<{ type: 'streamer' | 'video', id: string, name: string } | null>(null)

    // Form states
    const [newStreamer, setNewStreamer] = useState({ name: '', koreanName: '', gradient: gradientOptions[0].value })
    const [newVideo, setNewVideo] = useState({ title: '', streamerId: '', duration: '', isVip: true })
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    // Text edit states
    const [textEdits, setTextEdits] = useState(settings.texts)

    // Theme edit states
    const [themeEdits, setThemeEdits] = useState(settings.theme)

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

    // Handlers
    const handleAddStreamer = () => {
        if (!newStreamer.name.trim()) return
        addStreamer({
            name: newStreamer.name.trim(),
            koreanName: newStreamer.koreanName.trim() || undefined,
            gradient: newStreamer.gradient,
        })
        setNewStreamer({ name: '', koreanName: '', gradient: gradientOptions[0].value })
    }

    const handleAddVideo = async () => {
        if (!newVideo.title.trim() || !newVideo.streamerId || !newVideo.duration.trim()) {
            alert('영상 제목, 스트리머, 재생시간을 입력해주세요.')
            return
        }

        const streamer = streamers.find(s => s.id === newVideo.streamerId)
        if (!streamer) return

        let videoUrl = ''

        // 파일이 선택된 경우 업로드 진행
        if (videoFile) {
            setIsUploading(true)
            setUploadProgress(10) // 시작 표시

            try {
                const formData = new FormData()
                formData.append('file', videoFile)
                formData.append('folder', 'videos')

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                })

                if (!response.ok) {
                    throw new Error('업로드 실패')
                }

                const data = await response.json()
                videoUrl = data.downloadUrl
                setUploadProgress(100)
            } catch (error) {
                console.error('Upload failed:', error)
                alert('비디오 업로드에 실패했습니다.')
                setIsUploading(false)
                setUploadProgress(0)
                return
            }
        }

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
            videoUrl: videoUrl || undefined,
        })

        setNewVideo({ title: '', streamerId: '', duration: '', isVip: true })
        setVideoFile(null)
        setIsUploading(false)
        setUploadProgress(0)

        // 파일 입력 초기화
        const fileInput = document.getElementById('video-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''

        alert('✅ 영상이 추가되었습니다!')
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
        { id: 'settings', icon: '⚙️', label: '사이트 설정' },
    ]

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div className="bg-bg-secondary rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-red-400">⚠️ 삭제 확인</h3>
                        <p className="text-text-secondary mb-6">
                            <span className="text-white font-semibold">"{deleteModal.name}"</span>
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

                                    <div className="grid lg:grid-cols-2 gap-6">
                                        <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                                            <h3 className="font-semibold mb-4">🎬 최근 영상</h3>
                                            {videos.slice(0, 5).map(video => (
                                                <div key={video.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                                    <span className="text-sm truncate flex-1">{video.title}</span>
                                                    <span className="text-xs text-text-secondary ml-2">{video.uploadedAt}</span>
                                                </div>
                                            ))}
                                            {videos.length === 0 && <p className="text-text-secondary text-sm">영상이 없습니다</p>}
                                        </div>

                                        <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                                            <h3 className="font-semibold mb-4">👥 인기 스트리머</h3>
                                            {streamers.sort((a, b) => b.videoCount - a.videoCount).slice(0, 5).map(s => (
                                                <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                                    <span className="text-sm">{s.name}</span>
                                                    <span className="text-xs text-accent-primary">{s.videoCount} videos</span>
                                                </div>
                                            ))}
                                            {streamers.length === 0 && <p className="text-text-secondary text-sm">스트리머가 없습니다</p>}
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

                                    {/* Add Video Form */}
                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10 mb-6">
                                        <h3 className="font-semibold mb-4">➕ 새 영상 추가</h3>
                                        {streamers.length === 0 ? (
                                            <p className="text-yellow-400 text-sm">⚠️ 먼저 스트리머를 등록해주세요</p>
                                        ) : (
                                            <div className="grid md:grid-cols-4 gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="영상 제목"
                                                    value={newVideo.title}
                                                    onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
                                                    className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                />
                                                <select
                                                    value={newVideo.streamerId}
                                                    onChange={e => setNewVideo({ ...newVideo, streamerId: e.target.value })}
                                                    className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                >
                                                    <option value="">스트리머 선택</option>
                                                    {streamers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="재생시간 (예: 4:32)"
                                                    value={newVideo.duration}
                                                    onChange={e => setNewVideo({ ...newVideo, duration: e.target.value })}
                                                    className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                />
                                                <div className="md:col-span-3 flex flex-col gap-2">
                                                    <label className="text-xs text-text-secondary">비디오 파일 업로드 (B2 연동)</label>
                                                    <input
                                                        id="video-file-input"
                                                        type="file"
                                                        accept="video/*"
                                                        onChange={e => setVideoFile(e.target.files?.[0] || null)}
                                                        className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-bg-secondary file:text-accent-primary hover:file:bg-white/10"
                                                    />
                                                    {isUploading && (
                                                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden mt-1">
                                                            <div
                                                                className="bg-accent-primary h-full transition-all duration-300"
                                                                style={{ width: `${uploadProgress}%` }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={handleAddVideo}
                                                    disabled={isUploading}
                                                    className={`gradient-button text-black rounded-lg font-semibold ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {isUploading ? '업로드 중...' : '영상 추가'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Video List */}
                                    <div className="space-y-2">
                                        {videos.map(video => (
                                            <div key={video.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-white/10">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-16 h-10 rounded-lg bg-gradient-to-br ${video.gradient}`}></div>
                                                    <div>
                                                        <p className="font-medium">{video.title}</p>
                                                        <p className="text-sm text-text-secondary">@{video.streamerName} · {video.duration}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setDeleteModal({ type: 'video', id: video.id, name: video.title })}
                                                    className="px-3 py-1 text-red-400 hover:bg-red-500/20 rounded-lg text-sm"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        ))}
                                        {videos.length === 0 && <p className="text-text-secondary text-center py-8">등록된 영상이 없습니다</p>}
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
                                            <select
                                                value={newStreamer.gradient}
                                                onChange={e => setNewStreamer({ ...newStreamer, gradient: e.target.value })}
                                                className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                            >
                                                {gradientOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                            </select>
                                            <button onClick={handleAddStreamer} className="gradient-button text-black rounded-lg font-semibold">
                                                추가
                                            </button>
                                        </div>
                                    </div>

                                    {/* Streamer List */}
                                    <div className="space-y-2">
                                        {streamers.map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-white/10">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${s.gradient}`}></div>
                                                    <div>
                                                        <p className="font-medium">{s.name} {s.koreanName && <span className="text-text-secondary">({s.koreanName})</span>}</p>
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

                            {/* ========== 사용자 관리 탭 ========== */}
                            {activeTab === 'users' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">👤 사용자 관리 ({users.length}명)</h1>
                                    <div className="space-y-2">
                                        {users.map(u => (
                                            <div key={u.id} className={`flex items-center justify-between p-4 bg-bg-primary rounded-xl border ${u.isBanned ? 'border-red-500/50 opacity-60' : 'border-white/10'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-accent-secondary flex items-center justify-center font-bold">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{u.name} {u.isBanned && <span className="text-red-400">(차단됨)</span>}</p>
                                                        <p className="text-sm text-text-secondary">{u.email} · 가입일: {u.createdAt}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <select
                                                        value={u.membership}
                                                        onChange={e => updateUserMembership(u.id, e.target.value as any)}
                                                        className="px-3 py-1 bg-bg-secondary border border-white/10 rounded-lg text-sm"
                                                    >
                                                        <option value="guest">Guest</option>
                                                        <option value="basic">Basic</option>
                                                        <option value="vip">VIP</option>
                                                        <option value="premium">Premium</option>
                                                    </select>
                                                    <button
                                                        onClick={() => toggleUserBan(u.id)}
                                                        className={`px-3 py-1 rounded-lg text-sm ${u.isBanned ? 'text-green-400 hover:bg-green-500/20' : 'text-red-400 hover:bg-red-500/20'}`}
                                                    >
                                                        {u.isBanned ? '차단 해제' : '차단'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {users.length === 0 && <p className="text-text-secondary text-center py-8">등록된 사용자가 없습니다</p>}
                                    </div>
                                </div>
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

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
