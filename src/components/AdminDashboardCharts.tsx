'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports for recharts (client-side only)
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })

const COLORS = ['#00ff88', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f97316', '#6366f1',
    '#14b8a6', '#e11d48', '#84cc16', '#a855f7', '#0ea5e9']

const MEMBERSHIP_COLORS: Record<string, string> = {
    guest: '#6b7280',
    basic: '#3b82f6',
    vip: '#f59e0b',
    premium: '#ef4444',
}

interface DashboardData {
    summary: {
        totalVideos: number
        totalStreamers: number
        totalViews: number
        totalLikes: number
        totalComments: number
        totalUsers: number
        vipVideoCount: number
        freeVideoCount: number
    }
    topVideosByViews: any[]
    topVideosByLikes: any[]
    streamerStats: any[]
    tagDistribution: any[]
    uploadTimeline: any[]
    membershipDistribution: any[]
    commentTimeline: any[]
    notificationDistribution: any[]
    providerDistribution: any[]
}

export default function AdminDashboardCharts() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch('/api/admin/dashboard-stats')
            .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
            .then(setData)
            .catch(err => setError(String(err)))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
                <span className="ml-4 text-text-secondary">통계 데이터 로딩 중...</span>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                <p className="text-red-400">⚠️ 통계 데이터를 불러올 수 없습니다</p>
                <p className="text-text-secondary text-sm mt-2">{error}</p>
            </div>
        )
    }

    const { summary } = data

    return (
        <div className="space-y-8">
            {/* ===== Summary Cards (Enhanced) ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard icon="👁️" label="총 조회수" value={summary.totalViews} color="from-cyan-900/50 to-cyan-600/30" border="border-cyan-500/20" textColor="text-cyan-300" />
                <SummaryCard icon="❤️" label="총 좋아요" value={summary.totalLikes} color="from-rose-900/50 to-rose-600/30" border="border-rose-500/20" textColor="text-rose-300" />
                <SummaryCard icon="💬" label="총 댓글" value={summary.totalComments} color="from-blue-900/50 to-blue-600/30" border="border-blue-500/20" textColor="text-blue-300" />
                <SummaryCard icon="👤" label="총 회원" value={summary.totalUsers} color="from-amber-900/50 to-amber-600/30" border="border-amber-500/20" textColor="text-amber-300" />
            </div>

            {/* Content type ratio bar */}
            <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                <h3 className="font-semibold mb-3">📦 콘텐츠 구성</h3>
                <div className="flex items-center gap-4 mb-2">
                    <div className="flex-1 bg-bg-secondary rounded-full h-6 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full flex items-center justify-center text-xs font-bold text-black"
                            style={{ width: summary.totalVideos > 0 ? `${(summary.vipVideoCount / summary.totalVideos * 100)}%` : '0%' }}
                        >
                            {summary.vipVideoCount > 0 && `VIP ${summary.vipVideoCount}`}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between text-xs text-text-secondary">
                    <span>🔒 VIP: {summary.vipVideoCount}개</span>
                    <span>🆓 무료: {summary.freeVideoCount}개</span>
                    <span>총 {summary.totalVideos}개 영상 · {summary.totalStreamers}명 스트리머</span>
                </div>
            </div>

            {/* ===== Charts Grid ===== */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* 1. Upload Timeline (Area Chart) */}
                <ChartCard title="📅 일별 업로드 (최근 30일)">
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={data.uploadTimeline}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} interval={4} />
                            <YAxis stroke="#666" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="count" stroke="#00ff88" fill="url(#uploadGradient)" name="업로드" />
                            <defs>
                                <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 2. Comment Timeline (Area Chart) */}
                <ChartCard title="💬 일별 댓글 (최근 30일)">
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={data.commentTimeline}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} interval={4} />
                            <YAxis stroke="#666" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#commentGradient)" name="댓글" />
                            <defs>
                                <linearGradient id="commentGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 3. Top Videos by Views (Bar Chart) */}
                <ChartCard title="🏆 인기 영상 TOP 10 (조회수)">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.topVideosByViews} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" stroke="#666" tick={{ fontSize: 10 }} />
                            <YAxis
                                type="category"
                                dataKey="title"
                                stroke="#666"
                                tick={{ fontSize: 9 }}
                                width={120}
                                tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + '…' : v}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="views" fill="#00ff88" name="조회수" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 4. Streamer Ranking (Bar Chart) */}
                <ChartCard title="⭐ 스트리머 순위 (조회수)">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.streamerStats.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="name"
                                stroke="#666"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v: string) => v.length > 8 ? v.slice(0, 8) + '…' : v}
                            />
                            <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Bar dataKey="totalViews" fill="#3b82f6" name="조회수" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="totalLikes" fill="#ef4444" name="좋아요" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 5. Tag Distribution (Horizontal Bar) */}
                <ChartCard title="🏷️ 인기 태그 TOP 15">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.tagDistribution} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" stroke="#666" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" stroke="#666" tick={{ fontSize: 10 }} width={80} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="count" name="영상 수" radius={[0, 4, 4, 0]}>
                                {data.tagDistribution.map((_: any, i: number) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 6. Membership Distribution (Pie Chart) */}
                <ChartCard title="👥 회원 등급 분포">
                    <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={data.membershipDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="count"
                                    nameKey="name"
                                    label={({ name, count }: any) => count > 0 ? `${name}: ${count}` : ''}
                                >
                                    {data.membershipDistribution.map((entry: any, i: number) => (
                                        <Cell key={i} fill={MEMBERSHIP_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2 text-xs">
                        {data.membershipDistribution.map((entry: any) => (
                            <span key={entry.name} className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: MEMBERSHIP_COLORS[entry.name] || '#666' }}></span>
                                {entry.name}: {entry.count}명
                            </span>
                        ))}
                    </div>
                </ChartCard>

                {/* 7. Subscription Provider Distribution (Pie Chart) */}
                {data.providerDistribution && data.providerDistribution.length > 0 && (
                    <ChartCard title="💳 결제 수단별 VIP 분포">
                        <div className="flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.providerDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="count"
                                        nameKey="name"
                                        label={({ name, count }: any) => count > 0 ? `${name}: ${count}` : ''}
                                    >
                                        {data.providerDistribution.map((entry: any, i: number) => {
                                            const providerColors: Record<string, string> = {
                                                paypal: '#FFC439',
                                                paddle: '#3b82f6',
                                                gumroad: '#FF90E8',
                                                none: '#6b7280',
                                            }
                                            return <Cell key={i} fill={providerColors[entry.name] || COLORS[i % COLORS.length]} />
                                        })}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-2 text-xs">
                            {data.providerDistribution.map((entry: any) => {
                                const providerColors: Record<string, string> = {
                                    paypal: '#FFC439',
                                    paddle: '#3b82f6',
                                    gumroad: '#FF90E8',
                                    none: '#6b7280',
                                }
                                return (
                                    <span key={entry.name} className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: providerColors[entry.name] || '#666' }}></span>
                                        {entry.name}: {entry.count}명
                                    </span>
                                )
                            })}
                        </div>
                    </ChartCard>
                )}
            </div>

            {/* ===== Top Videos Tables ===== */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                    <h3 className="font-semibold mb-4">👁️ 조회수 TOP 10</h3>
                    <div className="space-y-2">
                        {data.topVideosByViews.map((v: any, i: number) => (
                            <div key={v.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-500 text-black' : 'bg-white/10 text-text-secondary'}`}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{v.title}</p>
                                    <p className="text-xs text-text-secondary">{v.streamer}</p>
                                </div>
                                <span className="text-cyan-400 text-sm font-mono">{v.views.toLocaleString()}</span>
                            </div>
                        ))}
                        {data.topVideosByViews.length === 0 && <p className="text-text-secondary text-sm italic">데이터 없음</p>}
                    </div>
                </div>

                <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                    <h3 className="font-semibold mb-4">❤️ 좋아요 TOP 10</h3>
                    <div className="space-y-2">
                        {data.topVideosByLikes.map((v: any, i: number) => (
                            <div key={v.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-rose-500 text-white' : 'bg-white/10 text-text-secondary'}`}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{v.title}</p>
                                    <p className="text-xs text-text-secondary">{v.streamer}</p>
                                </div>
                                <span className="text-rose-400 text-sm font-mono">{v.likes.toLocaleString()}</span>
                            </div>
                        ))}
                        {data.topVideosByLikes.length === 0 && <p className="text-text-secondary text-sm italic">데이터 없음</p>}
                    </div>
                </div>
            </div>

            {/* Notification Distribution */}
            {data.notificationDistribution.length > 0 && (
                <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                    <h3 className="font-semibold mb-4">🔔 알림 유형별 통계</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {data.notificationDistribution.map((n: any) => (
                            <div key={n.name} className="bg-bg-secondary rounded-lg p-4 text-center border border-white/5">
                                <p className="text-2xl font-bold">{n.count}</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {n.name === 'comment' ? '💬 댓글' :
                                        n.name === 'like' ? '❤️ 좋아요' :
                                            n.name === 'payment' ? '💰 결제' :
                                                n.name === 'follow' ? '👥 팔로우' : `📌 ${n.name}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ===== Reusable Sub-Components =====

function SummaryCard({ icon, label, value, color, border, textColor }: {
    icon: string; label: string; value: number; color: string; border: string; textColor: string
}) {
    return (
        <div className={`bg-gradient-to-br ${color} rounded-xl p-5 ${border} border`}>
            <p className={`${textColor} text-sm mb-1`}>{icon} {label}</p>
            <p className="text-3xl font-bold">{value.toLocaleString()}</p>
        </div>
    )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
            <h3 className="font-semibold mb-4">{title}</h3>
            {children}
        </div>
    )
}
