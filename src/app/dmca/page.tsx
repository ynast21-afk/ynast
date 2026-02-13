"use client"

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ShieldCheck, Mail, FileText, AlertCircle } from 'lucide-react'

export default function DMCAPage() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <div className="pt-24 pb-16 px-6 lg:px-10">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-2xl bg-accent-primary/10">
                            <ShieldCheck className="w-6 h-6 text-accent-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary">DMCA Policy</h1>
                            <p className="text-text-secondary text-sm mt-1">Digital Millennium Copyright Act Notice</p>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none space-y-8 text-text-secondary leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-accent-primary" />
                                Policy Statement
                            </h2>
                            <p>
                                kStreamer dance respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998, kStreamer dance will respond expeditiously to claims of copyright infringement committed using the kStreamer dance website that are reported to our Designated Copyright Agent.
                            </p>
                        </section>

                        <section className="bg-bg-secondary/50 p-6 rounded-2xl border border-white/5">
                            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-accent-primary" />
                                How to File a Notice
                            </h2>
                            <p className="mb-4">
                                If you are a copyright owner, or are authorized to act on behalf of one, please report alleged copyright infringements taking place on or through the Site by completing a DMCA Notice of Alleged Infringement and delivering it to our Designated Copyright Agent. Upon receipt of the Notice, we will take whatever action, in our sole discretion, it deems appropriate, including removal of the challenged material from the Site.
                            </p>
                            <p>Your Notice must include the following:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Identify the copyrighted work that you claim has been infringed.</li>
                                <li>Identify the material that you claim is infringing and that is to be removed or access to which is to be disabled.</li>
                                <li>Provide your mailing address, telephone number, and, if available, email address.</li>
                                <li>Include a statement that you have a good faith belief that use of the material is not authorized by the copyright owner.</li>
                                <li>Include a statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner.</li>
                                <li>Include your physical or electronic signature.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-accent-primary" />
                                Contact Information
                            </h2>
                            <p>
                                All DMCA notices should be sent to our designated agent at the following email address:
                            </p>
                            <div className="mt-4 p-4 bg-accent-primary/5 rounded-xl inline-block border border-accent-primary/10">
                                <span className="text-accent-primary font-medium">ynast21@gmail.com</span>
                            </div>
                        </section>

                        <section className="text-sm border-t border-white/5 pt-8">
                            <p>
                                Please note that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material or activity is infringing may be subject to liability.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
