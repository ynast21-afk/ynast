'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ========================================
// 타입 정의
// ========================================

export interface SiteTexts {
    siteName: string
    siteSlogan: string
    heroTitle: string
    heroSubtitle: string
    videosPageTitle: string
    videosPageSubtitle: string
    actorsPageTitle: string
    actorsPageSubtitle: string
    footerCopyright: string
    footerDescription: string
}

export interface ThemeSettings {
    primaryColor: string // hex color
    primaryColorName: string // display name
    backgroundColor: string
    backgroundStyle: 'solid' | 'gradient'
    gradientFrom: string
    gradientTo: string
}

export interface BannerSettings {
    enabled: boolean
    message: string
    linkText: string
    linkUrl: string
    backgroundColor: string
    textColor: string
    dismissible: boolean
}

export interface AnalyticsSettings {
    googleAnalyticsId: string
    enabled: boolean
}

export interface PopupSettings {
    enabled: boolean
    title: string
    message: string
    buttonText: string
    buttonUrl: string
    showOnce: boolean // localStorage로 한번만 표시
}

export interface MembershipPricing {
    vip: {
        title: string
        monthlyPrice: number
        yearlyPrice: number
        features: string[]
        description: string
    }
}

export interface NavMenuItem {
    id: string
    label: string
    href: string
    visible: boolean
    isExternal: boolean
}

export interface SocialLink {
    id: string
    platform: string
    url: string
    visible: boolean
}

export interface User {
    id: string
    email: string
    name: string
    membership: 'guest' | 'basic' | 'vip' | 'premium'
    createdAt: string
    isBanned: boolean
}

export interface SiteStats {
    totalVisits: number
    todayVisits: number
    totalUsers: number
    totalVideos: number
    totalStreamers: number
}

export interface SiteSettings {
    texts: SiteTexts
    theme: ThemeSettings
    banner: BannerSettings
    analytics: AnalyticsSettings
    popup: PopupSettings
    pricing: MembershipPricing
    navMenu: NavMenuItem[]
    socialLinks: SocialLink[]
}

// ========================================
// 기본값
// ========================================

const defaultTexts: SiteTexts = {
    siteName: 'kStreamer dance',
    siteSlogan: 'Korean dance videos at your fingertips',
    heroTitle: 'Premium Korean Dance Content',
    heroSubtitle: 'Watch exclusive dance performances from top Korean streamers',
    videosPageTitle: 'VIDEO GALLERY',
    videosPageSubtitle: 'Latest dance performances from your favorite streamers',
    actorsPageTitle: 'TOP CREATORS',
    actorsPageSubtitle: 'Discover talented dancers and their exclusive content',
    footerCopyright: '© 2024 kStreamer dance. All rights reserved.',
    footerDescription: 'Premium Korean dance content platform',
}

const defaultTheme: ThemeSettings = {
    primaryColor: '#00ff88',
    primaryColorName: 'Neon Green',
    backgroundColor: '#0a0a0f',
    backgroundStyle: 'solid',
    gradientFrom: '#0a0a0f',
    gradientTo: '#1a1a2e',
}

const defaultBanner: BannerSettings = {
    enabled: false,
    message: '🎉 Welcome to kStreamer dance!',
    linkText: 'Learn more',
    linkUrl: '/membership',
    backgroundColor: '#00ff88',
    textColor: '#000000',
    dismissible: true,
}

const defaultAnalytics: AnalyticsSettings = {
    googleAnalyticsId: '',
    enabled: true,
}

const defaultPopup: PopupSettings = {
    enabled: false,
    title: 'Welcome!',
    message: 'Check out our latest videos!',
    buttonText: 'Explore Now',
    buttonUrl: '/videos',
    showOnce: true,
}

const defaultPricing: MembershipPricing = {
    vip: {
        title: 'VIP PLAN',
        monthlyPrice: 19.99,
        yearlyPrice: 199.99,
        features: [
            'Access to all VIP videos',
            'HD quality streaming',
            'Exclusive live streams',
            'Priority support',
            'No ads',
        ],
        description: 'The ultimate K-Dance experience',
    },
}

const defaultNavMenu: NavMenuItem[] = [
    { id: '1', label: 'Videos', href: '/videos', visible: true, isExternal: false },
    { id: '2', label: 'Actors', href: '/actors', visible: true, isExternal: false },
    { id: '3', label: 'Premium', href: '/membership', visible: true, isExternal: false },
    { id: '4', label: 'Playlists', href: '/playlists', visible: true, isExternal: false },
]

const defaultSocialLinks: SocialLink[] = [
    { id: '1', platform: 'Twitter', url: 'https://twitter.com', visible: true },
    { id: '2', platform: 'Instagram', url: 'https://instagram.com', visible: true },
    { id: '3', platform: 'Discord', url: 'https://discord.com', visible: false },
    { id: '4', platform: 'YouTube', url: 'https://youtube.com', visible: false },
]

const defaultSettings: SiteSettings = {
    texts: defaultTexts,
    theme: defaultTheme,
    banner: defaultBanner,
    analytics: defaultAnalytics,
    popup: defaultPopup,
    pricing: defaultPricing,
    navMenu: defaultNavMenu,
    socialLinks: defaultSocialLinks,
}

// ========================================
// Context
// ========================================

interface SiteSettingsContextType {
    settings: SiteSettings
    users: User[]
    stats: SiteStats
    updateTexts: (texts: Partial<SiteTexts>) => void
    updateTheme: (theme: Partial<ThemeSettings>) => void
    updateBanner: (banner: Partial<BannerSettings>) => void
    updateAnalytics: (analytics: Partial<AnalyticsSettings>) => void
    updatePopup: (popup: Partial<PopupSettings>) => void
    updatePricing: (pricing: Partial<MembershipPricing>) => void
    updateNavMenu: (menu: NavMenuItem[]) => void
    toggleNavItem: (id: string) => void
    updateSocialLinks: (links: SocialLink[]) => void
    toggleSocialLink: (id: string) => void
    addUser: (user: Omit<User, 'id' | 'createdAt' | 'isBanned'>) => User
    updateUserMembership: (userId: string, membership: User['membership']) => void
    toggleUserBan: (userId: string) => void
    incrementVisit: () => void
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined)

// ========================================
// Provider
// ========================================

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings)

    const [users, setUsers] = useState<User[]>([
        {
            id: '1',
            email: 'demo@example.com',
            name: 'Demo User',
            membership: 'basic',
            createdAt: '2024-01-15',
            isBanned: false,
        },
        {
            id: '2',
            email: 'vipuser@example.com',
            name: 'VIP User',
            membership: 'vip',
            createdAt: '2024-02-01',
            isBanned: false,
        },
    ])

    const [stats, setStats] = useState<SiteStats>({
        totalVisits: 12543,
        todayVisits: 234,
        totalUsers: 2,
        totalVideos: 0,
        totalStreamers: 0,
    })

    // localStorage 로드
    useEffect(() => {
        const saved = localStorage.getItem('kstreamer_site_settings')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                // 구조 변경 대응: 기본값과 안전하게 병합
                setSettings(prev => ({
                    ...defaultSettings,
                    ...parsed,
                    pricing: {
                        ...defaultPricing,
                        ...(parsed.pricing || {}),
                        vip: {
                            ...defaultPricing.vip,
                            ...(parsed.pricing?.vip || {})
                        }
                    }
                }))
            } catch (e) {
                console.error('Failed to load settings:', e)
            }
        }

        const savedUsers = localStorage.getItem('kstreamer_users')
        if (savedUsers) {
            try {
                setUsers(JSON.parse(savedUsers))
            } catch (e) {
                console.error('Failed to load users:', e)
            }
        }

        const savedStats = localStorage.getItem('kstreamer_stats')
        if (savedStats) {
            try {
                setStats(JSON.parse(savedStats))
            } catch (e) {
                console.error('Failed to load stats:', e)
            }
        }
    }, [])

    // localStorage 저장
    useEffect(() => {
        localStorage.setItem('kstreamer_site_settings', JSON.stringify(settings))
    }, [settings])

    useEffect(() => {
        localStorage.setItem('kstreamer_users', JSON.stringify(users))
    }, [users])

    useEffect(() => {
        localStorage.setItem('kstreamer_stats', JSON.stringify(stats))
    }, [stats])

    // 업데이트 함수들
    const updateTexts = (newTexts: Partial<SiteTexts>) => {
        setSettings(prev => ({ ...prev, texts: { ...prev.texts, ...newTexts } }))
    }

    const updateTheme = (newTheme: Partial<ThemeSettings>) => {
        setSettings(prev => ({ ...prev, theme: { ...prev.theme, ...newTheme } }))
    }

    const updateBanner = (newBanner: Partial<BannerSettings>) => {
        setSettings(prev => ({ ...prev, banner: { ...prev.banner, ...newBanner } }))
    }

    const updateAnalytics = (newAnalytics: Partial<AnalyticsSettings>) => {
        setSettings(prev => ({ ...prev, analytics: { ...prev.analytics, ...newAnalytics } }))
    }

    const updatePopup = (newPopup: Partial<PopupSettings>) => {
        setSettings(prev => ({ ...prev, popup: { ...prev.popup, ...newPopup } }))
    }

    const updatePricing = (newPricing: Partial<MembershipPricing>) => {
        setSettings(prev => ({ ...prev, pricing: { ...prev.pricing, ...newPricing } }))
    }

    const updateNavMenu = (menu: NavMenuItem[]) => {
        setSettings(prev => ({ ...prev, navMenu: menu }))
    }

    const toggleNavItem = (id: string) => {
        setSettings(prev => ({
            ...prev,
            navMenu: prev.navMenu.map(item =>
                item.id === id ? { ...item, visible: !item.visible } : item
            ),
        }))
    }

    const updateSocialLinks = (links: SocialLink[]) => {
        setSettings(prev => ({ ...prev, socialLinks: links }))
    }

    const toggleSocialLink = (id: string) => {
        setSettings(prev => ({
            ...prev,
            socialLinks: prev.socialLinks.map(link =>
                link.id === id ? { ...link, visible: !link.visible } : link
            ),
        }))
    }

    const addUser = (user: Omit<User, 'id' | 'createdAt' | 'isBanned'>): User => {
        const existing = users.find(u => u.email === user.email)
        if (existing) return existing

        const newUser: User = {
            ...user,
            id: Date.now().toString(),
            createdAt: new Date().toISOString().split('T')[0],
            isBanned: false,
        }
        setUsers(prev => [...prev, newUser])
        setStats(prev => ({ ...prev, totalUsers: prev.totalUsers + 1 }))
        return newUser
    }

    const updateUserMembership = (userId: string, membership: User['membership']) => {
        setUsers(prev =>
            prev.map(user => (user.id === userId ? { ...user, membership } : user))
        )
    }

    const toggleUserBan = (userId: string) => {
        setUsers(prev =>
            prev.map(user => (user.id === userId ? { ...user, isBanned: !user.isBanned } : user))
        )
    }

    const incrementVisit = () => {
        setStats(prev => ({
            ...prev,
            totalVisits: prev.totalVisits + 1,
            todayVisits: prev.todayVisits + 1,
        }))
    }

    return (
        <SiteSettingsContext.Provider
            value={{
                settings,
                users,
                stats,
                updateTexts,
                updateTheme,
                updateBanner,
                updateAnalytics,
                updatePopup,
                updatePricing,
                updateNavMenu,
                toggleNavItem,
                updateSocialLinks,
                toggleSocialLink,
                addUser,
                updateUserMembership,
                toggleUserBan,
                incrementVisit,
            }}
        >
            {children}
        </SiteSettingsContext.Provider>
    )
}

export function useSiteSettings() {
    const context = useContext(SiteSettingsContext)
    if (context === undefined) {
        throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
    }
    return context
}
