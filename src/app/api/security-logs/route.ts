import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection, getSecurityLogs, logSecurityEvent, getClientIP, getUserAgent } from '@/lib/security'

export const dynamic = 'force-dynamic'

// GET - Fetch security logs (admin only)
export async function GET(request: NextRequest) {
    return withAdminProtection(request, async () => {
        const logs = await getSecurityLogs()

        // Calculate stats
        const now = new Date()
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const recentLogs = logs.filter(l => new Date(l.timestamp) > last24h)
        const weekLogs = logs.filter(l => new Date(l.timestamp) > last7d)

        const stats = {
            total: logs.length,
            last24h: recentLogs.length,
            last7d: weekLogs.length,
            blockedAttempts: logs.filter(l => l.blocked).length,
            blockedLast24h: recentLogs.filter(l => l.blocked).length,
            criticalEvents: recentLogs.filter(l => l.severity === 'critical').length,
            uniqueIPs: new Set(recentLogs.map(l => l.ip)).size,
            byType: {
                unauthorized: recentLogs.filter(l => l.type === 'UNAUTHORIZED_ACCESS').length,
                rateLimited: recentLogs.filter(l => l.type === 'RATE_LIMIT_HIT').length,
                fileDeleted: recentLogs.filter(l => l.type === 'FILE_DELETE').length,
                fileUploaded: recentLogs.filter(l => l.type === 'FILE_UPLOAD').length,
                dbModified: recentLogs.filter(l => l.type === 'DB_MODIFY').length,
                loginFailed: recentLogs.filter(l => l.type === 'ADMIN_LOGIN_FAILED').length,
                suspicious: recentLogs.filter(l => l.type === 'SUSPICIOUS_REQUEST').length,
            },
            // Top attacking IPs
            topBlockedIPs: getTopBlockedIPs(recentLogs),
        }

        return NextResponse.json({ logs, stats })
    })
}

function getTopBlockedIPs(logs: any[]): { ip: string; count: number; lastSeen: string }[] {
    const blocked = logs.filter(l => l.blocked)
    const ipMap = new Map<string, { count: number; lastSeen: string }>()

    for (const log of blocked) {
        const existing = ipMap.get(log.ip)
        if (existing) {
            existing.count++
            if (new Date(log.timestamp) > new Date(existing.lastSeen)) {
                existing.lastSeen = log.timestamp
            }
        } else {
            ipMap.set(log.ip, { count: 1, lastSeen: log.timestamp })
        }
    }

    return Array.from(ipMap.entries())
        .map(([ip, data]) => ({ ip, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
}
