import Header from '@/components/Header'
import Footer from '@/components/Footer'
import VideoCard from '@/components/VideoCard'
import Link from 'next/link'

// Sample video data - sorted by date (newest first)
const allVideos = [
    { id: '1', title: '2026-02-06_Dance Cover - NewJeans', creator: 'DanceQueen', views: '2.8K', likes: '12', duration: '21:36', isVip: true, gradient: 'from-purple-900 to-pink-900', uploadedAt: '1d ago' },
    { id: '2', title: '2026-02-06_K-Pop Tutorial Vol.1', creator: 'KpopMaster', views: '3.4K', likes: '12', duration: '10:03', isVip: true, gradient: 'from-indigo-900 to-blue-900', uploadedAt: '1d ago' },
    { id: '3', title: '2026-02-05_Freestyle Session', creator: 'StreetDancer', views: '2.4K', likes: '13', duration: '44:09', isVip: true, gradient: 'from-cyan-900 to-teal-900', uploadedAt: '1d ago' },
    { id: '4', title: '2026-02-05_aespa Choreography', creator: 'AespaFan', views: '2.8K', likes: '13', duration: '19:08', isVip: true, gradient: 'from-amber-900 to-orange-900', uploadedAt: '1d ago' },
    { id: '5', title: '2026-02-04_TWICE Dance Practice', creator: 'OnceForever', views: '3.5K', likes: '11', duration: '8:22', isVip: true, gradient: 'from-rose-900 to-pink-900', uploadedAt: '2d ago' },
    { id: '6', title: '2026-02-04_IVE Performance', creator: 'IVEstan', views: '1.7K', likes: '11', duration: '21:19', isVip: true, gradient: 'from-violet-900 to-purple-900', uploadedAt: '2d ago' },
    { id: '7', title: '2026-02-03_Dance Battle Highlights', creator: 'BattleKing', views: '2.4K', likes: '17', duration: '14:49', isVip: true, gradient: 'from-emerald-900 to-green-900', uploadedAt: '3d ago' },
    { id: '8', title: '2026-02-03_LE SSERAFIM Cover', creator: 'Fearnot', views: '1.7K', likes: '9', duration: '45:01', isVip: true, gradient: 'from-blue-900 to-indigo-900', uploadedAt: '3d ago' },
    { id: '9', title: '2026-02-02_Blackpink Dance Tutorial', creator: 'BlinkDancer', views: '1.1K', likes: '14', duration: '40:56', isVip: true, gradient: 'from-pink-900 to-red-900', uploadedAt: '4d ago' },
    { id: '10', title: '2026-02-02_Street Dance Basics', creator: 'StreetMaster', views: '1.1K', likes: '14', duration: '45:02', isVip: true, gradient: 'from-slate-900 to-gray-900', uploadedAt: '4d ago' },
    { id: '11', title: '2026-02-01_Hip Hop Foundations', creator: 'HipHopKing', views: '933', likes: '14', duration: '1:08:54', isVip: true, gradient: 'from-orange-900 to-amber-900', uploadedAt: '5d ago' },
    { id: '12', title: '2026-02-01_K-Pop Random Play', creator: 'RandomDancer', views: '1.2K', likes: '13', duration: '20:31', isVip: true, gradient: 'from-teal-900 to-cyan-900', uploadedAt: '5d ago' },
    { id: '13', title: '2026-01-31_Dance Challenge', creator: 'ChallengeQueen', views: '1.0K', likes: '13', duration: '43:40', isVip: true, gradient: 'from-fuchsia-900 to-pink-900', uploadedAt: '6d ago' },
    { id: '14', title: '2026-01-31_BTS Choreography', creator: 'ArmyDancer', views: '1.2K', likes: '13', duration: '27:12', isVip: true, gradient: 'from-purple-900 to-violet-900', uploadedAt: '6d ago' },
    { id: '15', title: '2026-01-30_Dance Practice Room', creator: 'PracticeKing', views: '779', likes: '14', duration: '25:45', isVip: true, gradient: 'from-indigo-900 to-blue-900', uploadedAt: '1w ago' },
    { id: '16', title: '2026-01-30_Contemporary Dance', creator: 'ModernDancer', views: '620', likes: '6', duration: '11:41', isVip: true, gradient: 'from-gray-900 to-slate-900', uploadedAt: '1w ago' },
    { id: '17', title: '2026-01-29_Dance Class Session', creator: 'DanceClass', views: '680', likes: '8', duration: '38:36', isVip: false, gradient: 'from-red-900 to-orange-900', uploadedAt: '1w ago' },
    { id: '18', title: '2026-01-29_Girl Group Medley', creator: 'GirlGroupFan', views: '1.3K', likes: '11', duration: '36:41', isVip: true, gradient: 'from-pink-900 to-rose-900', uploadedAt: '1w ago' },
    { id: '19', title: '2026-01-28_Solo Performance', creator: 'SoloDancer', views: '1.6K', likes: '20', duration: '31:58', isVip: true, gradient: 'from-cyan-900 to-blue-900', uploadedAt: '1w ago' },
    { id: '20', title: '2026-01-28_Dance Workout', creator: 'FitDancer', views: '1.9K', likes: '23', duration: '6:17', isVip: false, gradient: 'from-green-900 to-emerald-900', uploadedAt: '1w ago' },
]

export default function VideosPage() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <div className="h-[120px]" />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-[1800px] mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6">
                        <Link href="/" className="hover:text-accent-primary">🏠 Home</Link>
                        <span>›</span>
                        <span className="text-white">Videos</span>
                    </nav>

                    {/* Title */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-2xl">
                            📹
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-accent-primary">All Videos</h1>
                            <p className="text-text-secondary text-sm">{allVideos.length.toLocaleString()} videos</p>
                        </div>
                    </div>

                    {/* Filters & Sort */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex gap-3 flex-wrap">
                            <button className="px-5 py-2 bg-accent-primary text-black rounded-full text-sm font-medium">
                                All
                            </button>
                            <button className="px-5 py-2 bg-bg-secondary rounded-full text-sm hover:bg-bg-tertiary transition-colors">
                                VIP Only
                            </button>
                            <button className="px-5 py-2 bg-bg-secondary rounded-full text-sm hover:bg-bg-tertiary transition-colors">
                                Free
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-text-secondary text-sm">Sort:</span>
                            <button className="px-4 py-2 border border-accent-primary text-accent-primary rounded-full text-sm font-medium">
                                Latest
                            </button>
                            <button className="px-4 py-2 border border-text-secondary text-text-secondary rounded-full text-sm hover:border-white hover:text-white transition-colors">
                                Popular
                            </button>
                            <button className="px-4 py-2 border border-text-secondary text-text-secondary rounded-full text-sm hover:border-white hover:text-white transition-colors">
                                Most Liked
                            </button>
                        </div>
                    </div>

                    {/* Video Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {allVideos.map((video) => (
                            <div key={video.id} className="group">
                                <div className={`relative aspect-[4/5] rounded-xl overflow-hidden bg-gradient-to-br ${video.gradient} cursor-pointer card-hover`}>
                                    {/* VIP Badge */}
                                    {video.isVip && (
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded">
                                            VIP
                                        </div>
                                    )}

                                    {/* Duration */}
                                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                                        {video.duration}
                                    </div>

                                    {/* Uploaded Time */}
                                    <div className="absolute bottom-12 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                                        {video.uploadedAt}
                                    </div>

                                    {/* Bottom Stats */}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <div className="flex items-center gap-3 text-white text-xs">
                                            <span className="flex items-center gap-1">
                                                👁️ {video.views}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                ❤️ {video.likes}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Play overlay on hover */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-14 h-14 rounded-full bg-accent-primary flex items-center justify-center">
                                            <span className="text-black text-2xl ml-1">▶</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Video Info */}
                                <div className="mt-2">
                                    <h3 className="text-sm text-white line-clamp-2 group-hover:text-accent-primary transition-colors">
                                        {video.title}
                                    </h3>
                                    <p className="text-xs text-text-secondary mt-1">
                                        {video.creator}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    <div className="text-center py-10">
                        <button className="px-8 py-3 border border-accent-primary text-accent-primary rounded-full hover:bg-accent-primary hover:text-black transition-colors font-medium">
                            Load More Videos
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
