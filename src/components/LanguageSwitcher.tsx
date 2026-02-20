'use client'

import { useState, useRef, useEffect } from 'react'

const languages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
]

export default function LanguageSwitcher() {
    const [isOpen, setIsOpen] = useState(false)
    const [currentLang, setCurrentLang] = useState('ko')
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Get current language from cookie
        const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/)
        if (match) {
            setCurrentLang(match[1])
        }
    }, [])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLanguageChange = (langCode: string) => {
        // Set cookie
        document.cookie = `NEXT_LOCALE=${langCode};path=/;max-age=31536000`
        setCurrentLang(langCode)
        setIsOpen(false)
        // Reload to apply changes
        window.location.reload()
    }

    const currentLanguage = languages.find(l => l.code === currentLang) || languages[0]

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary border border-white/10 hover:border-white/20 transition-colors"
            >
                <span className="text-lg">{currentLanguage.flag}</span>
                <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-bg-secondary border border-white/10 shadow-xl overflow-hidden z-50">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${currentLang === lang.code ? 'bg-accent-primary/10 text-accent-primary' : ''
                                }`}
                        >
                            <span className="text-lg">{lang.flag}</span>
                            <span className="text-sm font-medium">{lang.name}</span>
                            {currentLang === lang.code && (
                                <span className="ml-auto text-accent-primary">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
