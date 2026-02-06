'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/10">
            <div className="flex items-center justify-between px-6 lg:px-10 py-4">
                {/* Logo */}
                <Link
                    href="/"
                    className="text-2xl font-bold text-accent-primary"
                    style={{ textShadow: '0 0 20px rgba(0, 255, 136, 0.5)' }}
                >
                    StreamVault
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-8">
                    <Link href="/" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                        Videos
                    </Link>
                    <Link href="/membership" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                        Premium
                    </Link>
                    <Link href="#" className="text-text-secondary hover:text-accent-primary transition-colors font-medium">
                        Creators
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
                    <Link
                        href="/membership"
                        className="hidden sm:block gradient-button text-black px-5 py-2 rounded-full font-semibold text-sm"
                    >
                        VIP Membership
                    </Link>
                    <div className="w-9 h-9 rounded-full bg-accent-secondary cursor-pointer hover:ring-2 hover:ring-accent-primary transition-all" />

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
                <Link href="/admin" className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 ml-auto">
                    🔧 Admin
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
                    </nav>
                </div>
            )}
        </header>
    )
}
