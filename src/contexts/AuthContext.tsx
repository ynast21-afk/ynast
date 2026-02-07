'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSiteSettings } from './SiteSettingsContext'

// 관리자 설정 - 이 이메일+비밀번호로 로그인한 사용자만 /admin 접근 가능
const ADMIN_EMAIL = 'ynast21@gmail.com'
const ADMIN_PASSWORD = 'dkf@741852'

export type MembershipLevel = 'guest' | 'basic' | 'vip' | 'premium'
export type UserRole = 'user' | 'moderator' | 'admin'

export interface User {
    id: string
    email: string
    name: string
    membership: MembershipLevel
    role: UserRole
    avatar?: string
    subscriptionEnd?: string
    isBanned: boolean
    banReason?: string
    createdAt: string
    lastLoginAt?: string
    emailVerified: boolean
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAdmin: boolean
    login: (email: string, password: string) => Promise<boolean>
    signup: (email: string, password: string, name: string) => Promise<boolean>
    logout: () => void
    updateMembership: (level: MembershipLevel) => void
    updateUserRole: (userId: string, role: UserRole) => void
    banUser: (userId: string, reason: string) => void
    unbanUser: (userId: string) => void
    verifyEmail: () => void
    loginWithGoogle: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 모든 사용자 목록 관리 (localStorage)
const USERS_STORAGE_KEY = 'kstreamer_users'

function getAllUsers(): User[] {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(USERS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
}

function saveAllUsers(users: User[]) {
    if (typeof window === 'undefined') return
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

function updateUserInStorage(updatedUser: User) {
    const users = getAllUsers()
    const index = users.findIndex(u => u.id === updatedUser.id)
    if (index >= 0) {
        users[index] = updatedUser
    } else {
        users.push(updatedUser)
    }
    saveAllUsers(users)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const { addUser, users: siteUsers, toggleUserBan, updateUserMembership, stats } = useSiteSettings()
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for saved session
        const savedUser = localStorage.getItem('kstreamer_user')
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser)
            // 차단된 사용자 확인
            const allUsers = getAllUsers()
            const storedUser = allUsers.find(u => u.id === parsedUser.id)
            if (storedUser?.isBanned) {
                alert(`계정이 차단되었습니다. 사유: ${storedUser.banReason || '관리자에게 문의하세요'}`)
                localStorage.removeItem('kstreamer_user')
            } else {
                setUser({ ...parsedUser, ...storedUser })
            }
        }
        setIsLoading(false)
    }, [])

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            // 관리자 이메일인 경우 비밀번호 검증
            if (email === ADMIN_EMAIL) {
                if (password !== ADMIN_PASSWORD) {
                    console.error('관리자 비밀번호가 틀렸습니다.')
                    return false
                }
            }

            // 기존 사용자 확인
            const allUsers = getAllUsers()
            let existingUser = allUsers.find(u => u.email === email)

            if (existingUser?.isBanned) {
                alert(`계정이 차단되었습니다. 사유: ${existingUser.banReason || '관리자에게 문의하세요'}`)
                return false
            }

            // 로그인 성공
            const loggedInUser: User = existingUser || {
                id: 'user_' + Date.now(),
                email,
                name: email.split('@')[0],
                membership: email === ADMIN_EMAIL ? 'premium' : 'guest',
                role: email === ADMIN_EMAIL ? 'admin' : 'user',
                isBanned: false,
                emailVerified: email === ADMIN_EMAIL,
                createdAt: new Date().toISOString(),
            }

            loggedInUser.lastLoginAt = new Date().toISOString()

            setUser(loggedInUser)
            localStorage.setItem('kstreamer_user', JSON.stringify(loggedInUser))
            updateUserInStorage(loggedInUser)
            return true
        } catch (error) {
            console.error('Login failed:', error)
            return false
        }
    }

    const loginWithGoogle = async (): Promise<boolean> => {
        setIsLoading(true)
        return new Promise((resolve) => {
            const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

            if (!client_id) {
                alert('Vercel 설정에서 Google Client ID(환경변수)가 설정되지 않았습니다. 관리자 설정에서 NEXT_PUBLIC_GOOGLE_CLIENT_ID를 확인해주세요.')
                setIsLoading(false)
                resolve(false)
                return
            }

            // 30초 후 자동 로딩 해제 (팝업을 닫거나 무시할 경우 대비)
            const timeoutId = setTimeout(() => {
                setIsLoading(false)
                resolve(false)
            }, 30000)

            // @ts-ignore
            const google = window.google

            if (!google) {
                clearTimeout(timeoutId)
                alert('구글 로그인 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요. (또는 광고 차단기를 확인해주세요)')
                setIsLoading(false)
                resolve(false)
                return
            }

            // Use Token Client for OAuth 2.0 (access token)
            const client = google.accounts.oauth2.initTokenClient({
                client_id: client_id,
                scope: 'email profile openid',
                error_callback: (err: any) => {
                    clearTimeout(timeoutId)
                    console.error('GSI Error:', err)
                    setIsLoading(false)
                    resolve(false)
                },
                callback: async (response: any) => {
                    clearTimeout(timeoutId)
                    if (response.error) {
                        console.error('Google login error:', response.error)
                        setIsLoading(false)
                        resolve(false)
                        return
                    }

                    try {
                        // Get user info via UserInfo API using the access token
                        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${response.access_token}` },
                        })
                        const googleUser = await userInfoResponse.json()

                        if (!googleUser.email) {
                            throw new Error('No email from Google account')
                        }

                        // Check if user is banned (siteUsers is from useSiteSettings)
                        const existingInSite = siteUsers.find(u => u.email === googleUser.email)
                        if (existingInSite?.isBanned) {
                            alert('계정이 차단되었습니다. 관리자에게 문의하세요.')
                            setIsLoading(false)
                            resolve(false)
                            return
                        }

                        // Create/Login user
                        const loggedInUser: User = {
                            id: existingInSite?.id || 'google_' + Date.now(),
                            email: googleUser.email,
                            name: googleUser.name || googleUser.given_name || googleUser.email.split('@')[0],
                            avatar: googleUser.picture,
                            membership: existingInSite?.membership || 'guest',
                            role: googleUser.email === ADMIN_EMAIL ? 'admin' : 'user',
                            isBanned: false,
                            emailVerified: true,
                            createdAt: existingInSite?.createdAt || new Date().toISOString(),
                            lastLoginAt: new Date().toISOString(),
                        }

                        // Sync with SiteSettingsContext if new
                        if (!existingInSite) {
                            addUser({
                                email: loggedInUser.email,
                                name: loggedInUser.name,
                                membership: loggedInUser.membership,
                            })
                        }

                        setUser(loggedInUser)
                        localStorage.setItem('kstreamer_user', JSON.stringify(loggedInUser))
                        updateUserInStorage(loggedInUser)

                        setIsLoading(false)
                        resolve(true)
                    } catch (err) {
                        console.error('Failed to fetch Google user info:', err)
                        setIsLoading(false)
                        resolve(false)
                    }
                },
            })

            client.requestAccessToken()
        })
    }

    const signup = async (email: string, password: string, name: string): Promise<boolean> => {
        try {
            const allUsers = getAllUsers()
            if (allUsers.some(u => u.email === email)) {
                alert('이미 등록된 이메일입니다.')
                return false
            }

            const newUser: User = {
                id: 'user_' + Date.now(),
                email,
                name,
                membership: 'guest',
                role: 'user',
                isBanned: false,
                emailVerified: false,
                createdAt: new Date().toISOString(),
            }

            setUser(newUser)
            localStorage.setItem('kstreamer_user', JSON.stringify(newUser))
            updateUserInStorage(newUser)
            return true
        } catch (error) {
            console.error('Signup failed:', error)
            return false
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('kstreamer_user')
    }

    const updateMembership = (level: MembershipLevel) => {
        if (!user) return
        const updatedUser = {
            ...user,
            membership: level,
            subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후
        }
        setUser(updatedUser)
        localStorage.setItem('kstreamer_user', JSON.stringify(updatedUser))
        updateUserInStorage(updatedUser)
    }

    const updateUserRole = (userId: string, role: UserRole) => {
        const allUsers = getAllUsers()
        const targetUser = allUsers.find(u => u.id === userId)
        if (targetUser) {
            targetUser.role = role
            saveAllUsers(allUsers)
        }
    }

    const banUser = (userId: string, reason: string) => {
        const allUsers = getAllUsers()
        const targetUser = allUsers.find(u => u.id === userId)
        if (targetUser) {
            targetUser.isBanned = true
            targetUser.banReason = reason
            saveAllUsers(allUsers)
        }
    }

    const unbanUser = (userId: string) => {
        const allUsers = getAllUsers()
        const targetUser = allUsers.find(u => u.id === userId)
        if (targetUser) {
            targetUser.isBanned = false
            targetUser.banReason = undefined
            saveAllUsers(allUsers)
        }
    }

    const verifyEmail = () => {
        if (!user) return
        const updatedUser = { ...user, emailVerified: true }
        setUser(updatedUser)
        localStorage.setItem('kstreamer_user', JSON.stringify(updatedUser))
        updateUserInStorage(updatedUser)
    }

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAdmin: user?.email === ADMIN_EMAIL,
            login,
            signup,
            logout,
            updateMembership,
            updateUserRole,
            banUser,
            unbanUser,
            verifyEmail,
            loginWithGoogle
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// 모든 사용자 목록 가져오기 (관리자용)
export function useAllUsers() {
    const [users, setUsers] = useState<User[]>([])

    useEffect(() => {
        setUsers(getAllUsers())
    }, [])

    const refresh = () => {
        setUsers(getAllUsers())
    }

    return { users, refresh }
}
