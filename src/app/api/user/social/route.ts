import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

// GET: Retrieve user's likes and follows
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const filename = `user-data/${user.id}/social.json`
        const data = await getJsonFile(filename)

        return NextResponse.json({
            likes: data?.likes || [],
            follows: data?.follows || []
        })
    } catch (error) {
        console.error('GET /api/user/social error:', error)
        return NextResponse.json({ likes: [], follows: [] })
    }
}

// POST: Update likes or follows
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { type, action, targetId } = body

        if (!type || !action || !targetId) {
            return NextResponse.json({ error: 'Missing type, action, or targetId' }, { status: 400 })
        }

        const filename = `user-data/${user.id}/social.json`
        const data = await getJsonFile(filename) || { likes: [], follows: [] }

        if (type === 'like') {
            if (action === 'add' && !data.likes.includes(targetId)) {
                data.likes.unshift(targetId)
            } else if (action === 'remove') {
                data.likes = data.likes.filter((id: string) => id !== targetId)
            }
        } else if (type === 'follow') {
            if (action === 'add' && !data.follows.includes(targetId)) {
                data.follows.push(targetId)
            } else if (action === 'remove') {
                data.follows = data.follows.filter((id: string) => id !== targetId)
            }
        }

        // Keep max 500 likes and 500 follows
        data.likes = data.likes.slice(0, 500)
        data.follows = data.follows.slice(0, 500)

        const saved = await saveJsonFile(filename, data)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
        }

        return NextResponse.json({ success: true, likes: data.likes, follows: data.follows })
    } catch (error) {
        console.error('POST /api/user/social error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
