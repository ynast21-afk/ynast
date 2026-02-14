import { NextRequest, NextResponse } from 'next/server'

// AI-based tweet text generation for video promotion
// Uses video metadata (title, tags, streamer) to generate engaging tweet text
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { videoTitle, streamerName, streamerKoreanName, tags, videoUrl, duration } = body

        if (!videoTitle || !streamerName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if OpenAI API key is configured
        const openaiKey = process.env.OPENAI_API_KEY
        const geminiKey = process.env.GEMINI_API_KEY

        let tweetText = ''
        let hashtags = ''

        if (openaiKey) {
            // Use OpenAI GPT to generate tweet
            const result = await generateWithOpenAI(openaiKey, { videoTitle, streamerName, streamerKoreanName, tags, videoUrl })
            tweetText = result.tweetText
            hashtags = result.hashtags
        } else if (geminiKey) {
            // Use Google Gemini to generate tweet
            const result = await generateWithGemini(geminiKey, { videoTitle, streamerName, streamerKoreanName, tags, videoUrl })
            tweetText = result.tweetText
            hashtags = result.hashtags
        } else {
            // Fallback: template-based generation (no AI API key)
            const result = generateFallback({ videoTitle, streamerName, streamerKoreanName, tags, videoUrl })
            tweetText = result.tweetText
            hashtags = result.hashtags
        }

        return NextResponse.json({
            success: true,
            tweetText,
            hashtags,
            fullText: `${tweetText}\n\n${hashtags}`,
            source: openaiKey ? 'openai' : geminiKey ? 'gemini' : 'template'
        })

    } catch (error) {
        console.error('POST /api/admin/twitter/generate error:', error)
        return NextResponse.json({ error: 'Failed to generate tweet' }, { status: 500 })
    }
}

interface GenerateInput {
    videoTitle: string
    streamerName: string
    streamerKoreanName?: string
    tags?: string[]
    videoUrl?: string
}

async function generateWithOpenAI(apiKey: string, input: GenerateInput) {
    const { videoTitle, streamerName, streamerKoreanName, tags, videoUrl } = input
    const tagList = (tags || []).map(t => t.replace('#', '')).join(', ')
    const displayName = streamerKoreanName ? `${streamerName}(${streamerKoreanName})` : streamerName

    const prompt = `You are a social media manager for kStreamer dance, a K-Pop dance video platform.
Generate an engaging BILINGUAL tweet (Korean + English) to promote this new dance video.

Video Title: ${videoTitle}
Creator: ${displayName}
Tags: ${tagList}
Video URL: ${videoUrl || 'https://kstreamer.dance'}

Requirements:
- Write in TWO languages: Korean FIRST, then English below
- Format: Korean text first, then a blank line, then the English version
- Each section should be concise (Korean ~100 chars, English ~100 chars)
- Include 1-2 relevant emojis in each section
- Keep total main text under 250 characters (both languages combined)
- Generate 5-7 relevant hashtags (mix of Korean and English)
- Focus on K-Pop dance, cover dance, and the creator
- Make it catchy and engaging for global Twitter/X audience
- Include the video URL at the end of the English section

Example format:
🔥 [Korean text about the video]\n\n✨ [English text about the video]\n👉 URL

Return ONLY a JSON object with this format:
{"tweetText": "bilingual tweet text with URL", "hashtags": "#tag1 #tag2 #tag3"}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 500,
            response_format: { type: 'json_object' }
        })
    })

    if (!response.ok) {
        console.error('OpenAI API error:', response.status, await response.text())
        return generateFallback(input)
    }

    const data = await response.json()
    try {
        const parsed = JSON.parse(data.choices[0].message.content)
        return {
            tweetText: parsed.tweetText || generateFallback(input).tweetText,
            hashtags: parsed.hashtags || generateFallback(input).hashtags
        }
    } catch {
        return generateFallback(input)
    }
}

async function generateWithGemini(apiKey: string, input: GenerateInput) {
    const { videoTitle, streamerName, streamerKoreanName, tags, videoUrl } = input
    const tagList = (tags || []).map(t => t.replace('#', '')).join(', ')
    const displayName = streamerKoreanName ? `${streamerName}(${streamerKoreanName})` : streamerName

    const prompt = `You are a social media manager for kStreamer dance, a K-Pop dance video platform.
Generate an engaging BILINGUAL tweet (Korean + English) to promote this new dance video.

Video Title: ${videoTitle}
Creator: ${displayName}
Tags: ${tagList}
Video URL: ${videoUrl || 'https://kstreamer.dance'}

Requirements:
- Write in TWO languages: Korean FIRST, then English below
- Format: Korean text first, then a blank line, then the English version
- Each section should be concise (Korean ~100 chars, English ~100 chars)
- Include 1-2 relevant emojis in each section
- Keep total main text under 250 characters (both languages combined)
- Generate 5-7 relevant hashtags (mix of Korean and English)
- Focus on K-Pop dance, cover dance, and the creator
- Make it catchy and engaging for global Twitter/X audience
- Include the video URL at the end of the English section

Example format:
🔥 [Korean text about the video]\n\n✨ [English text about the video]\n👉 URL

Return ONLY a JSON object with this format:
{"tweetText": "bilingual tweet text with URL", "hashtags": "#tag1 #tag2 #tag3"}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 500,
                responseMimeType: 'application/json'
            }
        })
    })

    if (!response.ok) {
        console.error('Gemini API error:', response.status, await response.text())
        return generateFallback(input)
    }

    const data = await response.json()
    try {
        const text = data.candidates[0].content.parts[0].text
        const parsed = JSON.parse(text)
        return {
            tweetText: parsed.tweetText || generateFallback(input).tweetText,
            hashtags: parsed.hashtags || generateFallback(input).hashtags
        }
    } catch {
        return generateFallback(input)
    }
}

function generateFallback(input: GenerateInput) {
    const { videoTitle, streamerName, streamerKoreanName, tags, videoUrl } = input
    const displayName = streamerKoreanName ? `${streamerName}(${streamerKoreanName})` : streamerName
    const url = videoUrl || 'https://kstreamer.dance'

    const templates = [
        `🔥 새 영상 업로드!\n💃 ${displayName}의 최신 댄스 영상\n🎵 "${videoTitle}"\n\n✨ New upload!\n💃 ${displayName}'s latest dance video\n🎵 "${videoTitle}"\n👉 ${url}`,
        `✨ NEW! ${displayName} 댄스 커버\n🎶 "${videoTitle}"\n\n🔥 ${displayName} dance cover\n🎶 "${videoTitle}"\nWatch now 👇\n🔗 ${url}`,
        `💃 ${displayName}의 "${videoTitle}" 올라왔어요!\n\n💃 ${displayName}'s "${videoTitle}" is here!\nWatch the full video 🎵\n👉 ${url}`
    ]

    const tweetText = templates[Math.floor(Math.random() * templates.length)]

    // Generate hashtags from tags + defaults
    const defaultTags = ['#kpop', '#댄스', '#커버댄스', '#kstreamer', '#dance']
    const videoTags = (tags || []).slice(0, 3).map(t => t.startsWith('#') ? t : `#${t}`)
    const streamerTag = `#${streamerName.replace(/\s/g, '')}`
    const allTags = Array.from(new Set([streamerTag, ...videoTags, ...defaultTags])).slice(0, 7)

    return {
        tweetText,
        hashtags: allTags.join(' ')
    }
}
