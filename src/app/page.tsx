import Header from '@/components/Header'
import Footer from '@/components/Footer'
import VideoCard from '@/components/VideoCard'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

// Sample video data
const videos = [
    { id: '1', title: 'Cyberpunk City Night Walk 8K', creator: 'NeonWalker', views: '1.2K', duration: '12:45', isVip: true, gradient: 'from-purple-900 to-cyan-900' },
    { id: '2', title: 'Digital Art Masterclass', creator: 'ArtistPro', views: '3.5K', duration: '08:32', isVip: false, gradient: 'from-indigo-900 to-blue-900' },
    { id: '3', title: 'Synthwave Mix 2024', creator: 'LofiGirl', views: '890', duration: '15:20', isVip: true, gradient: 'from-cyan-900 to-teal-900' },
    { id: '4', title: 'Tokyo Night Life Guide', creator: 'TravelWithMe', views: '2.1K', duration: '22:10', isVip: false, gradient: 'from-amber-900 to-green-900' },
    { id: '5', title: 'Hardware Teardown Series', creator: 'TechInsider', views: '5.6K', duration: '45:30', isVip: true, gradient: 'from-slate-800 to-zinc-800' },
    { id: '6', title: 'Future Tech Preview 2025', creator: 'FutureTech', views: '1.8K', duration: '18:45', isVip: false, gradient: 'from-emerald-900 to-cyan-900' },
    { id: '7', title: 'Dance Choreography Vol.3', creator: 'DanceQueen', views: '4.2K', duration: '10:15', isVip: false, gradient: 'from-pink-900 to-purple-900' },
    { id: '8', title: 'Coding Live Session', creator: 'DevMaster', views: '780', duration: '25:00', isVip: true, gradient: 'from-blue-900 to-purple-900' },
    { id: '9', title: 'Morning Workout Routine', creator: 'FitLife', views: '3.3K', duration: '06:40', isVip: false, gradient: 'from-orange-900 to-red-900' },
    { id: '10', title: 'Gaming Highlights EP.42', creator: 'ProGamer', views: '920', duration: '33:20', isVip: false, gradient: 'from-violet-900 to-indigo-900' },
    { id: '11', title: 'ASMR Relaxation Session', creator: 'SoftSounds', views: '1.5K', duration: '14:55', isVip: true, gradient: 'from-slate-900 to-gray-900' },
    { id: '12', title: 'Street Food Adventures', creator: 'FoodieExplorer', views: '2.7K', duration: '28:15', isVip: false, gradient: 'from-rose-900 to-pink-900' },
]

export default function HomePage() {
    const t = useTranslations('membership')
    const tCommon = useTranslations('common')
    return (
        <div className="min-h-screen">
            <Header />

            {/* Spacer for fixed header */}
            <div className="h-[120px]" />

            {/* Hero Section */}
            <section className="px-6 lg:px-10 py-12">
                <div className="flex flex-col lg:flex-row gap-8 items-center max-w-7xl mx-auto">
                    {/* Featured Video */}
                    <div className="flex-[2] relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-950 dark:to-purple-950 border border-[var(--border-color)]">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl">🎬</span>
                        </div>
                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className="w-20 h-20 rounded-full bg-accent-primary flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                style={{ boxShadow: '0 0 40px rgba(0, 255, 136, 0.5)' }}
                            >
                                <span className="text-black text-3xl ml-1">▶</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Info */}
                    <div className="flex-1 p-4">
                        <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t('title')}</h1>
                        <p className="text-text-secondary mb-6">
                            {t('subtitle')}
                        </p>

                        {/* Stats */}
                        <div className="flex gap-8 mb-8">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-accent-primary">75K+</div>
                                <div className="text-sm text-text-secondary">Videos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-accent-primary">400+</div>
                                <div className="text-sm text-text-secondary">Creators</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-accent-primary">∞</div>
                                <div className="text-sm text-text-secondary">VIP Access</div>
                            </div>
                        </div>

                        <Link
                            href="/membership"
                            className="inline-block gradient-button text-black px-10 py-4 rounded-full font-bold text-lg animate-pulse-glow"
                        >
                            {t('getStarted')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="px-6 lg:px-10 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-7xl mx-auto">
                    <div className="flex gap-3">
                        <button className="px-5 py-2 bg-accent-primary text-black rounded-full text-sm font-medium">
                            {tCommon('videos')}
                        </button>
                        <button className="px-5 py-2 bg-bg-secondary rounded-full text-sm hover:bg-bg-tertiary transition-colors">
                            Trending
                        </button>
                        <button className="px-5 py-2 bg-bg-secondary rounded-full text-sm hover:bg-bg-tertiary transition-colors">
                            New Releases
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-text-secondary text-sm">Sort:</span>
                        <button className="px-4 py-2 border border-accent-primary text-accent-primary rounded-full text-sm">
                            Most Popular
                        </button>
                        <button className="px-4 py-2 border border-text-secondary text-text-secondary rounded-full text-sm hover:border-white hover:text-white transition-colors">
                            Newest
                        </button>
                    </div>
                </div>
            </section>

            {/* Video Grid */}
            <section className="px-6 lg:px-10 py-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 max-w-[1800px] mx-auto">
                    {videos.map((video) => (
                        <VideoCard key={video.id} {...video} />
                    ))}
                </div>
            </section>

            {/* Load More */}
            <section className="text-center py-10">
                <button className="px-8 py-3 border border-accent-primary text-accent-primary rounded-full hover:bg-accent-primary hover:text-black transition-colors font-medium">
                    Load More Videos
                </button>
            </section>

            <Footer />
        </div>
    )
}
