import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function Footer() {
    const t = useTranslations('common')
    const tFooter = useTranslations('footer')

    return (
        <footer className="bg-bg-secondary border-t border-[var(--border-color)] mt-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <h3 className="text-2xl font-bold text-accent-primary mb-3">kStreamer dance</h3>
                        <p className="text-text-secondary text-sm">
                            Discover the best premium dance video content. Your premium destination for exclusive streams and downloads.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-sm uppercase tracking-wider font-semibold mb-4">Quick Links</h4>
                        <nav className="flex flex-col gap-2">
                            <Link href="/" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                {t('videos')}
                            </Link>
                            <Link href="/actors" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Popular Creators
                            </Link>
                            <Link href="/membership" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                {t('membership')}
                            </Link>
                        </nav>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-sm uppercase tracking-wider font-semibold mb-4">Legal</h4>
                        <nav className="flex flex-col gap-2">
                            <Link href="/docs/terms" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                {tFooter('terms')}
                            </Link>
                            <Link href="/docs/privacy" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/docs/refund" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Refund Policy
                            </Link>
                            <Link href="/dmca" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                DMCA
                            </Link>
                            <Link href="/tags" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Tags
                            </Link>
                        </nav>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-sm uppercase tracking-wider font-semibold mb-4">Support</h4>
                        <nav className="flex flex-col gap-2">
                            <Link href="/membership#faq" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                FAQ
                            </Link>
                            <Link href="/contact" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                {t('contact')}
                            </Link>
                            <a href="mailto:ynast21@gmail.com" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                ynast21@gmail.com
                            </a>
                            <Link href="/contact" className="text-text-secondary hover:text-accent-primary text-sm transition-colors">
                                Report
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Bottom */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-10 pt-6 border-t border-white/10 text-xs text-text-secondary">
                    <div className="flex flex-col gap-1 items-center md:items-start">
                        <span>© 2026 kStreamer dance. {tFooter('rights')}</span>
                        <span className="opacity-70">Address: 264, Dongbaekjukjeon-daero, Giheung-gu, Yongin-si, Gyeonggi-do, Republic of Korea 17013</span>
                    </div>
                    <span>All models are 18 years of age or older</span>
                </div>
            </div>
        </footer>
    )
}
