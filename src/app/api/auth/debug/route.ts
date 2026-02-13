import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const ip = getClientIP(request)
    const adminSecret = process.env.ADMIN_API_SECRET
    const receivedToken = request.headers.get('x-admin-token')

    let status = 'error'
    let message = 'Unknown error'
    let tokenMatch = false

    if (!adminSecret) {
        status = 'config_error'
        message = 'ADMIN_API_SECRET environment variable is NOT set on the server.'
    } else {
        if (!receivedToken) {
            status = 'missing_token'
            message = 'x-admin-token header was NOT received.'
        } else {
            if (receivedToken === adminSecret) {
                status = 'success'
                message = 'Token matches! Authentication should work.'
                tokenMatch = true
            } else {
                status = 'token_mismatch'
                message = 'Token received but does NOT match the server secret.'
                // Security: don't reveal the actual secret
            }
        }
    }

    return NextResponse.json({
        status,
        message,
        serverTime: new Date().toISOString(),
        clientIP: ip,
        envCheck: {
            ADMIN_API_SECRET_SET: !!adminSecret,
            ADMIN_API_SECRET_LENGTH: adminSecret ? adminSecret.length : 0,
            B2_APPLICATION_KEY_ID_SET: !!process.env.B2_APPLICATION_KEY_ID,
            B2_APPLICATION_KEY_SET: !!process.env.B2_APPLICATION_KEY,
            B2_BUCKET_ID_SET: !!process.env.B2_BUCKET_ID,
        },
        requestCheck: {
            hasTokenHeader: !!receivedToken,
            tokenLength: receivedToken ? receivedToken.length : 0,
            tokenMatch,
        }
    })
}
