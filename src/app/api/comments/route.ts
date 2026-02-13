import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

const COMMENTS_FILE = 'data/comments.json'

// GET: Retrieve comments (optionally filter by videoId)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const videoId = searchParams.get('videoId')

        const allComments = await getJsonFile(COMMENTS_FILE) || []

        if (videoId) {
            const filtered = allComments.filter((c: any) => c.videoId === videoId)
            return NextResponse.json({ comments: filtered })
        }

        return NextResponse.json({ comments: allComments })
    } catch (error) {
        console.error('GET /api/comments error:', error)
        return NextResponse.json({ comments: [] })
    }
}

// POST: Add a new comment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { comment } = body

        if (!comment || !comment.videoId || !comment.text) {
            return NextResponse.json({ error: 'Missing comment data' }, { status: 400 })
        }

        const allComments = await getJsonFile(COMMENTS_FILE) || []

        // Add new comment at the beginning
        allComments.unshift(comment)

        // Keep max 5000 comments
        const trimmed = allComments.slice(0, 5000)

        const saved = await saveJsonFile(COMMENTS_FILE, trimmed)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save comments' }, { status: 500 })
        }

        return NextResponse.json({ success: true, totalComments: trimmed.length })
    } catch (error) {
        console.error('POST /api/comments error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE: Remove a comment by ID
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const commentId = searchParams.get('commentId')

        if (!commentId) {
            return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })
        }

        const allComments = await getJsonFile(COMMENTS_FILE) || []
        const filtered = allComments.filter((c: any) => c.id !== commentId)

        if (filtered.length === allComments.length) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
        }

        const saved = await saveJsonFile(COMMENTS_FILE, filtered)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('DELETE /api/comments error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
