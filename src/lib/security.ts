/**
 * Security Module - Server-side authentication & audit logging
 * 
 * Provides:
 * - Admin API key verification for protected routes
 * - Rate limiting per IP
 * - Security event logging (stored on B2)
 * - Request validation helpers
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getJsonFile, saveJsonFile } from './b2'

// ─── Admin Token ───────────────────────────────────────────────────────
// The ADMIN_API_SECRET is set in environment variables (.env.local / Vercel).
// All sensitive API calls must include this token in the header.
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || ''

// Hash the admin password to compare (never store plaintext on server)
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ''
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''

// ─── Security Log Types ────────────────────────────────────────────────
export type SecurityEventType =
    | 'AUTH_SUCCESS'
    | 'AUTH_FAILURE'
    | 'UNAUTHORIZED_ACCESS'
    | 'FILE_UPLOAD'
    | 'FILE_DELETE'
    | 'DB_MODIFY'
    | 'SETTINGS_MODIFY'
    | 'RATE_LIMIT_HIT'
    | 'SUSPICIOUS_REQUEST'
    | 'ADMIN_LOGIN'
    | 'ADMIN_LOGIN_FAILED'
    | 'API_ERROR'

export interface SecurityEvent {
    id: string
    timestamp: string
    type: SecurityEventType
    severity: 'low' | 'medium' | 'high' | 'critical'
    ip: string
    userAgent: string
    path: string
    method: string
    details: string
    blocked: boolean
}

// ─── In-Memory Rate Limiter ────────────────────────────────────────────
interface RateLimitEntry {
    count: number
    firstRequest: number
    blocked: boolean
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Config: Max requests per window
const RATE_LIMIT_CONFIG = {
    windowMs: 60 * 1000,       // 1 minute window
    maxRequests: 300,           // 300 requests per minute for general (admin panel polls frequently)
    maxWriteRequests: 120,      // 120 write operations per minute
    blockDurationMs: 60 * 1000, // Block for 1 minute after limit hit (was 5 min — too aggressive)
}

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    const keys = Array.from(rateLimitStore.keys())
    for (const key of keys) {
        const entry = rateLimitStore.get(key)
        if (entry && now - entry.firstRequest > RATE_LIMIT_CONFIG.blockDurationMs) {
            rateLimitStore.delete(key)
        }
    }
}, 5 * 60 * 1000)

// ─── Helper Functions ──────────────────────────────────────────────────

export function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    if (forwarded) return forwarded.split(',')[0].trim()
    if (realIp) return realIp
    return '0.0.0.0'
}

export function getUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'Unknown'
}

/**
 * Hash a password with SHA-256 for comparison
 */
export function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * Generate a secure API token
 */
export function generateToken(): string {
    return crypto.randomBytes(48).toString('hex')
}

// ─── Rate Limiting ─────────────────────────────────────────────────────

export function checkRateLimit(ip: string, isWrite: boolean = false): { allowed: boolean; remaining: number } {
    const key = `${ip}:${isWrite ? 'write' : 'read'}`
    const now = Date.now()
    const maxReq = isWrite ? RATE_LIMIT_CONFIG.maxWriteRequests : RATE_LIMIT_CONFIG.maxRequests

    let entry = rateLimitStore.get(key)

    if (!entry) {
        entry = { count: 1, firstRequest: now, blocked: false }
        rateLimitStore.set(key, entry)
        return { allowed: true, remaining: maxReq - 1 }
    }

    // If blocked, check if block duration has passed
    if (entry.blocked) {
        if (now - entry.firstRequest < RATE_LIMIT_CONFIG.blockDurationMs) {
            return { allowed: false, remaining: 0 }
        }
        // Reset after block duration
        entry.count = 1
        entry.firstRequest = now
        entry.blocked = false
        return { allowed: true, remaining: maxReq - 1 }
    }

    // Check if window has passed
    if (now - entry.firstRequest > RATE_LIMIT_CONFIG.windowMs) {
        entry.count = 1
        entry.firstRequest = now
        return { allowed: true, remaining: maxReq - 1 }
    }

    entry.count++

    if (entry.count > maxReq) {
        entry.blocked = true
        return { allowed: false, remaining: 0 }
    }

    return { allowed: true, remaining: maxReq - entry.count }
}

// ─── Authentication Verification ───────────────────────────────────────

/**
 * Verify that the request has a valid admin token.
 * The token is sent as `x-admin-token` header.
 */
export function verifyAdminToken(request: NextRequest): boolean {
    if (!ADMIN_API_SECRET) {
        console.warn('[Security] ADMIN_API_SECRET not configured! Falling back to legacy auth.')
        return false
    }
    const token = request.headers.get('x-admin-token')
    if (!token) return false
    // Timing-safe comparison
    try {
        const a = new Uint8Array(Buffer.from(token))
        const b = new Uint8Array(Buffer.from(ADMIN_API_SECRET))
        if (a.length !== b.length) return false
        return crypto.timingSafeEqual(a, b)
    } catch {
        return false
    }
}

/**
 * Verify admin credentials (email + password hash)
 */
export function verifyAdminCredentials(email: string, password: string): boolean {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
        console.warn('[Security] Admin credentials not set in env vars!')
        return false
    }
    const passwordHash = hashPassword(password)
    const emailMatch = email === ADMIN_EMAIL
    try {
        const a = new Uint8Array(Buffer.from(passwordHash))
        const b = new Uint8Array(Buffer.from(ADMIN_PASSWORD_HASH))
        if (a.length !== b.length) return false
        const hashMatch = crypto.timingSafeEqual(a, b)
        return emailMatch && hashMatch
    } catch {
        return false
    }
}

// ─── Security Event Logging ────────────────────────────────────────────

const SECURITY_LOG_FILE = 'security-log.json'
const MAX_LOG_ENTRIES = 500 // Keep last 500 events

// In-memory buffer to batch writes
let logBuffer: SecurityEvent[] = []
let logFlushTimer: NodeJS.Timeout | null = null

export async function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: SecurityEvent = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
    }

    logBuffer.push(fullEvent)

    // Batch flush: write to B2 every 10 seconds or if buffer > 10 events
    if (logBuffer.length >= 10) {
        await flushSecurityLogs()
    } else if (!logFlushTimer) {
        logFlushTimer = setTimeout(async () => {
            await flushSecurityLogs()
        }, 10000)
    }
}

async function flushSecurityLogs(): Promise<void> {
    if (logBuffer.length === 0) return

    const eventsToFlush = [...logBuffer]
    logBuffer = []

    if (logFlushTimer) {
        clearTimeout(logFlushTimer)
        logFlushTimer = null
    }

    try {
        const existing = await getJsonFile(SECURITY_LOG_FILE) || []
        const combined = [...existing, ...eventsToFlush]
        // Keep only the last MAX_LOG_ENTRIES
        const trimmed = combined.slice(-MAX_LOG_ENTRIES)
        await saveJsonFile(SECURITY_LOG_FILE, trimmed)
    } catch (e) {
        console.error('[Security] Failed to flush security logs:', e)
        // Put events back in buffer for next attempt
        logBuffer = [...eventsToFlush, ...logBuffer]
    }
}

export async function getSecurityLogs(): Promise<SecurityEvent[]> {
    try {
        const logs = await getJsonFile(SECURITY_LOG_FILE) || []
        // Merge with unflushed buffer
        return [...logs, ...logBuffer].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
    } catch {
        return logBuffer
    }
}

// ─── Protected Route Helper ────────────────────────────────────────────

/**
 * Wraps an API handler with admin-only protection.
 * Returns 401 if unauthorized, logs security events.
 */
export async function withAdminProtection(
    request: NextRequest,
    handler: () => Promise<NextResponse>
): Promise<NextResponse> {
    const ip = getClientIP(request)
    const ua = getUserAgent(request)
    const path = new URL(request.url).pathname
    const method = request.method

    // 1. Rate limiting
    const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
    const rateCheck = checkRateLimit(ip, isWrite)

    if (!rateCheck.allowed) {
        // Fire-and-forget: don't block API response on log write
        logSecurityEvent({
            type: 'RATE_LIMIT_HIT',
            severity: 'high',
            ip, userAgent: ua, path, method,
            details: `Rate limit exceeded. IP blocked for ${RATE_LIMIT_CONFIG.blockDurationMs / 1000}s`,
            blocked: true,
        }).catch(() => { })
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_CONFIG.blockDurationMs / 1000) } }
        )
    }

    // 2. Admin token verification
    const isAuthorized = verifyAdminToken(request)

    if (!isAuthorized) {
        // Fire-and-forget: don't block API response on log write
        logSecurityEvent({
            type: 'UNAUTHORIZED_ACCESS',
            severity: 'critical',
            ip, userAgent: ua, path, method,
            details: `Unauthorized ${method} attempt to ${path}`,
            blocked: true,
        }).catch(() => { })
        return NextResponse.json(
            { error: 'Unauthorized. Admin access required.' },
            { status: 401 }
        )
    }

    // 3. Log the authorized action
    let eventType: SecurityEventType = 'AUTH_SUCCESS'
    if (path.includes('/upload') || path.includes('/videos')) {
        if (method === 'DELETE') eventType = 'FILE_DELETE'
        else if (method === 'POST') eventType = 'FILE_UPLOAD'
    } else if (path.includes('/db') || path.includes('/data')) {
        eventType = 'DB_MODIFY'
    } else if (path.includes('/settings')) {
        eventType = 'SETTINGS_MODIFY'
    }

    // Fire-and-forget: don't block API response on log write
    logSecurityEvent({
        type: eventType,
        severity: 'low',
        ip, userAgent: ua, path, method,
        details: `Authorized admin action: ${method} ${path}`,
        blocked: false,
    }).catch(() => { })

    // 4. Execute the handler
    try {
        return await handler()
    } catch (error: any) {
        logSecurityEvent({
            type: 'API_ERROR',
            severity: 'medium',
            ip, userAgent: ua, path, method,
            details: `API error: ${error.message}`,
            blocked: false,
        }).catch(() => { })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * Read-only protection - still rate limits but doesn't require admin token.
 * Used for public GET operations that are safe to expose.
 */
export async function withRateLimitProtection(
    request: NextRequest,
    handler: () => Promise<NextResponse>
): Promise<NextResponse> {
    const ip = getClientIP(request)
    const ua = getUserAgent(request)
    const path = new URL(request.url).pathname
    const method = request.method

    const rateCheck = checkRateLimit(ip, false)

    if (!rateCheck.allowed) {
        await logSecurityEvent({
            type: 'RATE_LIMIT_HIT',
            severity: 'high',
            ip, userAgent: ua, path, method,
            details: `Rate limit exceeded on public route.`,
            blocked: true,
        })
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
        )
    }

    try {
        return await handler()
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
