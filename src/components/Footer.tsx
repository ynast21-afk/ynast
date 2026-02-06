import Link from 'next/link'

export default function Footer() {
    return (
        <footer className="bg-bg-secondary border-t border-white/10 mt-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <h3 className="text-2xl font-bold text-accent-primary mb-3">StreamVault</h3>
                        <p className="text-text-secondary text-sm">
                            Discover the best premium video content. Your premium destination for exclusive streams and downloads.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-sm uppercase tracking-wider font-semibold mb-4">Quick Links</h4>
                        <nav className="flex flex-col gap-2">
                            <Link href="/" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                All Videos
                            </Link>
                            <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Popular Creators
                            </Link>
                            <Link href="/membership" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                VIP Membership
                            </Link>
                        </nav>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-sm uppercase tracking-wider font-semibold mb-4">Legal</h4>
                        <nav className="flex flex-col gap-2">
                            <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Terms of Service
                            </Link>
                            <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                DMCA
                            </Link>
                        </nav>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-sm uppercase tracking-wider font-semibold mb-4">Support</h4>
                        <nav className="flex flex-col gap-2">
                            <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                FAQ
                            </Link>
                            <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Contact
                            </Link>
                            <Link href="#" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Report
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Bottom */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-10 pt-6 border-t border-white/10 text-xs text-text-secondary">
                    <span>© 2026 StreamVault. All rights reserved.</span>
                    <span>All models are 18 years of age or older</span>
                </div>
            </div>
        </footer>
    )
}
