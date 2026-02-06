'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import TopBanner from './TopBanner'

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const { user, logout, isLoading } = useAuth()
    const { settings } = useSiteSettings()

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
        <>
            {/* Top Banner */}
            <TopBanner />

            <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/10" style={{ top: settings.banner.enabled ? '48px' : '0' }}>
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
                            Videos
                        </Link>
                        <Link href="/membership" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            Premium
                        </Link>
                        <Link href="/actors" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            Actors
                        </Link>
                        <Link href="#" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            Community
                        </Link>
                        <Link href="#" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                            Playlists
                        </Link>
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-4">
                        <button className="text-xl hover:text-accent-primary transition-colors">
                            🔍
                        </button>
                        <button className="text-xl hover:text-accent-primary transition-colors">
                            🔔
                        </button>

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
                                                    <Link href="/profile" className="block px-4 py-2 text-text-secondary hover:bg-white/5 hover:text-white">
                                                        👤 Profile
                                                    </Link>
                                                    <Link href="/membership" className="block px-4 py-2 text-text-secondary hover:bg-white/5 hover:text-white">
                                                        ⭐ Upgrade Plan
                                                    </Link>
                                                    <Link href="/history" className="block px-4 py-2 text-text-secondary hover:bg-white/5 hover:text-white">
                                                        📺 Watch History
                                                    </Link>
                                                    <Link href="/downloads" className="block px-4 py-2 text-text-secondary hover:bg-white/5 hover:text-white">
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
                                            Sign In
                                        </Link>
                                        <Link
                                            href="/signup"
                                            className="hidden sm:block gradient-button text-black px-5 py-2 rounded-full font-semibold text-sm"
                                        >
                                            Join Free
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
                    <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        🎰 Roulette
                    </Link>
                    <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        🧩 Extension
                    </Link>
                    <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        📱 Shorts
                    </Link>
                    <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        📤 Submit Video
                    </Link>
                    <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
                        🏷️ Tags
                    </Link>
                    <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm flex items-center gap-1">
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
                            <Link href="/membership" className="text-text-secondary hover:text-accent-primary">Premium</Link>
                            <Link href="#" className="text-text-secondary hover:text-accent-primary">Creators</Link>
                            <Link href="#" className="text-text-secondary hover:text-accent-primary">Community</Link>
                            {user ? (
                                <>
                                    <Link href="/profile" className="text-text-secondary hover:text-accent-primary">Profile</Link>
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
        </>
    )
}
