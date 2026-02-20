'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <main className="max-w-4xl mx-auto px-6 py-20 bg-bg-secondary/50 rounded-3xl border border-white/5 shadow-2xl">
                <h1 className="text-4xl font-bold mb-10 bg-gradient-to-r from-accent-primary to-cyan-400 bg-clip-text text-transparent">
                    이용약관 (Terms of Service)
                </h1>

                <div className="prose prose-invert max-w-none space-y-8 text-text-secondary leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 1 조 (목적)</h2>
                        <p>이 약관은 kStreamer dance(이하 &quot;서비스&quot;)가 제공하는 모든 서비스의 이용조건 및 절차, 이용자와 서비스의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 2 조 (이용계약의 성립)</h2>
                        <p>이용계약은 이용자가 본 약관 내용에 대하여 동의를 하며 서비스 신청을 하고 승낙함으로써 성립합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 3 조 (서비스 이용 및 구독)</h2>
                        <p>VIP 멤버십은 정기 구독형 상품으로, 결제 후 즉시 서비스 이용이 가능합니다. 자동 결제는 언제든지 마이페이지에서 해지할 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 4 조 (사용자 데이터 및 보안)</h2>
                        <p>서비스는 이용자의 개인정보 수집 시 최소한의 정보를 수집하며, 보안을 위해 최선을 다합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 5 조 (문의처)</h2>
                        <p>서비스 이용 중 발생하는 문의사항은 아래 연락처로 문의해 주시기 바랍니다.</p>
                        <div className="bg-white/5 p-4 rounded-xl mt-4 border border-accent-primary/20">
                            <p className="font-bold text-accent-primary">Email: ynast21@gmail.com</p>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    )
}
