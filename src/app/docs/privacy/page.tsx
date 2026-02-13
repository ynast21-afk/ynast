'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <main className="max-w-4xl mx-auto px-6 py-20 bg-bg-secondary/50 rounded-3xl border border-white/5 shadow-2xl">
                <h1 className="text-4xl font-bold mb-10 bg-gradient-to-r from-accent-primary to-cyan-400 bg-clip-text text-transparent">
                    개인정보처리방침 (Privacy Policy)
                </h1>

                <div className="prose prose-invert max-w-none space-y-8 text-text-secondary leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 1 조 (개인정보의 처리 목적)</h2>
                        <p>kStreamer dance(이하 &quot;서비스&quot;)는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>회원 가입 및 관리</li>
                            <li>재화 또는 서비스 제공 (유료 멤버십 등)</li>
                            <li>마케팅 및 광고에의 활용</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 2 조 (개인정보의 처리 및 보유 기간)</h2>
                        <p>서비스는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 3 조 (정보주체의 권리·의무 및 그 행사방법)</h2>
                        <p>이용자는 개인정보주체로서 언제든지 개인정보 열람, 정정, 삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 4 조 (처리하는 개인정보의 항목)</h2>
                        <p>서비스는 다음의 개인정보 항목을 처리하고 있습니다.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>필수항목: 이메일, 비밀번호, 닉네임</li>
                            <li>선택항목: 결제기록 (외부 결제사 연동)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 5 조 (개인정보의 안전성 확보 조치)</h2>
                        <p>서비스는 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적/관리적 및 물리적 조치를 하고 있습니다.</p>
                        <p className="mt-2">해킹 등에 대비한 기술적 대책: 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위하여 보안프로그램을 설치하고 주기적인 갱신·점검을 하며 외부로부터 접근이 통제된 구역에 시스템을 설치하고 기술적/물리적으로 감시 및 차단하고 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">제 6 조 (문의처)</h2>
                        <p>개인정보 처리와 관련한 문의사항은 아래 연락처로 문의해 주시기 바랍니다.</p>
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
