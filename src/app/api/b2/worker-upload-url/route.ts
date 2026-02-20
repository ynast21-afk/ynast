import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY
const B2_BUCKET_ID = process.env.B2_BUCKET_ID

// GET - Get B2 upload URL for worker (admin only)
export async function GET(request: NextRequest) {
    return withAdminProtection(request, async () => {
        try {
            // Authorize with B2
            const credentials = Buffer.from(`${B2_APPLICATION_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64')
            const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
                headers: { 'Authorization': `Basic ${credentials}` },
                cache: 'no-store',
            })

            if (!authRes.ok) {
                throw new Error('B2 auth failed')
            }

            const auth = await authRes.json()
            const bucketId = B2_BUCKET_ID || auth.allowed?.bucketId

            // Get upload URL
            const uploadRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bucketId }),
            })

            if (!uploadRes.ok) {
                throw new Error('Failed to get upload URL')
            }

            const uploadData = await uploadRes.json()

            // Resolve bucket name
            let bucketName = auth.allowed?.bucketName || process.env.B2_BUCKET_NAME || 'yna-backup'

            return NextResponse.json({
                uploadUrl: uploadData.uploadUrl,
                authorizationToken: uploadData.authorizationToken,
                downloadUrl: auth.downloadUrl,
                bucketName,
                apiUrl: auth.apiUrl,
                accountAuthToken: auth.authorizationToken,
                bucketId,
            })
        } catch (error: any) {
            console.error('Error getting B2 upload URL:', error)
            return NextResponse.json({ error: 'Failed to get B2 upload URL' }, { status: 500 })
        }
    })
}
