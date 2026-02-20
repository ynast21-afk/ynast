'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function RefundPage() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <main className="max-w-4xl mx-auto px-6 py-20 bg-bg-secondary/50 rounded-3xl border border-white/5 shadow-2xl">
                <h1 className="text-4xl font-bold mb-10 bg-gradient-to-r from-accent-primary to-cyan-400 bg-clip-text text-transparent">
                    환불 정책 (Refund Policy)
                </h1>

                <div className="prose prose-invert max-w-none space-y-8 text-text-secondary leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. 디지털 콘텐츠의 특성</h2>
                        <p>본 서비스에서 제공하는 VIP 멤버십은 디지털 콘텐츠 서비스로, 결제와 동시에 서비스가 개시됩니다. 전자상거래법에 따라 서비스 개시 후에는 단순 변심에 의한 환불이 제한될 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. 정기 구독 해지</h2>
                        <p>사용자는 언제든지 자동 결제를 해지할 수 있습니다. 해지 시 다음 결제일부터 청구가 중단되며, 이미 결제된 남은 기간 동안은 VIP 혜택을 계속 이용할 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. 환불 예외 규정</h2>
                        <p>시스템 오류로 인한 중복 결제 또는 서비스 장애로 인해 정상적인 이용이 불가능한 경우, 확인 절차를 거쳐 전액 환불 처리를 도와드립니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. 환불 문의</h2>
                        <p>환불과 관련된 모든 요청은 아래 메일로 주문 번호와 함께 문의해 주시기 바랍니다.</p>
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
