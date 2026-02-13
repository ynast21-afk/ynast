'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuthUser {
    id: string
    email: string
    name: string
    membership: 'guest' | 'basic' | 'vip' | 'premium'
    role: 'user' | 'moderator' | 'admin'
    avatar?: string
    subscriptionEnd?: string
    isBanned: boolean
    banReason?: string
    createdAt: string
    lastLoginAt?: string
    emailVerified: boolean
    provider?: 'email' | 'google'
}

interface Props {
    getAdminHeaders: () => Record<string, string>
}

const membershipColors: Record<string, string> = {
    guest: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    basic: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    vip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    premium: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export default function UserManagementPanel({ getAdminHeaders }: Props) {
    const [users, setUsers] = useState<AuthUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [filterMembership, setFilterMembership] = useState<string>('all')
    const [editingUserId, setEditingUserId] = useState<string | null>(null)
    const [editMembership, setEditMembership] = useState<string>('guest')
    const [editDuration, setEditDuration] = useState<number>(30)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const headers = getAdminHeaders()
            const res = await fetch('/api/auth/users', { headers })
            if (!res.ok) {
                if (res.status === 401) {
                    setError('관리자 인증이 필요합니다. 다시 로그인해주세요.')
                } else {
                    setError('사용자 목록을 불러오는데 실패했습니다.')
                }
                return
            }
            const data = await res.json()
            setUsers(Array.isArray(data) ? data : [])
        } catch (e) {
            setError('서버 연결에 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }, [getAdminHeaders])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleUpdateMembership = async (userId: string, membership: string, durationDays: number) => {
        setActionLoading(userId)
        try {
            const headers = getAdminHeaders()
            const res = await fetch('/api/auth/users', {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    action: 'updateMembership',
                    data: { membership, durationDays },
                }),
            })

            if (res.ok) {
                await fetchUsers()
                setEditingUserId(null)
                alert('멤버십이 업데이트되었습니다.')
            } else {
                const data = await res.json()
                alert(data.error || '업데이트에 실패했습니다.')
            }
        } catch {
            alert('서버 연결에 실패했습니다.')
        } finally {
            setActionLoading(null)
        }
    }

    const handleToggleBan = async (userId: string, currentlyBanned: boolean) => {
        const action = currentlyBanned ? 'unban' : 'ban'
        let reason = ''

        if (!currentlyBanned) {
            reason = prompt('차단 사유를 입력하세요:') || ''
            if (!reason) return // Cancel if no reason provided
        }

        setActionLoading(userId)
        try {
            const headers = getAdminHeaders()
            const res = await fetch('/api/auth/users', {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    action,
                    data: { reason },
                }),
            })

            if (res.ok) {
                await fetchUsers()
                alert(currentlyBanned ? '차단이 해제되었습니다.' : '사용자가 차단되었습니다.')
            } else {
                const data = await res.json()
                alert(data.error || '처리에 실패했습니다.')
            }
        } catch {
            alert('서버 연결에 실패했습니다.')
        } finally {
            setActionLoading(null)
        }
    }

    const getRemainingDays = (subscriptionEnd?: string) => {
        if (!subscriptionEnd) return null
        const endDate = new Date(subscriptionEnd)
        const now = new Date()
        const diff = endDate.getTime() - now.getTime()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = searchQuery === '' ||
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesMembership = filterMembership === 'all' || u.membership === filterMembership
        return matchesSearch && matchesMembership
    })

    const membershipCounts = {
        all: users.length,
        guest: users.filter(u => u.membership === 'guest').length,
        basic: users.filter(u => u.membership === 'basic').length,
        vip: users.filter(u => u.membership === 'vip').length,
        premium: users.filter(u => u.membership === 'premium').length,
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">👤 사용자 관리 ({users.length}명)</h1>
                <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="px-4 py-2 bg-accent-primary/20 text-accent-primary border border-accent-primary/30 rounded-lg text-sm font-medium hover:bg-accent-primary/30 transition-colors disabled:opacity-50"
                >
                    {loading ? '새로고침 중...' : '🔄 새로고침'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
                    {error}
                </div>
            )}

            {/* Stats Bar */}
            <div className="grid grid-cols-5 gap-3 mb-6">
                {Object.entries(membershipCounts).map(([key, count]) => (
                    <button
                        key={key}
                        onClick={() => setFilterMembership(key)}
                        className={`p-3 rounded-xl border text-center transition-all ${filterMembership === key
                                ? 'border-accent-primary bg-accent-primary/10'
                                : 'border-white/10 bg-bg-primary hover:border-white/20'
                            }`}
                    >
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-text-secondary uppercase mt-1">
                            {key === 'all' ? '전체' : key}
                        </p>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="이름 또는 이메일로 검색..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-sm focus:outline-none focus:border-accent-primary transition-colors"
                />
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-text-secondary">사용자 목록 로딩 중...</span>
                </div>
            )}

            {/* User List */}
            {!loading && (
                <div className="space-y-2">
                    {filteredUsers.map(u => {
                        const remainingDays = getRemainingDays(u.subscriptionEnd)
                        const isEditing = editingUserId === u.id
                        const isProcessing = actionLoading === u.id

                        return (
                            <div
                                key={u.id}
                                className={`p-4 bg-bg-primary rounded-xl border transition-all ${u.isBanned
                                        ? 'border-red-500/50 opacity-70'
                                        : isEditing
                                            ? 'border-accent-primary/50 ring-1 ring-accent-primary/20'
                                            : 'border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    {/* User Info */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-11 h-11 rounded-full bg-accent-secondary flex items-center justify-center font-bold text-white flex-shrink-0">
                                            {u.avatar ? (
                                                <img src={u.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                                            ) : (
                                                u.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold truncate">{u.name}</p>
                                                {u.isBanned && (
                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">
                                                        차단됨
                                                    </span>
                                                )}
                                                {u.provider === 'google' && (
                                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20">
                                                        Google
                                                    </span>
                                                )}
                                                {u.provider === 'email' && (
                                                    <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-[10px] font-bold rounded-full border border-gray-500/20">
                                                        Email
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-text-secondary truncate">{u.email}</p>
                                            <p className="text-xs text-text-tertiary mt-0.5">
                                                가입: {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                                                {u.lastLoginAt && ` · 마지막 로그인: ${new Date(u.lastLoginAt).toLocaleDateString('ko-KR')}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Membership & Actions */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {/* Current Membership Badge */}
                                        <div className="text-right mr-2">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase border ${membershipColors[u.membership] || membershipColors.guest}`}>
                                                {u.membership}
                                            </span>
                                            {remainingDays !== null && remainingDays > 0 && (
                                                <p className={`text-[10px] mt-1 font-mono ${remainingDays <= 7 ? 'text-red-400' : remainingDays <= 14 ? 'text-yellow-400' : 'text-text-tertiary'}`}>
                                                    D-{remainingDays}
                                                </p>
                                            )}
                                            {remainingDays !== null && remainingDays <= 0 && (
                                                <p className="text-[10px] mt-1 font-mono text-red-400">만료됨</p>
                                            )}
                                        </div>

                                        {/* Edit Button */}
                                        <button
                                            onClick={() => {
                                                if (isEditing) {
                                                    setEditingUserId(null)
                                                } else {
                                                    setEditingUserId(u.id)
                                                    setEditMembership(u.membership)
                                                    setEditDuration(30)
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isEditing
                                                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                                                    : 'bg-white/5 text-text-secondary hover:bg-white/10 border border-white/10'
                                                }`}
                                        >
                                            {isEditing ? '취소' : '✏️ 수정'}
                                        </button>

                                        {/* Ban/Unban */}
                                        <button
                                            onClick={() => handleToggleBan(u.id, u.isBanned)}
                                            disabled={isProcessing}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${u.isBanned
                                                    ? 'text-green-400 hover:bg-green-500/20 border border-green-500/20'
                                                    : 'text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                                }`}
                                        >
                                            {isProcessing ? '처리 중...' : u.isBanned ? '🔓 해제' : '🚫 차단'}
                                        </button>
                                    </div>
                                </div>

                                {/* Ban Reason */}
                                {u.isBanned && u.banReason && (
                                    <div className="mt-3 p-2 bg-red-500/10 rounded-lg text-red-400 text-xs border border-red-500/20">
                                        차단 사유: {u.banReason}
                                    </div>
                                )}

                                {/* Edit Panel */}
                                {isEditing && (
                                    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                        <h4 className="text-sm font-bold mb-3">멤버십 변경</h4>
                                        <div className="flex items-end gap-3 flex-wrap">
                                            <div>
                                                <label className="block text-xs text-text-secondary mb-1">등급</label>
                                                <select
                                                    value={editMembership}
                                                    onChange={e => setEditMembership(e.target.value)}
                                                    className="px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-sm min-w-[120px]"
                                                >
                                                    <option value="guest">Guest (무료)</option>
                                                    <option value="basic">Basic</option>
                                                    <option value="vip">VIP</option>
                                                    <option value="premium">Premium+</option>
                                                </select>
                                            </div>

                                            {editMembership !== 'guest' && (
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-1">기간 (일)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={editDuration}
                                                            onChange={e => setEditDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                                            min={1}
                                                            max={365}
                                                            className="w-20 px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-sm text-center"
                                                        />
                                                        <div className="flex gap-1">
                                                            {[7, 30, 90, 365].map(d => (
                                                                <button
                                                                    key={d}
                                                                    onClick={() => setEditDuration(d)}
                                                                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${editDuration === d
                                                                            ? 'bg-accent-primary text-black'
                                                                            : 'bg-white/5 text-text-secondary hover:bg-white/10'
                                                                        }`}
                                                                >
                                                                    {d}일
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleUpdateMembership(u.id, editMembership, editDuration)}
                                                disabled={isProcessing}
                                                className="px-4 py-2 bg-accent-primary text-black font-bold rounded-lg text-sm hover:opacity-90 transition-all disabled:opacity-50"
                                            >
                                                {isProcessing ? '적용 중...' : '✅ 적용'}
                                            </button>
                                        </div>

                                        {editMembership !== 'guest' && (
                                            <p className="text-xs text-text-tertiary mt-2">
                                                적용 시 만료일: {new Date(Date.now() + editDuration * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')} (D-{editDuration})
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {filteredUsers.length === 0 && !loading && (
                        <div className="py-16 text-center bg-bg-primary rounded-xl border border-dashed border-white/10">
                            <p className="text-4xl mb-3">👤</p>
                            <p className="text-text-secondary font-medium">
                                {searchQuery || filterMembership !== 'all'
                                    ? '검색 결과가 없습니다'
                                    : '등록된 사용자가 없습니다'
                                }
                            </p>
                            <p className="text-text-tertiary text-sm mt-1">
                                사용자가 회원가입하면 여기에 표시됩니다
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
