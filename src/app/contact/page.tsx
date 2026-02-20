'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useState } from 'react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { useTranslations } from 'next-intl'

export default function ContactPage() {
    const t = useTranslations('contact')
    const subjects = [
        { value: '', label: t('subjectPlaceholder') },
        { value: 'general', label: t('subjectGeneral') },
        { value: 'membership', label: t('subjectMembership') },
        { value: 'payment', label: t('subjectPayment') },
        { value: 'technical', label: t('subjectTechnical') },
        { value: 'feedback', label: t('subjectFeedback') },
        { value: 'other', label: t('subjectOther') },
    ]
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const { addInquiry } = useSiteSettings()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        // mailto 링크로 이메일 열기
        const mailtoLink = `mailto:ynast21@gmail.com?subject=${encodeURIComponent(
            subjects.find(s => s.value === formData.subject)?.label || 'Contact'
        )}&body=${encodeURIComponent(
            `[Message from Contact Form]\n\nName: ${formData.name}\nEmail: ${formData.email}\nSubject: ${subjects.find(s => s.value === formData.subject)?.label}\n\nMessage:\n${formData.message}`
        )}`

        // 직접 이메일 클라이언트 열기
        window.location.href = mailtoLink

        // 사이트 내부 DB에 저장 (관리자 확인용)
        addInquiry({
            name: formData.name,
            email: formData.email,
            subject: subjects.find(s => s.value === formData.subject)?.label || formData.subject,
            message: formData.message,
        })

        setIsSubmitting(false)
        setSubmitted(true)
    }

    const characterCount = formData.message.length

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="px-6 lg:px-10 py-12">
                <div className="max-w-2xl mx-auto">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                            <span className="text-3xl">✉️</span>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-center mb-4">{t('title')}</h1>
                    <p className="text-text-secondary text-center mb-10">
                        {t('description')}
                    </p>

                    {submitted ? (
                        <div className="text-center p-8 bg-bg-secondary rounded-2xl border border-accent-primary/30">
                            <span className="text-5xl mb-4 block">✅</span>
                            <h2 className="text-xl font-bold mb-2">{t('successTitle')}</h2>
                            <p className="text-text-secondary">
                                {t('successMessage')}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name & Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('nameLabel')}</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">👤</span>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
                                            placeholder={t('namePlaceholder')}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('emailLabel')}</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">✉️</span>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
                                            placeholder={t('emailPlaceholder')}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium mb-2">{t('subjectLabel')}</label>
                                <select
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary transition-colors appearance-none cursor-pointer"
                                    required
                                >
                                    {subjects.map((subject) => (
                                        <option key={subject.value} value={subject.value} className="bg-bg-secondary">
                                            {subject.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    {t('messageLabel')} <span className="text-text-secondary">{t('messageMin')}</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-4 text-text-secondary">💬</span>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors resize-none"
                                        placeholder={t('messagePlaceholder')}
                                        rows={6}
                                        minLength={10}
                                        maxLength={5000}
                                        required
                                    />
                                </div>
                                <div className="text-right mt-1">
                                    <span className={`text-sm ${characterCount > 4500 ? 'text-orange-400' : 'text-text-secondary'}`}>
                                        {characterCount}/5000 {t('characters')}
                                    </span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || formData.message.length < 10}
                                className="w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, #ff6b6b, #ee5a24, #ff00ff)',
                                }}
                            >
                                {isSubmitting ? (
                                    t('sending')
                                ) : (
                                    <>
                                        <span className="mr-2">✈️</span> {t('send')}
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Direct Email */}
                    <p className="text-center text-text-secondary mt-8">
                        {t('directEmail')}{' '}
                        <a href="mailto:ynast21@gmail.com" className="text-accent-primary hover:underline">
                            ynast21@gmail.com
                        </a>
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    )
}
