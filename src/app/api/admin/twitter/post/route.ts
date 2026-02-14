import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'
import crypto from 'crypto'

const TWEET_HISTORY_FILE = 'data/tweet-history.json'

interface TweetHistoryItem {
    id: string
    videoId: string
    videoTitle: string
    streamerName: string
    tweetText: string
    tweetId?: string
    postedAt: string
    status: 'success' | 'error'
    errorMessage?: string
}

// GET: Retrieve tweet history
export async function GET() {
    try {
        const history = await getJsonFile(TWEET_HISTORY_FILE) || []
        return NextResponse.json({ history })
    } catch (error) {
        console.error('GET /api/admin/twitter/post error:', error)
        return NextResponse.json({ history: [] })
    }
}

// POST: Post tweet to X (Twitter)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { tweetText, videoId, videoTitle, streamerName } = body

        if (!tweetText) {
            return NextResponse.json({ error: 'Missing tweet text' }, { status: 400 })
        }

        // Check Twitter API credentials
        const apiKey = process.env.TWITTER_API_KEY
        const apiSecret = process.env.TWITTER_API_SECRET
        const accessToken = process.env.TWITTER_ACCESS_TOKEN
        const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

        if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
            return NextResponse.json({
                error: 'Twitter API credentials not configured. Please set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET in .env.local',
                missingCredentials: true
            }, { status: 400 })
        }

        // Post tweet using Twitter API v2 with OAuth 1.0a
        const tweetResult = await postTweet(tweetText, {
            apiKey, apiSecret, accessToken, accessTokenSecret
        })

        // Save to history
        const historyItem: TweetHistoryItem = {
            id: `tweet_${Date.now()}`,
            videoId: videoId || '',
            videoTitle: videoTitle || '',
            streamerName: streamerName || '',
            tweetText,
            tweetId: tweetResult.tweetId,
            postedAt: new Date().toISOString(),
            status: tweetResult.success ? 'success' : 'error',
            errorMessage: tweetResult.error
        }

        const history: TweetHistoryItem[] = await getJsonFile(TWEET_HISTORY_FILE) || []
        history.unshift(historyItem)
        const trimmed = history.slice(0, 200) // Keep last 200 tweets
        await saveJsonFile(TWEET_HISTORY_FILE, trimmed)

        if (!tweetResult.success) {
            return NextResponse.json({
                error: tweetResult.error,
                history: historyItem
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            tweetId: tweetResult.tweetId,
            tweetUrl: `https://x.com/i/web/status/${tweetResult.tweetId}`,
            history: historyItem
        })

    } catch (error) {
        console.error('POST /api/admin/twitter/post error:', error)
        return NextResponse.json({ error: 'Failed to post tweet' }, { status: 500 })
    }
}

interface TwitterCredentials {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessTokenSecret: string
}

async function postTweet(text: string, creds: TwitterCredentials): Promise<{ success: boolean; tweetId?: string; error?: string }> {
    const url = 'https://api.twitter.com/2/tweets'
    const method = 'POST'

    // Generate OAuth 1.0a signature
    const oauthParams: Record<string, string> = {
        oauth_consumer_key: creds.apiKey,
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_token: creds.accessToken,
        oauth_version: '1.0'
    }

    // Create signature base string
    const sortedParams = Object.keys(oauthParams).sort().map(k =>
        `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`
    ).join('&')

    const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`
    const signingKey = `${encodeURIComponent(creds.apiSecret)}&${encodeURIComponent(creds.accessTokenSecret)}`

    const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64')
    oauthParams['oauth_signature'] = signature

    // Build Authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams).sort().map(k =>
        `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
    ).join(', ')

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Twitter API error:', response.status, JSON.stringify(data))
            const errorMsg = data.detail || data.title || data.errors?.[0]?.message || `Twitter API error: ${response.status}`
            return {
                success: false,
                error: `[${response.status}] ${errorMsg}`
            }
        }

        return {
            success: true,
            tweetId: data.data?.id
        }
    } catch (error: any) {
        console.error('Twitter post error:', error)
        return {
            success: false,
            error: error.message || 'Network error posting to Twitter'
        }
    }
}
