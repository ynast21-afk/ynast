'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Brush,
    CartesianGrid,
    ReferenceLine,
} from 'recharts'

interface DataPoint {
    date: string
    label?: string
    visits: number
    bots?: number
}

interface InteractiveVisitorChartProps {
    data: DataPoint[]
    viewType?: 'daily' | 'weekly' | 'monthly'
}

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const d = payload[0]?.payload
    return (
        <div className="bg-black/95 border border-white/20 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
            <p className="text-xs font-bold text-accent-primary mb-1">{d?.label || d?.date || label}</p>
            <p className="text-sm text-white">
                👤 방문자: <span className="font-bold text-green-400">{d?.visits?.toLocaleString() || 0}</span>명
            </p>
            {d?.bots !== undefined && d.bots > 0 && (
                <p className="text-xs text-cyan-400 mt-0.5">
                    🤖 크롤러: {d.bots.toLocaleString()}
                </p>
            )}
        </div>
    )
}

// 브러시(미니맵)용 커스텀 traveler (핸들)
const CustomBrushTraveler = (props: any) => {
    const { x, y, width, height } = props
    return (
        <rect
            x={x}
            y={y}
            width={Math.max(width, 8)}
            height={height}
            rx={4}
            ry={4}
            fill="#22c55e"
            fillOpacity={0.8}
            stroke="#16a34a"
            strokeWidth={1}
            style={{ cursor: 'ew-resize' }}
        />
    )
}

export default function InteractiveVisitorChart({ data, viewType = 'daily' }: InteractiveVisitorChartProps) {
    // 데이터 정렬 (날짜 오름차순)
    const sortedData = useMemo(() => {
        if (!data || data.length === 0) return []
        return [...data].sort((a, b) => {
            const da = a.label || a.date || ''
            const db = b.label || b.date || ''
            return da.localeCompare(db)
        })
    }, [data])

    // 범위 프리셋
    const presets = useMemo(() => {
        const len = sortedData.length
        const list = []
        if (len > 7) list.push({ label: '7일', count: 7 })
        if (len > 30) list.push({ label: '30일', count: 30 })
        if (len > 90) list.push({ label: '90일', count: 90 })
        if (len > 365) list.push({ label: '1년', count: 365 })
        list.push({ label: '전체', count: len })
        return list
    }, [sortedData.length])

    // 브러시 범위 상태
    const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number }>({
        startIndex: Math.max(sortedData.length - Math.min(sortedData.length, 30), 0),
        endIndex: sortedData.length - 1,
    })

    // 평균선 계산 (현재 보이는 범위)
    const avgVisits = useMemo(() => {
        if (sortedData.length === 0) return 0
        const start = brushRange.startIndex
        const end = brushRange.endIndex
        const slice = sortedData.slice(start, end + 1)
        if (slice.length === 0) return 0
        return Math.round(slice.reduce((sum, d) => sum + d.visits, 0) / slice.length)
    }, [sortedData, brushRange])

    // 보이는 데이터 수
    const visibleCount = brushRange.endIndex - brushRange.startIndex + 1

    // 브러시 변경 핸들러
    const handleBrushChange = useCallback((e: any) => {
        if (e && typeof e.startIndex === 'number' && typeof e.endIndex === 'number') {
            setBrushRange({ startIndex: e.startIndex, endIndex: e.endIndex })
        }
    }, [])

    // 프리셋 클릭
    const handlePreset = useCallback((count: number) => {
        const end = sortedData.length - 1
        const start = Math.max(end - count + 1, 0)
        setBrushRange({ startIndex: start, endIndex: end })
    }, [sortedData.length])

    if (sortedData.length === 0) {
        return (
            <div className="bg-black/20 rounded-xl p-6 border border-white/5 text-center">
                <p className="text-text-tertiary text-sm">데이터가 없습니다</p>
            </div>
        )
    }

    // 짧은 날짜 라벨용 포맷터
    const formatXTick = (value: string) => {
        if (!value) return ''
        // "2026-02-20" → "02-20" 또는 "2026-W08" → "W08"
        if (value.includes('-W')) return value.slice(-3)
        return value.slice(-5)
    }

    // Y축 포맷 (큰 숫자 축약)
    const formatYTick = (value: number) => {
        if (value >= 10000) return `${(value / 1000).toFixed(0)}k`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
        return value.toString()
    }

    const viewLabel = viewType === 'daily' ? '일별' : viewType === 'weekly' ? '주별' : '월별'

    return (
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            {/* 헤더 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                <div>
                    <h4 className="text-sm font-semibold text-text-secondary">
                        📈 {viewLabel} 방문자 추이
                    </h4>
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                        {sortedData.length}일 데이터 중 {visibleCount}일 표시 · 평균{' '}
                        <span className="text-green-400 font-mono">{avgVisits.toLocaleString()}</span>명/일
                    </p>
                </div>
                {/* 범위 프리셋 버튼 */}
                <div className="flex gap-1 flex-wrap">
                    {presets.map(p => {
                        const isActive =
                            p.count === sortedData.length
                                ? brushRange.startIndex === 0 && brushRange.endIndex === sortedData.length - 1
                                : brushRange.endIndex - brushRange.startIndex + 1 === p.count &&
                                brushRange.endIndex === sortedData.length - 1
                        return (
                            <button
                                key={p.label}
                                onClick={() => handlePreset(p.count)}
                                className={`px-2 py-0.5 text-[10px] rounded-md transition-all ${isActive
                                    ? 'bg-green-500/30 text-green-400 font-bold ring-1 ring-green-500/30'
                                    : 'bg-white/5 text-text-tertiary hover:bg-white/10 hover:text-text-secondary'
                                    }`}
                            >
                                {p.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 차트 */}
            <ResponsiveContainer width="100%" height={220}>
                <BarChart
                    data={sortedData}
                    margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey={(d: DataPoint) => d.label || d.date}
                        tickFormatter={formatXTick}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }}
                        interval={visibleCount <= 14 ? 0 : visibleCount <= 60 ? Math.floor(visibleCount / 10) : 'preserveStartEnd'}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                        tickFormatter={formatYTick}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <ReferenceLine
                        y={avgVisits}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                        label={{
                            value: `평균 ${avgVisits}`,
                            position: 'right',
                            style: { fontSize: 9, fill: '#f59e0b', opacity: 0.8 },
                        }}
                    />
                    <Bar
                        dataKey="visits"
                        fill="#22c55e"
                        fillOpacity={0.75}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={visibleCount <= 14 ? 40 : visibleCount <= 60 ? 16 : 8}
                        activeBar={{ fillOpacity: 1, stroke: '#22c55e', strokeWidth: 1 }}
                    />
                    {/* 하단 미니맵 (Brush) - 드래그로 범위 선택 */}
                    <Brush
                        dataKey={(d: DataPoint) => d.label || d.date}
                        height={28}
                        fill="rgba(0,0,0,0.3)"
                        stroke="rgba(255,255,255,0.15)"
                        startIndex={brushRange.startIndex}
                        endIndex={brushRange.endIndex}
                        onChange={handleBrushChange}
                        tickFormatter={formatXTick}
                        travellerWidth={8}
                    >
                        <BarChart data={sortedData}>
                            <Bar dataKey="visits" fill="#22c55e" fillOpacity={0.3} />
                        </BarChart>
                    </Brush>
                </BarChart>
            </ResponsiveContainer>

            {/* 안내 문구 */}
            <p className="text-[9px] text-text-tertiary text-center mt-1">
                💡 하단 초록색 바를 드래그하여 범위를 이동하거나, 양쪽 핸들을 끌어 확대/축소할 수 있습니다
            </p>
        </div>
    )
}
