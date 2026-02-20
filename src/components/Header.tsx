'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import TopBanner from './TopBanner'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import { useStreamers } from '@/contexts/StreamerContext'
import { Video, Streamer } from '@/data/initialData'
import { getMediaUrl } from '@/utils/b2url'

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchTab, setSearchTab] = useState<'all' | 'video' | 'actor'>('all')
    const { streamers, videos, downloadToken, downloadUrl, activeBucketName } = useStreamers()
    const { user, logout, isLoading } = useAuth()
    const { settings } = useSiteSettings()
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch
    useEffect(() => setMounted(true), [])
    const t = useTranslations('common')
    const tAuth = useTranslations('auth')

    const getMembershipBadge = () => {
        if (!user) return null
        const badges: Record<string, { text: string; color: string }> = {
            guest: { text: 'Free', color: 'bg-gray-500' },
            basic: { text: 'Basic', color: 'bg-blue-500' },
            vip: { text: 'VIP', color: 'bg-accent-primary text-black' },
            premium: { text: 'Premium+', color: 'bg-accent-secondary' },
        }
        return badges[user.membership]
    }

    const badge = getMembershipBadge()

    return (
        <div className="sticky top-0 z-50 w-full">
            {/* Top Banner */}
            <TopBanner />

            <header className="bg-bg-primary/80 backdrop-blur-md border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between px-6 lg:px-10 py-4">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="text-2xl font-bold"
                        style={{ color: settings.theme.primaryColor, textShadow: `0 0 20px ${settings.theme.primaryColor}50` }}
                    >
                        {settings.texts.siteName}
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex gap-8">
                        <Link href="/videos" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            {t('videos')}
                        </Link>
                        <Link href="/membership" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            {t('membership')}
                        </Link>
                        <Link href="/actors" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            {t('actors')}
                        </Link>
                        <Link href="/contact" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            {t('contact')}
                        </Link>
                        <Link href="/coming-soon" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            Playlists
                        </Link>
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-4">
                        <div className="relative search-container">
                            <button
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className={`text-xl hover:text-accent-primary transition-colors ${isSearchOpen ? 'text-accent-primary' : ''}`}
                            >
                                🔍
                            </button>

                            {/* Search Dropdown */}
                            {isSearchOpen && (
                                <div className="absolute right-0 mt-4 w-[320px] sm:w-[400px] bg-bg-secondary rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-4">
                                        {/* Input Area */}
                                        <div className="relative mb-4">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">🔍</span>
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder={t('searchPlaceholder') || 'Search videos, actors...'}
                                                className="w-full bg-bg-primary border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>

                                        {/* Tabs */}
                                        <div className="flex border-b border-white/5 mb-4">
                                            {(['all', 'video', 'actor'] as const).map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setSearchTab(tab)}
                                                    className={`flex-1 py-2 text-xs font-medium transition-colors relative ${searchTab === tab ? 'text-accent-primary' : 'text-text-secondary hover:text-white'
                                                        }`}
                                                >
                                                    {tab === 'all' ? t('all') : tab === 'video' ? t('videos') : t('actors')}
                                                    {searchTab === tab && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Results Area */}
                                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {searchQuery.length < 2 ? (
                                                <div className="py-12 text-center text-text-secondary">
                                                    <div className="text-3xl mb-3 opacity-30">🔍</div>
                                                    <p className="text-sm">{t('searchMinChars') || '2자 이상 입력하세요'}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {/* Filter Results */}
                                                    {(() => {
                                                        const q = searchQuery.toLowerCase()
                                                        const filteredVideos = (searchTab === 'all' || searchTab === 'video')
                                                            ? videos.filter((v: Video) =>
                                                                v.title.toLowerCase().includes(q) ||
                                                                v.streamerName.toLowerCase().includes(q)
                                                            )
                                                            : []

                                                        const filteredActors = (searchTab === 'all' || searchTab === 'actor')
                                                            ? streamers.filter((s: Streamer) =>
                                                                s.name.toLowerCase().includes(q) ||
                                                                (s.koreanName && s.koreanName.toLowerCase().includes(q))
                                                            )
                                                            : []

                                                        const totalCount = filteredVideos.length + filteredActors.length

                                                        if (totalCount === 0) {
                                                            return <p className="py-8 text-center text-text-secondary text-sm">{t('noResults') || '결과가 없습니다.'}</p>
                                                        }

                                                        return (
                                                            <>
                                                                {filteredActors.map((actor: Streamer) => (
                                                                    <Link
                                                                        key={actor.id}
                                                                        href={`/actors/${actor.id}`}
                                                                        onClick={() => setIsSearchOpen(false)}
                                                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                                                    >
                                                                        <div className={`w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br ${actor.gradient} overflow-hidden relative`}>
                                                                            {actor.profileImage && (
                                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                                <img
                                                                                    src={getMediaUrl({
                                                                                        url: actor.profileImage,
                                                                                        token: downloadToken,
                                                                                        activeBucketName,
                                                                                        downloadUrl
                                                                                    })}
                                                                                    alt=""
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium group-hover:text-accent-primary transition-colors truncate">
                                                                                {actor.koreanName ? `${actor.koreanName} (${actor.name})` : actor.name}
                                                                            </p>
                                                                            <p className="text-[11px] text-text-secondary">배우 • {actor.videoCount}개 영상</p>
                                                                        </div>
                                                                    </Link>
                                                                ))}
                                                                {filteredVideos.map((vid: Video) => (
                                                                    <Link
                                                                        key={vid.id}
                                                                        href={`/video/${vid.id}`}
                                                                        onClick={() => setIsSearchOpen(false)}
                                                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                                                    >
                                                                        <div className={`w-14 h-9 rounded bg-gradient-to-br ${vid.gradient} flex-shrink-0 relative overflow-hidden`}>
                                                                            {vid.thumbnailUrl && (
                                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                                <img
                                                                                    src={getMediaUrl({
                                                                                        url: vid.thumbnailUrl,
                                                                                        token: downloadToken,
                                                                                        activeBucketName,
                                                                                        downloadUrl
                                                                                    })}
                                                                                    alt=""
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium group-hover:text-accent-primary transition-colors truncate">{vid.title}</p>
                                                                            <p className="text-[11px] text-text-secondary">동영상 • @{vid.streamerName}{(() => { const s = streamers.find(st => st.name === vid.streamerName); return s?.koreanName ? ` (${s.koreanName})` : ''; })()}</p>
                                                                        </div>
                                                                    </Link>
                                                                ))}
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="text-xl hover:text-accent-primary transition-colors">
                            🔔
                        </button>

                        {/* Theme Toggle */}
                        {mounted && (
                            <button
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all text-xl"
                                title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {resolvedTheme === 'dark' ? '☀️' : '🌙'}
                            </button>
                        )}

                        {/* Language Switcher */}
                        <LanguageSwitcher />

                        {!isLoading && (
                            <>
                                {user ? (
                                    /* Logged in user menu */
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                            className="flex items-center gap-2"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-accent-secondary flex items-center justify-center font-bold text-white cursor-pointer hover:ring-2 hover:ring-accent-primary transition-all">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            {badge && (
                                                <span className={`hidden sm:block px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                                                    {badge.text}
                                                </span>
                                            )}
                                        </button>

                                        {/* User dropdown */}
                                        {isUserMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-56 bg-bg-secondary rounded-xl border border-white/10 shadow-xl overflow-hidden">
                                                <div className="p-4 border-b border-white/10">
                                                    <p className="font-semibold">{user.name}</p>
                                                    <p className="text-sm text-text-secondary">{user.email}</p>
                                                    {badge && (
                                                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                                                            {badge.text} Member
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="py-2">
                                                    <Link href="/mypage" className="block px-4 py-2 text-text-secondary hover:bg-white/5 hover:text-white">
                                                        👤 Profile
                                                    </Link>
                                                    <Link href="/membership" className="block px-4 py-2 text-text-secondary hover:bg-white/5 hover:text-white">
                                                        ⭐ Upgrade Plan
                                                    </Link>
                                                    <Link href="/mypage?tab=history" className="block px-4 py-2 text-text-secondary hover:bg-white/5 hover:text-white">
                                                        📺 Watch History
                                                    </Link>
                                                    <Link href="/mypage?tab=downloads" className="block px-4 py-2 text-text-secondary hover:bg-white/5 hover:text-white">
                                                        📥 Downloads
                                                    </Link>
                                                </div>
                                                <div className="border-t border-white/10 py-2">
                                                    <button
                                                        onClick={() => {
                                                            logout()
                                                            setIsUserMenuOpen(false)
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10"
                                                    >
                                                        🚪 Sign Out
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Not logged in */
                                    <>
                                        <Link
                                            href="/login"
                                            className="hidden sm:block text-text-secondary hover:text-white px-4 py-2 text-sm font-medium"
                                        >
                                            {t('login')}
                                        </Link>
                                        <Link
                                            href="/signup"
                                            className="hidden sm:block gradient-button text-black px-5 py-2 rounded-full font-semibold text-sm"
                                        >
                                            {t('signup')}
                                        </Link>
                                    </>
                                )}
                            </>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden text-xl"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            ☰
                        </button>
                    </div>
                </div>

                {/* Sub Navigation */}
                <div className="hidden md:flex gap-6 px-10 py-3 bg-bg-secondary border-b border-white/5">
                    <Link href="/coming-soon" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        🎰 Roulette
                    </Link>
                    <Link href="/coming-soon" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        🧩 Extension
                    </Link>
                    <Link href="/videos/vertical" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        📱 Vertical
                    </Link>
                    <Link href="/coming-soon" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        📤 Submit Video
                    </Link>
                    <Link href="/tags" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        🏷️ Tags
                    </Link>
                    <Link href="/coming-soon" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        ⋯ More
                    </Link>
                    <Link href="/contact" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        ✉️ Contact
                    </Link>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-bg-secondary border-t border-white/10 p-4">
                        <nav className="flex flex-col gap-4">
                            <Link href="/" className="text-text-secondary hover:text-accent-primary">Videos</Link>
                            <Link href="/videos/vertical" className="text-text-secondary hover:text-accent-primary">Vertical</Link>
                            <Link href="/membership" className="text-text-secondary hover:text-accent-primary">Premium</Link>
                            <Link href="/actors" className="text-text-secondary hover:text-accent-primary">Creators</Link>
                            <Link href="/coming-soon" className="text-text-secondary hover:text-accent-primary">Community</Link>
                            {user ? (
                                <>
                                    <Link href="/mypage" className="text-text-secondary hover:text-accent-primary">Profile</Link>
                                    <button onClick={logout} className="text-left text-red-400">Sign Out</button>
                                </>
                            ) : (
                                <>
                                    <Link href="/login" className="text-accent-primary font-medium">Sign In</Link>
                                    <Link href="/signup" className="text-accent-primary font-medium">Join Free</Link>
                                </>
                            )}
                        </nav>
                    </div>
                )}
            </header>
        </div>
    )
}
