import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
            <div className="text-center max-w-lg">
                {/* 404 Number */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] md:text-[200px] font-black text-white/5 leading-none select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-accent-primary to-cyan-400 bg-clip-text text-transparent">
                            404
                        </span>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    Page Not Found
                </h2>
                <p className="text-text-secondary text-lg mb-10 max-w-md mx-auto">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/"
                        className="gradient-button text-black px-8 py-3.5 rounded-full font-bold text-lg shadow-[0_5px_20px_rgba(0,255,136,0.3)] hover:shadow-[0_5px_30px_rgba(0,255,136,0.5)] transition-all transform hover:-translate-y-0.5"
                    >
                        ← Back to Home
                    </Link>
                    <Link
                        href="/videos"
                        className="px-8 py-3.5 border border-white/20 rounded-full font-medium text-white hover:border-accent-primary hover:text-accent-primary transition-all"
                    >
                        Browse Videos
                    </Link>
                </div>

                {/* Decorative Elements */}
                <div className="mt-16 flex items-center justify-center gap-6 text-text-secondary text-sm">
                    <Link href="/contact" className="hover:text-accent-primary transition-colors">
                        Contact Support
                    </Link>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <Link href="/membership" className="hover:text-accent-primary transition-colors">
                        Membership
                    </Link>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <Link href="/dmca" className="hover:text-accent-primary transition-colors">
                        DMCA
                    </Link>
                </div>
            </div>
        </div>
    )
}
