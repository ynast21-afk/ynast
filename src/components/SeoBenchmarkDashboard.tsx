'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// ═══════════════════════════════════════════════════════════
// 경쟁사 벤치마크 상수 (유사 규모 안정화 사이트 기준)
// ═══════════════════════════════════════════════════════════
const BENCHMARKS = {
    dailyVisitors: { target: 500, unit: '명', label: '일일 방문자', icon: '👥' },
    weeklyVisitors: { target: 3500, unit: '명', label: '주간 방문자', icon: '📅' },
    monthlyVisitors: { target: 15000, unit: '명', label: '월간 방문자', icon: '📆' },
    dailyCrawls: { target: 50, unit: '회', label: '일일 크롤링', icon: '🤖' },
    totalContent: { target: 500, unit: '개', label: '총 콘텐츠', icon: '🎬' },
    seoScore: { target: 95, unit: '점', label: 'SEO 점수', icon: '✅' },
    avgPageviews: { target: 3, unit: '페이지', label: '평균 페이지뷰/방문', icon: '📄' },
    searchReferralPct: { target: 40, unit: '%', label: '검색 유입 비율', icon: '🔍' },
}

const COMPETITOR_PROFILES = [
    { name: '안정권 기준', tier: 'target', dailyVisitors: 500, weeklyVisitors: 3500, monthlyVisitors: 15000, dailyCrawls: 50, totalContent: 500, seoScore: 95 },
    { name: '경쟁사 A (대형)', tier: 'large', dailyVisitors: 5000, weeklyVisitors: 35000, monthlyVisitors: 150000, dailyCrawls: 300, totalContent: 3000, seoScore: 98 },
    { name: '경쟁사 B (중형)', tier: 'medium', dailyVisitors: 1000, weeklyVisitors: 7000, monthlyVisitors: 30000, dailyCrawls: 100, totalContent: 1000, seoScore: 90 },
]

// ═══════════════════════════════════════════════════════════
// 주차별 경쟁사 벤치마크 (유사 규모 사이트 1~20주차 성장 기대치)
// ═══════════════════════════════════════════════════════════
const WEEKLY_BENCHMARKS: { week: number; dailyVisitors: number; dailyCrawls: number; content: number; searchPct: number; seoScore: number; phase: string }[] = [
    { week: 1, dailyVisitors: 5, dailyCrawls: 8, content: 20, searchPct: 0, seoScore: 55, phase: '런칭' },
    { week: 2, dailyVisitors: 10, dailyCrawls: 12, content: 35, searchPct: 0, seoScore: 60, phase: '런칭' },
    { week: 3, dailyVisitors: 18, dailyCrawls: 15, content: 50, searchPct: 1, seoScore: 65, phase: '초기 색인' },
    { week: 4, dailyVisitors: 25, dailyCrawls: 18, content: 70, searchPct: 2, seoScore: 68, phase: '초기 색인' },
    { week: 5, dailyVisitors: 35, dailyCrawls: 22, content: 90, searchPct: 3, seoScore: 70, phase: '성장 시작' },
    { week: 6, dailyVisitors: 50, dailyCrawls: 25, content: 110, searchPct: 5, seoScore: 72, phase: '성장 시작' },
    { week: 7, dailyVisitors: 65, dailyCrawls: 28, content: 130, searchPct: 7, seoScore: 74, phase: '성장 시작' },
    { week: 8, dailyVisitors: 85, dailyCrawls: 30, content: 150, searchPct: 10, seoScore: 76, phase: '성장 가속' },
    { week: 9, dailyVisitors: 100, dailyCrawls: 32, content: 175, searchPct: 12, seoScore: 78, phase: '성장 가속' },
    { week: 10, dailyVisitors: 120, dailyCrawls: 35, content: 200, searchPct: 15, seoScore: 80, phase: '성장 가속' },
    { week: 11, dailyVisitors: 140, dailyCrawls: 37, content: 220, searchPct: 17, seoScore: 81, phase: '안정화 진입' },
    { week: 12, dailyVisitors: 160, dailyCrawls: 38, content: 240, searchPct: 20, seoScore: 82, phase: '안정화 진입' },
    { week: 13, dailyVisitors: 180, dailyCrawls: 40, content: 260, searchPct: 22, seoScore: 83, phase: '안정화 진입' },
    { week: 14, dailyVisitors: 200, dailyCrawls: 42, content: 280, searchPct: 24, seoScore: 84, phase: '유기적 성장' },
    { week: 15, dailyVisitors: 220, dailyCrawls: 43, content: 300, searchPct: 26, seoScore: 85, phase: '유기적 성장' },
    { week: 16, dailyVisitors: 250, dailyCrawls: 44, content: 330, searchPct: 28, seoScore: 86, phase: '유기적 성장' },
    { week: 17, dailyVisitors: 280, dailyCrawls: 45, content: 360, searchPct: 30, seoScore: 87, phase: '안정권 근접' },
    { week: 18, dailyVisitors: 320, dailyCrawls: 46, content: 390, searchPct: 33, seoScore: 88, phase: '안정권 근접' },
    { week: 19, dailyVisitors: 380, dailyCrawls: 48, content: 420, searchPct: 35, seoScore: 89, phase: '안정권 근접' },
    { week: 20, dailyVisitors: 450, dailyCrawls: 50, content: 450, searchPct: 38, seoScore: 90, phase: '안정권 도달' },
]

interface SeoBenchmarkDashboardProps {
    seoAnalytics: any
    totalVideos: number
    totalStreamers: number
}

// ═══════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════
function clamp(val: number, min: number, max: number) { return Math.min(Math.max(val, min), max) }

function ProgressGauge({ value, target, label, unit, icon, invert }: {
    value: number; target: number; label: string; unit: string; icon: string; invert?: boolean
}) {
    const pct = invert
        ? clamp((1 - value / target) * 100, 0, 100) // 낮을수록 좋은 지표
        : clamp((value / target) * 100, 0, 100)
    const colorClass = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : pct >= 25 ? 'text-orange-400' : 'text-red-400'
    const bgColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : pct >= 25 ? 'bg-orange-500' : 'bg-red-500'
    const ringColor = pct >= 80 ? 'border-green-500/30' : pct >= 50 ? 'border-amber-500/30' : pct >= 25 ? 'border-orange-500/30' : 'border-red-500/30'

    return (
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full border-2 ${ringColor} flex items-center justify-center relative`}>
                    {/* SVG circular progress */}
                    <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" className="text-white/5" strokeWidth="3" />
                        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" className={colorClass}
                            strokeWidth="3" strokeDasharray={`${pct * 1.257} 126`} strokeLinecap="round" />
                    </svg>
                    <span className="text-sm z-10">{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary truncate">{label}</p>
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-lg font-bold ${colorClass}`}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
                        <span className="text-xs text-text-tertiary">/ {target.toLocaleString()}{unit}</span>
                    </div>
                </div>
            </div>
            {/* Bar */}
            <div className="w-full bg-white/5 rounded-full h-2">
                <div className={`${bgColor} rounded-full h-2 transition-all duration-700`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className={`text-right text-xs mt-1 font-mono ${colorClass}`}>{Math.round(pct)}%</p>
        </div>
    )
}

function CompetitorRow({ label, current, benchmarks, unit, highlight }: {
    label: string; current: number; benchmarks: number[]; unit: string; highlight?: boolean
}) {
    const pctOfTarget = benchmarks[0] > 0 ? Math.round((current / benchmarks[0]) * 100) : 0
    return (
        <tr className={`border-b border-white/5 ${highlight ? 'bg-accent-primary/5' : ''}`}>
            <td className="py-2 px-3 text-sm text-text-primary">{label}</td>
            <td className="py-2 px-3 text-sm font-mono text-accent-primary font-bold text-right">
                {current.toLocaleString()}{unit}
                <span className={`ml-2 text-xs ${pctOfTarget >= 80 ? 'text-green-400' : pctOfTarget >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    ({pctOfTarget}%)
                </span>
            </td>
            {benchmarks.map((val, i) => (
                <td key={i} className="py-2 px-3 text-sm font-mono text-text-secondary text-right">{val.toLocaleString()}{unit}</td>
            ))}
        </tr>
    )
}

// ═══════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════
export default function SeoBenchmarkDashboard({ seoAnalytics, totalVideos, totalStreamers }: SeoBenchmarkDashboardProps) {
    const { adminToken } = useAuth()

    // ─── 데이터 추출 ──────────────────────────────
    const summary = seoAnalytics?.summary || {}
    const dailyVisitors = seoAnalytics?.dailyVisitors || []
    const topReferrers = seoAnalytics?.topReferrers || []
    const topPages = seoAnalytics?.topPages || []
    const seoHealth = seoAnalytics?.seoHealth || {}

    // ─── 사이트맵 재제출 날짜 (B2 저장) ──────────────────
    const [sitemapLastSubmitted, setSitemapLastSubmitted] = useState<string | null>(null)
    const [sitemapSaving, setSitemapSaving] = useState(false)

    useEffect(() => {
        fetch('/api/settings?t=' + Date.now())
            .then(r => r.json())
            .then(d => { if (d?.sitemapLastSubmitted) setSitemapLastSubmitted(d.sitemapLastSubmitted) })
            .catch(() => { })
    }, [])

    const handleSitemapSubmitted = useCallback(async () => {
        setSitemapSaving(true)
        try {
            const res = await fetch('/api/settings?t=' + Date.now())
            const existing = await res.json()
            const now = new Date().toISOString()
            const saveRes = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(adminToken ? { 'x-admin-token': adminToken } : {})
                },
                body: JSON.stringify({ ...existing, sitemapLastSubmitted: now })
            })
            if (saveRes.ok) {
                setSitemapLastSubmitted(now)
            } else {
                console.error('Failed to save sitemap date: HTTP', saveRes.status)
                alert('저장에 실패했습니다. 관리자 로그인 상태를 확인해주세요.')
            }
        } catch (e) {
            console.error('Failed to save sitemap submission date:', e)
            alert('저장 중 오류가 발생했습니다.')
        } finally {
            setSitemapSaving(false)
        }
    }, [adminToken])

    const current = useMemo(() => {
        const totalPageViews = topPages.reduce((sum: number, p: any) => sum + (p.count || 0), 0)
        const searchRefs = topReferrers.filter((r: any) =>
            r.domain?.includes('google') || r.domain?.includes('naver') || r.domain?.includes('bing') || r.domain?.includes('yahoo') || r.domain?.includes('daum')
        )
        const totalRefCount = topReferrers.reduce((sum: number, r: any) => sum + (r.count || 0), 0)
        const searchPct = totalRefCount > 0 ? Math.round((searchRefs.reduce((s: number, r: any) => s + r.count, 0) / totalRefCount) * 100) : 0
        const avgPageviewsPerVisit = summary.totalVisits > 0 ? Math.round((totalPageViews / summary.totalVisits) * 10) / 10 : 0

        return {
            dailyVisitors: summary.todayVisits || 0,
            weeklyVisitors: summary.weeklyVisits || 0,
            monthlyVisitors: summary.monthlyVisits || 0,
            dailyCrawls: summary.todayBots || 0,
            totalContent: totalVideos || 0,
            seoScore: seoHealth.score || 0,
            avgPageviews: avgPageviewsPerVisit,
            searchReferralPct: searchPct,
        }
    }, [summary, topReferrers, topPages, seoHealth, totalVideos])

    // ─── 성장률 계산 ──────────────────────────────
    const growth = useMemo(() => {
        if (dailyVisitors.length < 7) return { weeklyGrowth: 0, avgGrowth: 0, trend: 'insufficient' as const }

        const sorted = [...dailyVisitors].sort((a: any, b: any) => a.date.localeCompare(b.date))
        const half = Math.floor(sorted.length / 2)
        const firstHalf = sorted.slice(0, half)
        const secondHalf = sorted.slice(half)

        const avgFirst = firstHalf.reduce((s: number, d: any) => s + d.visits, 0) / (firstHalf.length || 1)
        const avgSecond = secondHalf.reduce((s: number, d: any) => s + d.visits, 0) / (secondHalf.length || 1)

        const growthRate = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0
        const avgDaily = summary.avgDailyVisits || 0

        // Crawler growth
        const crawlFirst = firstHalf.reduce((s: number, d: any) => s + (d.bots || 0), 0) / (firstHalf.length || 1)
        const crawlSecond = secondHalf.reduce((s: number, d: any) => s + (d.bots || 0), 0) / (secondHalf.length || 1)
        const crawlGrowth = crawlFirst > 0 ? ((crawlSecond - crawlFirst) / crawlFirst) * 100 : 0

        return {
            weeklyGrowth: Math.round(growthRate * 10) / 10,
            crawlGrowth: Math.round(crawlGrowth * 10) / 10,
            avgDaily,
            trend: growthRate > 5 ? 'up' as const : growthRate < -5 ? 'down' as const : 'flat' as const,
        }
    }, [dailyVisitors, summary])

    // ─── 목표 도달 예상 시기 ──────────────────────────────
    const estimatedArrival = useMemo(() => {
        const targetDaily = BENCHMARKS.dailyVisitors.target
        const currentDaily = summary.avgDailyVisits || current.dailyVisitors || 0

        if (currentDaily >= targetDaily) return { days: 0, label: '🎉 목표 달성!', achieved: true }
        if (growth.weeklyGrowth <= 0) return { days: -1, label: '📉 성장률 부족 — 추가 최적화 필요', achieved: false }

        // Compound growth: days needed at current weekly growth rate
        const weeklyRate = growth.weeklyGrowth / 100
        if (weeklyRate <= 0) return { days: -1, label: '성장률 부족', achieved: false }

        // target = current * (1 + weeklyRate)^weeks
        const weeksNeeded = Math.log(targetDaily / currentDaily) / Math.log(1 + weeklyRate)
        const daysNeeded = Math.ceil(weeksNeeded * 7)

        if (daysNeeded > 365) return { days: daysNeeded, label: `약 ${Math.round(daysNeeded / 30)}개월 소요 예상`, achieved: false }
        if (daysNeeded > 60) return { days: daysNeeded, label: `약 ${Math.round(daysNeeded / 30)}개월 (${daysNeeded}일)`, achieved: false }
        return { days: daysNeeded, label: `약 ${daysNeeded}일 소요 예상`, achieved: false }
    }, [current, growth, summary])

    // ─── 성공 확률 ──────────────────────────────
    const successScore = useMemo(() => {
        let score = 0
        const factors: { name: string; score: number; max: number; status: string }[] = []

        // SEO 건강도 (30점)
        const seoPoints = Math.round((seoHealth.score || 0) * 0.3)
        factors.push({ name: 'SEO 기술 최적화', score: seoPoints, max: 30, status: seoPoints >= 25 ? '우수' : seoPoints >= 15 ? '보통' : '미흡' })
        score += seoPoints

        // 콘텐츠 양 (25점)
        const contentPct = Math.min(totalVideos / BENCHMARKS.totalContent.target, 1)
        const contentPoints = Math.round(contentPct * 25)
        factors.push({ name: '콘텐츠 양', score: contentPoints, max: 25, status: contentPoints >= 20 ? '우수' : contentPoints >= 12 ? '보통' : '미흡' })
        score += contentPoints

        // 크롤링 빈도 (20점)
        const crawlPct = Math.min((summary.todayBots || 0) / BENCHMARKS.dailyCrawls.target, 1)
        const crawlPoints = Math.round(crawlPct * 20)
        factors.push({ name: '크롤러 방문 빈도', score: crawlPoints, max: 20, status: crawlPoints >= 16 ? '우수' : crawlPoints >= 10 ? '보통' : '미흡' })
        score += crawlPoints

        // 성장 추세 (15점)
        const growthPoints = growth.weeklyGrowth > 10 ? 15 : growth.weeklyGrowth > 5 ? 12 : growth.weeklyGrowth > 0 ? 8 : growth.weeklyGrowth > -5 ? 4 : 0
        factors.push({ name: '성장 추세', score: growthPoints, max: 15, status: growthPoints >= 12 ? '우수' : growthPoints >= 8 ? '보통' : '미흡' })
        score += growthPoints

        // 검색 유입 비율 (10점)
        const searchPoints = Math.round(Math.min(current.searchReferralPct / BENCHMARKS.searchReferralPct.target, 1) * 10)
        factors.push({ name: '검색 엔진 유입 비율', score: searchPoints, max: 10, status: searchPoints >= 8 ? '우수' : searchPoints >= 5 ? '보통' : '미흡' })
        score += searchPoints

        return { score, factors }
    }, [seoHealth, totalVideos, summary, growth, current])

    // ─── 부족한 부분 & 추천 액션 ──────────────────────────────
    const weaknesses = useMemo(() => {
        const items: { severity: 'critical' | 'warning' | 'info'; title: string; description: string; action: string }[] = []

        if (current.dailyVisitors < BENCHMARKS.dailyVisitors.target * 0.3) {
            items.push({ severity: 'critical', title: '일일 방문자 매우 부족', description: `현재 ${current.dailyVisitors}명 (목표의 ${Math.round(current.dailyVisitors / BENCHMARKS.dailyVisitors.target * 100)}%)`, action: 'SNS 홍보, 커뮤니티 활동, 백링크 확보에 집중하세요' })
        } else if (current.dailyVisitors < BENCHMARKS.dailyVisitors.target * 0.6) {
            items.push({ severity: 'warning', title: '일일 방문자 부족', description: `현재 ${current.dailyVisitors}명 (목표 ${BENCHMARKS.dailyVisitors.target}명)`, action: '롱테일 키워드 콘텐츠 전략을 강화하세요' })
        }

        if (current.dailyCrawls < BENCHMARKS.dailyCrawls.target * 0.3) {
            items.push({ severity: 'critical', title: '크롤링 빈도 매우 낮음', description: `오늘 ${current.dailyCrawls}회 (목표 ${BENCHMARKS.dailyCrawls.target}회)`, action: 'Google Search Console에서 색인 요청하고, 사이트맵을 재제출하세요' })
        } else if (current.dailyCrawls < BENCHMARKS.dailyCrawls.target * 0.6) {
            items.push({ severity: 'warning', title: '크롤링 빈도 개선 필요', description: `오늘 ${current.dailyCrawls}회`, action: '새 콘텐츠를 자주 업로드하면 크롤링 빈도가 증가합니다' })
        }

        if (totalVideos < BENCHMARKS.totalContent.target * 0.3) {
            items.push({ severity: 'critical', title: '콘텐츠 양 부족', description: `현재 ${totalVideos}개 (목표 ${BENCHMARKS.totalContent.target}개)`, action: '꾸준히 새 콘텐츠를 추가하세요. 다양한 태그와 카테고리로 분산하면 효과적입니다' })
        } else if (totalVideos < BENCHMARKS.totalContent.target * 0.6) {
            items.push({ severity: 'warning', title: '콘텐츠 확충 필요', description: `현재 ${totalVideos}개`, action: '주 3-5개 이상의 새 콘텐츠 업로드를 목표로 하세요' })
        }

        if (current.searchReferralPct < 10) {
            items.push({ severity: 'warning', title: '검색 유입이 거의 없음', description: `검색 엔진 유입 ${current.searchReferralPct}%`, action: '검색 결과에 노출되려면 3-6개월의 시간이 필요할 수 있습니다. 꾸준히 콘텐츠를 업로드하세요' })
        }

        if (growth.weeklyGrowth <= 0) {
            items.push({ severity: 'warning', title: '성장세 정체', description: `주간 성장률 ${growth.weeklyGrowth}%`, action: '신규 콘텐츠 업로드, 소셜 미디어 마케팅, 커뮤니티 참여를 강화하세요' })
        }

        if (items.length === 0) {
            items.push({ severity: 'info', title: '전체적으로 양호합니다!', description: '현재 주요 지표가 목표 수준에 근접합니다', action: '현재 성장세를 유지하세요' })
        }

        return items
    }, [current, totalVideos, growth])

    const recommendations = useMemo(() => {
        const recs: { priority: number; icon: string; title: string; description: string }[] = []

        if (totalVideos < 100) recs.push({ priority: 1, icon: '🎬', title: '콘텐츠 100개 달성', description: '검색 엔진이 사이트를 신뢰하기 위한 최소 콘텐츠 수량입니다. 현재 속도를 유지하며 다양한 주제의 콘텐츠를 추가하세요.' })
        if (current.searchReferralPct < 20) recs.push({ priority: 2, icon: '🔗', title: '백링크 확보', description: '관련 커뮤니티, 블로그, SNS에서 사이트 링크를 공유하여 도메인 권위도를 높이세요.' })
        if (growth.weeklyGrowth < 5) recs.push({ priority: 3, icon: '📱', title: 'SNS 마케팅 강화', description: 'Twitter, Reddit, 커뮤니티 등에서 콘텐츠를 공유하여 초기 트래픽을 확보하세요.' })
        recs.push({ priority: 4, icon: '📝', title: '롱테일 키워드 공략', description: '경쟁이 적은 구체적 키워드(예: "아이돌 댄스 직캠", "K-pop 안무")로 검색 유입을 늘리세요.' })
        if (totalStreamers < 20) recs.push({ priority: 5, icon: '🌟', title: '스트리머 다양화', description: '다양한 스트리머를 추가하면 검색 키워드가 자연스럽게 확장됩니다.' })
        recs.push({ priority: 6, icon: '🌍', title: '다국어 SEO 유지', description: 'hreflang 태그와 다국어 지원을 유지하여 해외 유입을 극대화하세요.' })

        return recs.sort((a, b) => a.priority - b.priority).slice(0, 5)
    }, [totalVideos, totalStreamers, current, growth])

    // ─── 사이트맵 재제출 평가 ──────────────────────────────
    const sitemapEvaluation = useMemo(() => {
        const checks: { id: string; label: string; needed: boolean; reason: string; severity: 'info' | 'warning' | 'critical' }[] = []

        // 1. 사이트 런칭 초기 (데이터 7일 미만)
        const dataAge = dailyVisitors.length
        if (dataAge < 7) {
            checks.push({
                id: 'launch',
                label: '사이트 런칭 초기',
                needed: true,
                reason: `데이터 ${dataAge}일째 — 초기 런칭 시 사이트맵을 1회 제출하면 Google이 사이트 구조를 빠르게 파악합니다.`,
                severity: 'critical'
            })
        } else {
            checks.push({
                id: 'launch',
                label: '사이트 런칭 초기',
                needed: false,
                reason: `데이터 ${dataAge}일째 수집 중 — 초기 제출 단계를 이미 지남.`,
                severity: 'info'
            })
        }

        // 2. 콘텐츠 대량 변동 (50개 이상 또는 콘텐츠 대비 비율)
        const contentThreshold = Math.max(50, totalVideos * 0.3)
        const isContentMassive = totalVideos > 100 && totalVideos % 50 < 10 // 50단위 근처
        if (totalVideos < 30) {
            checks.push({
                id: 'content',
                label: '콘텐츠 양',
                needed: true,
                reason: `현재 ${totalVideos}개 — 콘텐츠가 아직 적어 사이트맵 제출로 색인 촉진이 필요합니다.`,
                severity: 'warning'
            })
        } else {
            checks.push({
                id: 'content',
                label: '콘텐츠 양',
                needed: false,
                reason: `현재 ${totalVideos}개 — 콘텐츠 양이 안정적이므로 Google이 자동으로 크롤링합니다.`,
                severity: 'info'
            })
        }

        // 3. 크롤링 빈도 급감
        const crawlTarget = BENCHMARKS.dailyCrawls.target
        if (current.dailyCrawls < crawlTarget * 0.2) {
            checks.push({
                id: 'crawl',
                label: '크롤링 빈도',
                needed: true,
                reason: `오늘 ${current.dailyCrawls}회 (목표의 ${Math.round((current.dailyCrawls / crawlTarget) * 100)}%) — 크롤링이 급감하여 사이트맵 재제출로 크롤링 촉진이 필요합니다.`,
                severity: 'critical'
            })
        } else if (current.dailyCrawls < crawlTarget * 0.4) {
            checks.push({
                id: 'crawl',
                label: '크롤링 빈도',
                needed: false,
                reason: `오늘 ${current.dailyCrawls}회 — 다소 낮지만 사이트맵 재제출보다 콘텐츠 추가가 더 효과적입니다.`,
                severity: 'warning'
            })
        } else {
            checks.push({
                id: 'crawl',
                label: '크롤링 빈도',
                needed: false,
                reason: `오늘 ${current.dailyCrawls}회 — 정상 크롤링 빈도입니다. 재제출 불필요.`,
                severity: 'info'
            })
        }

        // 4. 검색 유입 정체
        if (current.searchReferralPct === 0 && dataAge >= 14) {
            checks.push({
                id: 'search',
                label: '검색 유입',
                needed: true,
                reason: `${dataAge}일간 검색 유입 0% — 색인이 안 되어 있을 수 있으므로 사이트맵 상태를 확인하고 재제출하세요.`,
                severity: 'warning'
            })
        } else if (current.searchReferralPct < 5 && dataAge >= 14) {
            checks.push({
                id: 'search',
                label: '검색 유입',
                needed: false,
                reason: `검색 유입 ${current.searchReferralPct}% — 낮지만 색인은 되고 있습니다. 콘텐츠 확충이 더 효과적입니다.`,
                severity: 'warning'
            })
        } else {
            checks.push({
                id: 'search',
                label: '검색 유입',
                needed: false,
                reason: dataAge < 14
                    ? `아직 ${dataAge}일째 — 검색 유입까지 최소 2-4주 소요되므로 판단은 이릅니다.`
                    : `검색 유입 ${current.searchReferralPct}% — 정상적으로 색인되고 있습니다.`,
                severity: 'info'
            })
        }

        // 5. 새 페이지 타입 (topPages 분석)
        const uniquePaths = new Set((topPages || []).map((p: any) => {
            const parts = (p.page || '').split('/')
            return parts.length > 1 ? `/${parts[1]}` : '/'
        }))
        const hasVariety = uniquePaths.size >= 4
        if (hasVariety && dataAge < 14) {
            checks.push({
                id: 'pages',
                label: '페이지 구조',
                needed: true,
                reason: `${uniquePaths.size}개 경로 유형 감지 — 다양한 페이지 구조를 초기에 사이트맵으로 알리면 색인 효율이 높아집니다.`,
                severity: 'info'
            })
        } else {
            checks.push({
                id: 'pages',
                label: '페이지 구조',
                needed: false,
                reason: uniquePaths.size > 0
                    ? `${uniquePaths.size}개 경로 유형 — 이미 알려진 구조이므로 자동 크롤링에 맡겨도 됩니다.`
                    : '페이지 데이터가 아직 없습니다.',
                severity: 'info'
            })
        }

        // 최근 재제출 이후 경과일 계산
        const daysSinceSubmission = sitemapLastSubmitted
            ? Math.floor((Date.now() - new Date(sitemapLastSubmitted).getTime()) / (1000 * 60 * 60 * 24))
            : null

        // 최근 7일 이내 재제출 시 → 전부 '정상'으로 덮어씌움
        if (daysSinceSubmission !== null && daysSinceSubmission <= 7) {
            checks.forEach(c => {
                c.needed = false
                c.reason = `최근 ${daysSinceSubmission}일 전 재제출 완료 — ` + c.reason
            })
        }

        const needCount = checks.filter(c => c.needed).length
        const verdict = needCount >= 2 ? 'needed' as const
            : needCount === 1 ? 'optional' as const
                : 'unnecessary' as const

        return { checks, verdict, needCount, daysSinceSubmission }
    }, [dailyVisitors, totalVideos, current, topPages, sitemapLastSubmitted])

    // ─── 주간 성장률 비교 ──────────────────────────────
    const weeklyGrowthComparison = useMemo(() => {
        if (dailyVisitors.length < 2) return []

        const sorted = [...dailyVisitors].sort((a: any, b: any) => a.date.localeCompare(b.date))
        const weeks: { week: number; days: number; avgVisitors: number; avgBots: number; totalVisitors: number; growthPct: number | null }[] = []

        // Group by 7-day windows
        for (let i = 0; i < sorted.length; i += 7) {
            const chunk = sorted.slice(i, i + 7)
            const weekNum = Math.floor(i / 7) + 1
            const totalV = chunk.reduce((s: number, d: any) => s + (d.visits || 0), 0)
            const totalB = chunk.reduce((s: number, d: any) => s + (d.bots || 0), 0)
            const avgV = Math.round(totalV / chunk.length)
            const avgB = Math.round(totalB / chunk.length)

            const prevAvg = weeks.length > 0 ? weeks[weeks.length - 1].avgVisitors : null
            const growthPct = prevAvg && prevAvg > 0
                ? Math.round(((avgV - prevAvg) / prevAvg) * 1000) / 10
                : null

            weeks.push({
                week: weekNum,
                days: chunk.length,
                avgVisitors: avgV,
                avgBots: avgB,
                totalVisitors: totalV,
                growthPct
            })
        }

        return weeks
    }, [dailyVisitors])

    // ─── 주차별 경쟁사 벤치마크 비교 ──────────────────────────────
    const weeklyBenchmarkComparison = useMemo(() => {
        const currentWeek = Math.max(1, Math.ceil(dailyVisitors.length / 7))

        // Build per-week actual averages from weeklyGrowthComparison
        const actualByWeek: Record<number, { avgVisitors: number; avgBots: number }> = {}
        weeklyGrowthComparison.forEach(w => {
            actualByWeek[w.week] = { avgVisitors: w.avgVisitors, avgBots: w.avgBots }
        })

        return {
            currentWeek,
            rows: WEEKLY_BENCHMARKS.map(bm => {
                const actual = actualByWeek[bm.week]
                const isPast = bm.week < currentWeek
                const isCurrent = bm.week === currentWeek
                const isFuture = bm.week > currentWeek

                const myVisitors = isCurrent
                    ? (actual?.avgVisitors ?? current.dailyVisitors)
                    : (actual?.avgVisitors ?? null)
                const myCrawls = isCurrent
                    ? (actual?.avgBots ?? current.dailyCrawls)
                    : (actual?.avgBots ?? null)
                const myContent = isCurrent ? totalVideos : null
                const mySearchPct = isCurrent ? current.searchReferralPct : null
                const mySeoScore = isCurrent ? current.seoScore : null

                // Achievement percentages
                const visitorPct = myVisitors !== null && bm.dailyVisitors > 0 ? Math.round((myVisitors / bm.dailyVisitors) * 100) : null
                const crawlPct = myCrawls !== null && bm.dailyCrawls > 0 ? Math.round((myCrawls / bm.dailyCrawls) * 100) : null

                return {
                    ...bm,
                    isPast,
                    isCurrent,
                    isFuture,
                    myVisitors,
                    myCrawls,
                    myContent,
                    mySearchPct,
                    mySeoScore,
                    visitorPct,
                    crawlPct,
                }
            })
        }
    }, [dailyVisitors, weeklyGrowthComparison, current, totalVideos])

    // ═══════════════════════════════════════════════════════════
    // 렌더링
    // ═══════════════════════════════════════════════════════════
    if (!seoAnalytics) return null

    const successColor = successScore.score >= 80 ? 'text-green-400 border-green-500' : successScore.score >= 60 ? 'text-amber-400 border-amber-500' : successScore.score >= 40 ? 'text-orange-400 border-orange-500' : 'text-red-400 border-red-500'
    const successBg = successScore.score >= 80 ? 'from-green-500/20' : successScore.score >= 60 ? 'from-amber-500/20' : successScore.score >= 40 ? 'from-orange-500/20' : 'from-red-500/20'

    return (
        <div className="bg-bg-primary rounded-xl p-6 border border-white/10 space-y-6 mt-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-accent-primary text-lg">🏆 경쟁사 벤치마크 & 성장 분석</h3>
                <span className="text-xs text-text-tertiary">안정권 기준: 유사 규모 동영상 사이트</span>
            </div>

            {/* ───── 1. 목표 진행률 게이지 ───── */}
            <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-3">🎯 안정권 목표 대비 진행률</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ProgressGauge value={current.dailyVisitors} target={BENCHMARKS.dailyVisitors.target} label={BENCHMARKS.dailyVisitors.label} unit={BENCHMARKS.dailyVisitors.unit} icon={BENCHMARKS.dailyVisitors.icon} />
                    <ProgressGauge value={current.weeklyVisitors} target={BENCHMARKS.weeklyVisitors.target} label={BENCHMARKS.weeklyVisitors.label} unit={BENCHMARKS.weeklyVisitors.unit} icon={BENCHMARKS.weeklyVisitors.icon} />
                    <ProgressGauge value={current.dailyCrawls} target={BENCHMARKS.dailyCrawls.target} label={BENCHMARKS.dailyCrawls.label} unit={BENCHMARKS.dailyCrawls.unit} icon={BENCHMARKS.dailyCrawls.icon} />
                    <ProgressGauge value={current.totalContent} target={BENCHMARKS.totalContent.target} label={BENCHMARKS.totalContent.label} unit={BENCHMARKS.totalContent.unit} icon={BENCHMARKS.totalContent.icon} />
                    <ProgressGauge value={current.seoScore} target={BENCHMARKS.seoScore.target} label={BENCHMARKS.seoScore.label} unit={BENCHMARKS.seoScore.unit} icon={BENCHMARKS.seoScore.icon} />
                    <ProgressGauge value={current.monthlyVisitors} target={BENCHMARKS.monthlyVisitors.target} label={BENCHMARKS.monthlyVisitors.label} unit={BENCHMARKS.monthlyVisitors.unit} icon={BENCHMARKS.monthlyVisitors.icon} />
                    <ProgressGauge value={current.avgPageviews} target={BENCHMARKS.avgPageviews.target} label={BENCHMARKS.avgPageviews.label} unit={BENCHMARKS.avgPageviews.unit} icon={BENCHMARKS.avgPageviews.icon} />
                    <ProgressGauge value={current.searchReferralPct} target={BENCHMARKS.searchReferralPct.target} label={BENCHMARKS.searchReferralPct.label} unit={BENCHMARKS.searchReferralPct.unit} icon={BENCHMARKS.searchReferralPct.icon} />
                </div>
            </div>

            {/* ───── 2. 경쟁사 비교표 ───── */}
            <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-3">📊 경쟁사 비교 분석</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-2 px-3 text-xs text-text-tertiary font-medium">지표</th>
                                <th className="py-2 px-3 text-xs text-accent-primary font-bold text-right">현재 (내 사이트)</th>
                                {COMPETITOR_PROFILES.map(c => (
                                    <th key={c.name} className={`py-2 px-3 text-xs font-medium text-right ${c.tier === 'target' ? 'text-green-400' : 'text-text-tertiary'}`}>
                                        {c.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <CompetitorRow label="일일 방문자" current={current.dailyVisitors} benchmarks={COMPETITOR_PROFILES.map(c => c.dailyVisitors)} unit="명" highlight />
                            <CompetitorRow label="주간 방문자" current={current.weeklyVisitors} benchmarks={COMPETITOR_PROFILES.map(c => c.weeklyVisitors)} unit="명" />
                            <CompetitorRow label="월간 방문자" current={current.monthlyVisitors} benchmarks={COMPETITOR_PROFILES.map(c => c.monthlyVisitors)} unit="명" highlight />
                            <CompetitorRow label="일일 크롤링" current={current.dailyCrawls} benchmarks={COMPETITOR_PROFILES.map(c => c.dailyCrawls)} unit="회" />
                            <CompetitorRow label="총 콘텐츠" current={current.totalContent} benchmarks={COMPETITOR_PROFILES.map(c => c.totalContent)} unit="개" highlight />
                            <CompetitorRow label="SEO 점수" current={current.seoScore} benchmarks={COMPETITOR_PROFILES.map(c => c.seoScore)} unit="점" />
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ───── 3. 성장률 & 4. 도달 예상 ───── */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* 성장률 */}
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm font-semibold text-text-secondary mb-3">📈 성장률 분석</h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-secondary">방문자 성장률 (기간 전/후반 비교)</span>
                            <span className={`text-lg font-bold font-mono ${growth.weeklyGrowth > 0 ? 'text-green-400' : growth.weeklyGrowth < 0 ? 'text-red-400' : 'text-text-tertiary'}`}>
                                {growth.weeklyGrowth > 0 ? '↑ ' : growth.weeklyGrowth < 0 ? '↓ ' : '→ '}
                                {Math.abs(growth.weeklyGrowth)}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-secondary">크롤러 증감률</span>
                            <span className={`text-lg font-bold font-mono ${(growth.crawlGrowth || 0) > 0 ? 'text-green-400' : (growth.crawlGrowth || 0) < 0 ? 'text-red-400' : 'text-text-tertiary'}`}>
                                {(growth.crawlGrowth || 0) > 0 ? '↑ ' : (growth.crawlGrowth || 0) < 0 ? '↓ ' : '→ '}
                                {Math.abs(growth.crawlGrowth || 0)}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-secondary">일 평균 방문자</span>
                            <span className="text-lg font-bold font-mono text-white">{growth.avgDaily || 0}명</span>
                        </div>
                        <div className="mt-2 p-2 bg-white/5 rounded-lg">
                            <p className="text-xs text-text-tertiary">
                                {growth.trend === 'up' ? '🟢 성장세입니다. 현재 전략을 유지하세요.' :
                                    growth.trend === 'down' ? '🔴 하락세입니다. 콘텐츠 업로드와 프로모션을 강화하세요.' :
                                        growth.trend === 'flat' ? '🟡 보합세입니다. 신규 콘텐츠와 마케팅 전략을 다양화하세요.' :
                                            '⚪ 분석을 위한 데이터가 아직 부족합니다 (최소 7일 이상 필요)'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 예상 도달 시기 */}
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm font-semibold text-text-secondary mb-3">🕐 안정권 도달 예상</h4>
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-16 h-16 rounded-full ${estimatedArrival.achieved ? 'bg-green-500/20 border-green-500' : 'bg-blue-500/20 border-blue-500'} border-2 flex items-center justify-center`}>
                            <span className="text-xl">{estimatedArrival.achieved ? '🎉' : estimatedArrival.days < 0 ? '⚠️' : '⏳'}</span>
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${estimatedArrival.achieved ? 'text-green-400' : estimatedArrival.days < 0 ? 'text-amber-400' : 'text-white'}`}>
                                {estimatedArrival.label}
                            </p>
                            <p className="text-xs text-text-tertiary mt-1">
                                {estimatedArrival.achieved ? '축하합니다! 기본 목표를 달성했습니다.' :
                                    estimatedArrival.days < 0 ? '현재 성장률이 0 이하라 예측이 어렵습니다.' :
                                        `현재 주간 ${growth.weeklyGrowth}% 성장률 기준`}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-text-tertiary">현재 일 평균</span>
                            <span className="text-white font-mono">{growth.avgDaily || current.dailyVisitors}명</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-text-tertiary">안정권 기준</span>
                            <span className="text-green-400 font-mono">{BENCHMARKS.dailyVisitors.target}명/일</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-text-tertiary">필요 성장 배수</span>
                            <span className="text-amber-400 font-mono">
                                {(growth.avgDaily || current.dailyVisitors) > 0
                                    ? `×${(BENCHMARKS.dailyVisitors.target / (growth.avgDaily || current.dailyVisitors || 1)).toFixed(1)}`
                                    : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ───── NEW: 사이트맵 재제출 평가 ───── */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-text-secondary mb-3">🗺️ 사이트맵 재제출 평가</h4>
                <div className={`p-3 rounded-lg border mb-3 ${sitemapEvaluation.verdict === 'needed' ? 'bg-red-500/10 border-red-500/30' :
                    sitemapEvaluation.verdict === 'optional' ? 'bg-amber-500/10 border-amber-500/30' :
                        'bg-green-500/10 border-green-500/30'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                            {sitemapEvaluation.verdict === 'needed' ? '🔴' :
                                sitemapEvaluation.verdict === 'optional' ? '🟡' : '🟢'}
                        </span>
                        <span className={`text-sm font-bold ${sitemapEvaluation.verdict === 'needed' ? 'text-red-400' :
                            sitemapEvaluation.verdict === 'optional' ? 'text-amber-400' : 'text-green-400'
                            }`}>
                            {sitemapEvaluation.verdict === 'needed' ? '재제출 권장' :
                                sitemapEvaluation.verdict === 'optional' ? '선택 사항 (1개 항목 해당)' :
                                    '재제출 불필요'}
                        </span>
                    </div>
                    <p className="text-xs text-text-tertiary">
                        {sitemapEvaluation.verdict === 'needed'
                            ? `${sitemapEvaluation.needCount}개 항목에서 재제출이 필요합니다. Google Search Console에서 사이트맵을 확인하고 재제출하세요.`
                            : sitemapEvaluation.verdict === 'optional'
                                ? '필수는 아니지만, 원하시면 1회 재제출해도 무방합니다. 기존 색인은 유지됩니다.'
                                : '현재 사이트맵 상태가 양호합니다. 불필요한 재제출은 오히려 비효율적입니다.'}
                    </p>
                </div>
                <div className="space-y-2">
                    {sitemapEvaluation.checks.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
                            <span className="text-sm mt-0.5 shrink-0">
                                {c.needed ? '⚠️' : '✅'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-white">{c.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.needed ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'
                                        }`}>
                                        {c.needed ? '재제출 필요' : '정상'}
                                    </span>
                                </div>
                                <p className="text-xs text-text-tertiary mt-0.5">{c.reason}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-3 p-2 bg-white/5 rounded-lg">
                    <p className="text-[10px] text-text-tertiary">
                        💡 참고: 사이트맵 재제출은 기존 색인을 삭제하지 않습니다. 신규 URL 발견을 촉진하는 요청일 뿐입니다.
                    </p>
                </div>
                {/* 재제출 완료 버튼 + 날짜 */}
                <div className="mt-3 flex items-center gap-3">
                    <button
                        onClick={handleSitemapSubmitted}
                        disabled={sitemapSaving}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {sitemapSaving ? (
                            <>
                                <span className="inline-block w-3 h-3 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                                저장 중...
                            </>
                        ) : '✅ 재제출 완료'}
                    </button>
                    {sitemapLastSubmitted && (
                        <span className="text-xs text-text-tertiary">
                            최근 재제출: <span className="text-white font-mono">{new Date(sitemapLastSubmitted).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                            {sitemapEvaluation.daysSinceSubmission !== null && (
                                <span className="ml-1 text-text-tertiary">({sitemapEvaluation.daysSinceSubmission}일 전)</span>
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* ───── NEW: 주차별 경쟁사 벤치마크 비교 ───── */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-text-secondary">📊 주차별 경쟁사 벤치마크 비교 (1~20주)</h4>
                    <span className="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded-full font-semibold">
                        📍 현재 {weeklyBenchmarkComparison.currentWeek}주차
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-2 px-2 text-[10px] text-text-tertiary font-medium">주차</th>
                                <th className="py-2 px-2 text-[10px] text-text-tertiary font-medium">단계</th>
                                <th className="py-2 px-2 text-[10px] text-text-tertiary font-medium text-right" colSpan={2}>일평균 방문자</th>
                                <th className="py-2 px-2 text-[10px] text-text-tertiary font-medium text-right" colSpan={2}>일평균 크롤러</th>
                                <th className="py-2 px-2 text-[10px] text-text-tertiary font-medium text-right">콘텐츠</th>
                                <th className="py-2 px-2 text-[10px] text-text-tertiary font-medium text-right">검색%</th>
                                <th className="py-2 px-2 text-[10px] text-text-tertiary font-medium text-right">SEO</th>
                            </tr>
                            <tr className="border-b border-white/5">
                                <th></th>
                                <th></th>
                                <th className="py-1 px-2 text-[9px] text-text-tertiary text-right">기대</th>
                                <th className="py-1 px-2 text-[9px] text-accent-primary text-right">실제</th>
                                <th className="py-1 px-2 text-[9px] text-text-tertiary text-right">기대</th>
                                <th className="py-1 px-2 text-[9px] text-accent-primary text-right">실제</th>
                                <th className="py-1 px-2 text-[9px] text-text-tertiary text-right">기대</th>
                                <th className="py-1 px-2 text-[9px] text-text-tertiary text-right">기대</th>
                                <th className="py-1 px-2 text-[9px] text-text-tertiary text-right">기대</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyBenchmarkComparison.rows.map((r) => {
                                const pctColor = (pct: number | null) => {
                                    if (pct === null) return 'text-text-tertiary'
                                    if (pct >= 120) return 'text-emerald-400'
                                    if (pct >= 80) return 'text-green-400'
                                    if (pct >= 50) return 'text-amber-400'
                                    return 'text-red-400'
                                }
                                return (
                                    <tr key={r.week} className={`border-b border-white/5 transition-colors ${r.isCurrent ? 'bg-accent-primary/10 ring-1 ring-accent-primary/30' :
                                        r.isPast ? 'hover:bg-white/5' :
                                            'opacity-40 hover:opacity-70'
                                        }`}>
                                        <td className="py-1.5 px-2 text-xs whitespace-nowrap">
                                            <span className={`font-semibold ${r.isCurrent ? 'text-accent-primary' : r.isPast ? 'text-white' : 'text-text-tertiary'}`}>
                                                {r.week}주
                                            </span>
                                            {r.isCurrent && (
                                                <span className="ml-1 text-[9px] px-1 py-0.5 bg-accent-primary/30 text-accent-primary rounded animate-pulse">📍 현재</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.phase === '런칭' ? 'bg-blue-500/10 text-blue-400' :
                                                r.phase === '초기 색인' ? 'bg-purple-500/10 text-purple-400' :
                                                    r.phase === '성장 시작' ? 'bg-cyan-500/10 text-cyan-400' :
                                                        r.phase === '성장 가속' ? 'bg-teal-500/10 text-teal-400' :
                                                            r.phase === '안정화 진입' ? 'bg-amber-500/10 text-amber-400' :
                                                                r.phase === '유기적 성장' ? 'bg-lime-500/10 text-lime-400' :
                                                                    r.phase === '안정권 근접' ? 'bg-orange-500/10 text-orange-400' :
                                                                        'bg-green-500/10 text-green-400'
                                                }`}>{r.phase}</span>
                                        </td>
                                        {/* 일평균 방문자 — 기대 */}
                                        <td className="py-1.5 px-2 text-[11px] text-right font-mono text-text-tertiary">{r.dailyVisitors}</td>
                                        {/* 일평균 방문자 — 실제 */}
                                        <td className="py-1.5 px-2 text-[11px] text-right font-mono">
                                            {r.myVisitors !== null ? (
                                                <span className={`font-semibold ${pctColor(r.visitorPct)}`}>
                                                    {r.myVisitors}
                                                    {r.visitorPct !== null && (
                                                        <span className="text-[9px] ml-0.5">({r.visitorPct}%)</span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-text-tertiary/50">—</span>
                                            )}
                                        </td>
                                        {/* 일평균 크롤러 — 기대 */}
                                        <td className="py-1.5 px-2 text-[11px] text-right font-mono text-text-tertiary">{r.dailyCrawls}</td>
                                        {/* 일평균 크롤러 — 실제 */}
                                        <td className="py-1.5 px-2 text-[11px] text-right font-mono">
                                            {r.myCrawls !== null ? (
                                                <span className={`font-semibold ${pctColor(r.crawlPct)}`}>
                                                    {r.myCrawls}
                                                    {r.crawlPct !== null && (
                                                        <span className="text-[9px] ml-0.5">({r.crawlPct}%)</span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-text-tertiary/50">—</span>
                                            )}
                                        </td>
                                        {/* 콘텐츠 */}
                                        <td className="py-1.5 px-2 text-[11px] text-right font-mono">
                                            {r.isCurrent && r.myContent !== null ? (
                                                <span className={`font-semibold ${r.myContent >= r.content ? 'text-green-400' : r.myContent >= r.content * 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {r.myContent}<span className="text-text-tertiary">/{r.content}</span>
                                                </span>
                                            ) : (
                                                <span className="text-text-tertiary">{r.content}</span>
                                            )}
                                        </td>
                                        {/* 검색 유입% */}
                                        <td className="py-1.5 px-2 text-[11px] text-right font-mono">
                                            {r.isCurrent && r.mySearchPct !== null ? (
                                                <span className={`font-semibold ${r.mySearchPct >= r.searchPct ? 'text-green-400' : 'text-amber-400'}`}>
                                                    {r.mySearchPct}<span className="text-text-tertiary">/{r.searchPct}%</span>
                                                </span>
                                            ) : (
                                                <span className="text-text-tertiary">{r.searchPct}%</span>
                                            )}
                                        </td>
                                        {/* SEO */}
                                        <td className="py-1.5 px-2 text-[11px] text-right font-mono">
                                            {r.isCurrent && r.mySeoScore !== null ? (
                                                <span className={`font-semibold ${r.mySeoScore >= r.seoScore ? 'text-green-400' : 'text-amber-400'}`}>
                                                    {r.mySeoScore}<span className="text-text-tertiary">/{r.seoScore}</span>
                                                </span>
                                            ) : (
                                                <span className="text-text-tertiary">{r.seoScore}</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {/* 범례 */}
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-text-tertiary">
                    <span>🟢 <span className="text-green-400">80%↑ 달성</span></span>
                    <span>🟡 <span className="text-amber-400">50~79%</span></span>
                    <span>🔴 <span className="text-red-400">50%↓</span></span>
                    <span>🌟 <span className="text-emerald-400">120%↑ 초과달성</span></span>
                </div>
                <div className="mt-2 p-2 bg-white/5 rounded-lg">
                    <p className="text-[10px] text-text-tertiary">
                        💡 유사 규모 동영상 콘텐츠 사이트의 평균 성장 곡선 기준입니다. 실제 성장 속도는 콘텐츠 품질, 마케팅, 백링크 등에 따라 차이가 있을 수 있습니다.
                    </p>
                </div>
            </div>

            {/* ───── NEW: 주간 성장률 비교 ───── */}
            {weeklyGrowthComparison.length > 0 && (
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm font-semibold text-text-secondary mb-3">📅 주간 성장률 비교</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-2 px-3 text-xs text-text-tertiary font-medium">주차</th>
                                    <th className="py-2 px-3 text-xs text-text-tertiary font-medium text-right">일수</th>
                                    <th className="py-2 px-3 text-xs text-text-tertiary font-medium text-right">일평균 방문</th>
                                    <th className="py-2 px-3 text-xs text-text-tertiary font-medium text-right">일평균 크롤러</th>
                                    <th className="py-2 px-3 text-xs text-text-tertiary font-medium text-right">총 방문</th>
                                    <th className="py-2 px-3 text-xs text-text-tertiary font-medium text-right">전주 대비</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weeklyGrowthComparison.map((w, i) => {
                                    const isCurrentWeek = i === weeklyGrowthComparison.length - 1
                                    return (
                                        <tr key={w.week} className={`border-b border-white/5 ${isCurrentWeek ? 'bg-accent-primary/5' : 'hover:bg-white/5'
                                            }`}>
                                            <td className="py-2 px-3 text-xs">
                                                <span className={`font-semibold ${isCurrentWeek ? 'text-accent-primary' : 'text-white'}`}>
                                                    {w.week}주차
                                                </span>
                                                {isCurrentWeek && (
                                                    <span className="ml-1 text-[10px] px-1 py-0.5 bg-accent-primary/20 text-accent-primary rounded">현재</span>
                                                )}
                                                {w.days < 7 && (
                                                    <span className="ml-1 text-[10px] text-text-tertiary">({w.days}일)</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-xs text-right text-text-secondary font-mono">{w.days}일</td>
                                            <td className="py-2 px-3 text-xs text-right font-mono text-white font-semibold">{w.avgVisitors}명</td>
                                            <td className="py-2 px-3 text-xs text-right font-mono text-cyan-400">{w.avgBots}회</td>
                                            <td className="py-2 px-3 text-xs text-right font-mono text-text-secondary">{w.totalVisitors.toLocaleString()}</td>
                                            <td className="py-2 px-3 text-xs text-right font-mono">
                                                {w.growthPct !== null ? (
                                                    <span className={`font-semibold ${w.growthPct > 0 ? 'text-green-400' :
                                                        w.growthPct < 0 ? 'text-red-400' : 'text-text-tertiary'
                                                        }`}>
                                                        {w.growthPct > 0 ? '↑' : w.growthPct < 0 ? '↓' : '→'}
                                                        {' '}{Math.abs(w.growthPct)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-text-tertiary">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {weeklyGrowthComparison.length >= 2 && (
                        <div className="mt-3 p-2 bg-white/5 rounded-lg">
                            <p className="text-xs text-text-tertiary">
                                {(() => {
                                    const lastComplete = weeklyGrowthComparison.filter(w => w.days === 7)
                                    if (lastComplete.length < 2) return '⚪ 완전한 주간 비교를 위해 최소 2주 이상의 데이터가 필요합니다.'
                                    const last = lastComplete[lastComplete.length - 1]
                                    const first = lastComplete[0]
                                    const overallGrowth = first.avgVisitors > 0
                                        ? Math.round(((last.avgVisitors - first.avgVisitors) / first.avgVisitors) * 1000) / 10
                                        : 0
                                    return overallGrowth > 0
                                        ? `🟢 ${lastComplete.length}주간 종합: ${first.avgVisitors}명 → ${last.avgVisitors}명 (${overallGrowth}% 성장)`
                                        : overallGrowth < 0
                                            ? `🔴 ${lastComplete.length}주간 종합: ${first.avgVisitors}명 → ${last.avgVisitors}명 (${overallGrowth}% 감소)`
                                            : `🟡 ${lastComplete.length}주간 종합: 변동 없음`
                                })()}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ───── 5. 성공 확률 ───── */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-text-secondary mb-3">🏆 안정권 도달 성공 확률</h4>
                <div className="flex items-center gap-6 mb-4">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${successBg} to-transparent border-2 ${successColor} flex items-center justify-center`}>
                        <span className={`text-2xl font-bold ${successColor.split(' ')[0]}`}>{successScore.score}</span>
                    </div>
                    <div>
                        <p className={`text-xl font-bold ${successColor.split(' ')[0]}`}>
                            {successScore.score >= 80 ? '매우 높음' : successScore.score >= 60 ? '양호' : successScore.score >= 40 ? '보통' : '개선 필요'}
                        </p>
                        <p className="text-xs text-text-tertiary mt-1">100점 만점 기준 종합 성공 지표</p>
                    </div>
                </div>
                <div className="space-y-2">
                    {successScore.factors.map((f, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-text-secondary w-32 shrink-0">{f.name}</span>
                            <div className="flex-1 bg-white/5 rounded-full h-2">
                                <div
                                    className={`rounded-full h-2 transition-all duration-500 ${f.score / f.max >= 0.8 ? 'bg-green-500' : f.score / f.max >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${(f.score / f.max) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs font-mono text-text-tertiary w-12 text-right">{f.score}/{f.max}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${f.status === '우수' ? 'bg-green-500/10 text-green-400' : f.status === '보통' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                {f.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ───── 6. 부족한 부분 ───── */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-text-secondary mb-3">⚠️ 개선이 필요한 영역</h4>
                <div className="space-y-3">
                    {weaknesses.map((w, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${w.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                            w.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                'bg-green-500/10 border-green-500/20'
                            }`}>
                            <div className="flex items-start gap-2">
                                <span className="text-sm mt-0.5">
                                    {w.severity === 'critical' ? '🔴' : w.severity === 'warning' ? '🟡' : '🟢'}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-white">{w.title}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">{w.description}</p>
                                    <p className="text-xs text-text-tertiary mt-1">💡 {w.action}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ───── 7. SEO 체크리스트 ───── */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-text-secondary mb-3">📋 SEO 기술 체크리스트</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                        { label: 'XML Sitemap', done: true },
                        { label: 'Video Sitemap', done: true },
                        { label: 'Robots.txt', done: true },
                        { label: 'Google 인증', done: true },
                        { label: 'Google Analytics', done: true },
                        { label: 'OG Tags', done: true },
                        { label: 'JSON-LD Schema', done: true },
                        { label: 'hreflang 태그', done: true },
                        { label: '한국어 키워드', done: true },
                        { label: 'FAQPage Schema', done: true },
                        { label: 'VideoObject Schema', done: true },
                        { label: 'Canonical URL', done: true },
                    ].map((item, i) => (
                        <div key={i} className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${item.done ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            <span>{item.done ? '✅' : '❌'}</span>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ───── 8. 크롤러 상세 분석 ───── */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-text-secondary mb-3">🕷️ 크롤러 상세 분석</h4>

                {/* Bot Overview Stats */}
                {(() => {
                    const bo = seoAnalytics?.botOverview
                    const botDist = seoAnalytics?.botDistribution || []
                    const botDaily = seoAnalytics?.botDailyTrend || []
                    const botPages = seoAnalytics?.botPageDistribution || []

                    if (!bo || bo.totalCrawls === 0) {
                        return (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🔴</span>
                                    <span className="text-sm font-bold text-red-400">크롤러 감지 기록 없음</span>
                                </div>
                                <p className="text-xs text-text-secondary">
                                    선택한 기간 동안 크롤러 방문이 감지되지 않았습니다. 이는 다음 원인 중 하나일 수 있습니다:
                                </p>
                                <ul className="text-xs text-text-tertiary mt-2 space-y-1 list-disc list-inside">
                                    <li>사이트가 아직 검색 엔진에 발견되지 않음 (신규 사이트)</li>
                                    <li>서버사이드 봇 감지 <code className="text-accent-primary">middleware.ts</code>가 최근 배포 후 아직 데이터가 쌓이지 않음</li>
                                    <li>Google Search Console에서 사이트맵을 제출하지 않았을 수 있음</li>
                                </ul>
                                <p className="text-xs text-amber-400 mt-2">
                                    💡 서버사이드 봇 감지가 활성화되어 있습니다. 배포 후 크롤러 데이터가 쌓이기까지 1~3일 소요될 수 있습니다.
                                </p>
                            </div>
                        )
                    }

                    return (
                        <div className="space-y-4">
                            {/* Summary cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white/5 rounded-lg p-3 text-center">
                                    <p className="text-lg font-bold text-cyan-400 font-mono">{bo.totalCrawls}</p>
                                    <p className="text-[10px] text-text-tertiary mt-1">총 크롤 횟수</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 text-center">
                                    <p className="text-lg font-bold text-purple-400 font-mono">{bo.uniqueBots}</p>
                                    <p className="text-[10px] text-text-tertiary mt-1">봇 종류</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 text-center">
                                    <p className="text-lg font-bold text-green-400 font-mono">{bo.avgDailyCrawls}</p>
                                    <p className="text-[10px] text-text-tertiary mt-1">일 평균 크롤</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 text-center">
                                    <p className="text-lg font-bold text-amber-400 font-mono">{bo.daysWithBots}<span className="text-text-tertiary text-xs">/{bo.daysWithBots + bo.daysWithoutBots}</span></p>
                                    <p className="text-[10px] text-text-tertiary mt-1">방문 날짜</p>
                                </div>
                            </div>

                            {/* Most active bot */}
                            <div className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-text-tertiary">가장 활발한 봇</span>
                                    <p className="text-sm font-semibold text-white mt-0.5">{bo.mostActiveBot}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-accent-primary font-mono">{bo.mostActiveBotCount}회</span>
                                    <p className="text-[10px] text-text-tertiary">
                                        ({bo.totalCrawls > 0 ? Math.round(bo.mostActiveBotCount / bo.totalCrawls * 100) : 0}% 비중)
                                    </p>
                                </div>
                            </div>

                            {/* Bot type distribution */}
                            {botDist.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-text-tertiary mb-2">🤖 봇 유형 분포</h5>
                                    <div className="space-y-1.5">
                                        {botDist.map((b: any, i: number) => {
                                            const maxCount = botDist[0]?.count || 1
                                            const pct = Math.round((b.count / bo.totalCrawls) * 100)
                                            const barW = Math.max(4, (b.count / maxCount) * 100)

                                            // Color coding based on bot type
                                            const isSearchBot = ['googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'naverbot', 'applebot'].some(s =>
                                                b.name.toLowerCase().includes(s)
                                            )
                                            const isSocialBot = ['facebot', 'twitterbot', 'linkedinbot', 'discordbot', 'telegrambot'].some(s =>
                                                b.name.toLowerCase().includes(s)
                                            )
                                            const barColor = isSearchBot ? 'bg-green-500' : isSocialBot ? 'bg-blue-500' : 'bg-gray-500'
                                            const labelColor = isSearchBot ? 'text-green-400' : isSocialBot ? 'text-blue-400' : 'text-text-secondary'

                                            return (
                                                <div key={i} className="flex items-center gap-2 group">
                                                    <span className={`text-xs w-28 truncate shrink-0 ${labelColor}`} title={b.name}>
                                                        {isSearchBot ? '🔍' : isSocialBot ? '💬' : '🤖'} {b.name}
                                                    </span>
                                                    <div className="flex-1 bg-white/5 rounded-full h-2">
                                                        <div
                                                            className={`rounded-full h-2 transition-all ${barColor}`}
                                                            style={{ width: `${barW}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-mono text-text-tertiary w-14 text-right shrink-0">{b.count}회 ({pct}%)</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="mt-2 flex gap-4 text-[10px] text-text-tertiary">
                                        <span>🔍 <span className="text-green-400">검색엔진</span></span>
                                        <span>💬 <span className="text-blue-400">소셜봇</span></span>
                                        <span>🤖 <span className="text-text-secondary">기타</span></span>
                                    </div>
                                </div>
                            )}

                            {/* Bot daily trend */}
                            {botDaily.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-text-tertiary mb-2">📅 일별 크롤러 추이</h5>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="py-1.5 px-2 text-[10px] text-text-tertiary font-medium">날짜</th>
                                                    <th className="py-1.5 px-2 text-[10px] text-text-tertiary font-medium text-right">총 크롤</th>
                                                    <th className="py-1.5 px-2 text-[10px] text-text-tertiary font-medium">주요 봇</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {botDaily.slice(-14).map((d: any, i: number) => (
                                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="py-1.5 px-2 text-xs text-text-secondary font-mono">{d.date}</td>
                                                        <td className="py-1.5 px-2 text-xs text-right font-mono text-cyan-400 font-semibold">{d.total}</td>
                                                        <td className="py-1.5 px-2">
                                                            <div className="flex flex-wrap gap-1">
                                                                {d.bots.slice(0, 4).map((b: any, j: number) => (
                                                                    <span key={j} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-text-tertiary">
                                                                        {b.name}: {b.count}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Pages crawled by bots */}
                            {botPages.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-text-tertiary mb-2">📄 봇이 자주 크롤한 페이지</h5>
                                    <div className="space-y-1">
                                        {botPages.slice(0, 10).map((p: any, i: number) => {
                                            const maxC = botPages[0]?.count || 1
                                            const barW = Math.max(4, (p.count / maxC) * 100)
                                            return (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="text-xs text-text-secondary w-40 truncate shrink-0 font-mono" title={p.path}>{p.path}</span>
                                                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                                                        <div className="rounded-full h-1.5 bg-cyan-500" style={{ width: `${barW}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-mono text-text-tertiary w-10 text-right">{p.count}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Date info */}
                            {(bo.firstSeen || bo.lastSeen) && (
                                <div className="flex gap-4 text-[10px] text-text-tertiary p-2 bg-white/5 rounded-lg">
                                    {bo.firstSeen && <span>📅 최초 감지: <span className="text-white font-mono">{bo.firstSeen}</span></span>}
                                    {bo.lastSeen && <span>📅 최근 감지: <span className="text-white font-mono">{bo.lastSeen}</span></span>}
                                </div>
                            )}
                        </div>
                    )
                })()}
            </div>

            {/* ───── 9. AI 추천 액션 ───── */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-text-secondary mb-3">💡 추천 우선순위 (AI 분석)</h4>
                <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-sm">{rec.icon}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-1.5 py-0.5 bg-accent-primary/20 text-accent-primary rounded font-mono">P{rec.priority}</span>
                                    <span className="text-sm font-semibold text-white">{rec.title}</span>
                                </div>
                                <p className="text-xs text-text-secondary mt-1">{rec.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
