'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function ComingSoon() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <div className="h-[72px]" />
            <main className="max-w-2xl mx-auto px-6 py-24 text-center">
                <div className="w-24 h-24 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                    <span className="text-4xl text-accent-primary">🚀</span>
                </div>
                <h1 className="text-4xl font-bold mb-4">Coming Soon!</h1>
                <p className="text-xl text-text-secondary mb-12">
                    이 기능은 현재 준비 중입니다. 더 멋진 모습으로 곧 찾아뵙겠습니다!
                </p>
                <Link
                    href="/"
                    className="inline-block px-10 py-4 bg-accent-primary text-black font-bold rounded-full hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] transition-all"
                >
                    홈으로 돌아가기
                </Link>
            </main>
            <Footer />
        </div>
    )
}
