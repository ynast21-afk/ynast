'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'

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

export interface VideoDisplaySettings {
    thumbnailLockEnabled: boolean // 썸네일/미리보기에 자물쇠(블러) 표시 여부
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

export interface Inquiry {
    id: string
    name: string
    email: string
    subject: string
    message: string
    createdAt: string
    status: 'new' | 'replied' | 'archived'
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
    videoDisplay: VideoDisplaySettings
}

// ========================================
// 기본값
// ========================================

const defaultTexts: SiteTexts = {
    siteName: 'kStreamer dance',
    siteSlogan: 'Korean dance videos at your fingertips',
    heroTitle: 'Premium Korean Dance Content',
    heroSubtitle: '',
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

const defaultVideoDisplay: VideoDisplaySettings = {
    thumbnailLockEnabled: true, // 기본값: 자물쇠 표시
}

const defaultPricing: MembershipPricing = {
    vip: {
        title: 'VIP PLAN',
        monthlyPrice: 8.00,
        yearlyPrice: 80.00,
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

export const defaultSettings: SiteSettings = {
    texts: defaultTexts,
    theme: defaultTheme,
    banner: defaultBanner,
    analytics: defaultAnalytics,
    popup: defaultPopup,
    pricing: defaultPricing,
    navMenu: defaultNavMenu,
    socialLinks: defaultSocialLinks,
    videoDisplay: defaultVideoDisplay,
}

// ========================================
// Context
// ========================================

interface SiteSettingsContextType {
    settings: SiteSettings
    users: User[]
    stats: SiteStats
    inquiries: Inquiry[]
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
    updateVideoDisplay: (videoDisplay: Partial<VideoDisplaySettings>) => void
    addUser: (user: Omit<User, 'id' | 'createdAt' | 'isBanned'>) => User
    updateUserMembership: (userId: string, membership: User['membership']) => void
    toggleUserBan: (userId: string) => void
    incrementVisit: () => void
    addInquiry: (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => void
    deleteInquiry: (id: string) => void
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined)

// ========================================
// Provider
// ========================================

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
    const [users, setUsers] = useState<User[]>([])
    const [stats, setStats] = useState<SiteStats>({
        totalVisits: 0,
        todayVisits: 0,
        totalUsers: 0,
        totalVideos: 0,
        totalStreamers: 0,
    })
    const [inquiries, setInquiries] = useState<Inquiry[]>([])
    const [isInitialized, setIsInitialized] = useState(false)

    // 서버 데이터 로드
    useEffect(() => {
        const loadAllData = async () => {
            console.log('--- SiteSettingsProvider Sync (Server) ---')
            try {
                // Get admin token for protected endpoints
                const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')) : null
                const headers: Record<string, string> = {}
                if (token) headers['x-admin-token'] = token

                // Settings 로드
                const settingsRes = await fetch('/api/settings?t=' + Date.now(), { headers })
                if (settingsRes.ok) {
                    const serverSettings = await settingsRes.json()
                    if (serverSettings && Object.keys(serverSettings).length > 0) {
                        setSettings(prev => ({
                            ...defaultSettings,
                            ...serverSettings,
                            texts: { ...defaultTexts, ...(serverSettings.texts || {}) },
                            theme: { ...defaultTheme, ...(serverSettings.theme || {}) },
                            banner: { ...defaultBanner, ...(serverSettings.banner || {}) },
                        }))
                    }
                }

                // Users 로드 (Admin Auth API 사용)
                // Now including admin token header
                const usersRes = await fetch('/api/auth/users?t=' + Date.now(), { headers })
                if (usersRes.ok) {
                    const serverUsers = await usersRes.json()
                    if (Array.isArray(serverUsers)) setUsers(serverUsers)
                } else if (usersRes.status === 401 || usersRes.status === 403) {
                    console.warn('[SiteSettings] Unauthorized to fetch users (Admin check failed)')
                }

                // Stats 로드
                const statsRes = await fetch('/api/data?type=stats&t=' + Date.now(), { headers })
                if (statsRes.ok) {
                    const serverStats = await statsRes.json()
                    if (serverStats && serverStats.totalVisits !== undefined) setStats(serverStats)
                }

                // Inquiries 로드
                const inqRes = await fetch('/api/data?type=inquiries&t=' + Date.now(), { headers })
                if (inqRes.ok) {
                    const serverInquiries = await inqRes.json()
                    if (Array.isArray(serverInquiries)) setInquiries(serverInquiries)
                }

                setIsInitialized(true)
            } catch (e) {
                console.error('Initial Load Failed:', e)
                setIsInitialized(true)
            }
        }

        // 로컬 데이터 우선 로드
        const savedSettings = localStorage.getItem('kstreamer_site_settings')
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings)
                setSettings(prev => ({ ...defaultSettings, ...parsed }))
            } catch (e) { console.error(e) }
        }

        loadAllData()
    }, [])

    // 자동 저장 (Debounced)
    const settingsDebounce = useRef<NodeJS.Timeout | null>(null)
    useEffect(() => {
        if (!isInitialized) return
        localStorage.setItem('kstreamer_site_settings', JSON.stringify(settings))

        if (settingsDebounce.current) clearTimeout(settingsDebounce.current)
        settingsDebounce.current = setTimeout(() => {
            const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (token) headers['x-admin-token'] = token
            fetch('/api/settings', {
                method: 'POST',
                headers,
                body: JSON.stringify(settings)
            }).catch(e => console.error('Settings Sync Error:', e))
        }, 2000)
    }, [settings, isInitialized])

    const dataDebounce = useRef<NodeJS.Timeout | null>(null)
    useEffect(() => {
        if (!isInitialized) return
        localStorage.setItem('kstreamer_users', JSON.stringify(users))
        localStorage.setItem('kstreamer_stats', JSON.stringify(stats))
        localStorage.setItem('kstreamer_inquiries', JSON.stringify(inquiries))

        if (dataDebounce.current) clearTimeout(dataDebounce.current)
        dataDebounce.current = setTimeout(() => {
            const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (token) headers['x-admin-token'] = token
            fetch('/api/data?type=users', { method: 'POST', headers, body: JSON.stringify(users) })
            fetch('/api/data?type=stats', { method: 'POST', headers, body: JSON.stringify(stats) })
            fetch('/api/data?type=inquiries', { method: 'POST', headers, body: JSON.stringify(inquiries) })
        }, 3000)
    }, [users, stats, inquiries, isInitialized])



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

    const updateVideoDisplay = (newVideoDisplay: Partial<VideoDisplaySettings>) => {
        setSettings(prev => ({ ...prev, videoDisplay: { ...prev.videoDisplay, ...newVideoDisplay } }))
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

    const lastVisitTimeRef = useRef<number>(0)

    const incrementVisit = useCallback(() => {
        const now = Date.now()
        // 5-second cooldown to prevent infinite loops
        if (now - lastVisitTimeRef.current < 5000) return

        lastVisitTimeRef.current = now
        setStats(prev => ({
            ...prev,
            totalVisits: prev.totalVisits + 1,
            todayVisits: prev.todayVisits + 1,
        }))
    }, [])

    const addInquiry = (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => {
        const newInquiry: Inquiry = {
            ...inquiry,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            status: 'new',
        }
        setInquiries(prev => [newInquiry, ...prev])
    }

    const deleteInquiry = (id: string) => {
        setInquiries(prev => prev.filter(inq => inq.id !== id))
    }

    return (
        <SiteSettingsContext.Provider
            value={{
                settings,
                users,
                stats,
                inquiries,
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
                updateVideoDisplay,
                addUser,
                updateUserMembership,
                toggleUserBan,
                incrementVisit,
                addInquiry,
                deleteInquiry,
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
