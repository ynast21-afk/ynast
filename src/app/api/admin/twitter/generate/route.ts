import { NextRequest, NextResponse } from 'next/server'

// AI-based tweet text generation for video promotion
// Uses video metadata (title, tags, streamer) to generate engaging tweet text
// Returns both Korean and English versions separately
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { videoTitle, streamerName, streamerKoreanName, tags, videoUrl, duration, style } = body
        const mentStyle: 'standard' | 'influencer' = style === 'influencer' ? 'influencer' : 'standard'

        if (!videoTitle || !streamerName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if OpenAI API key is configured
        const openaiKey = process.env.OPENAI_API_KEY
        const geminiKey = process.env.GEMINI_API_KEY

        let result: GenerateResult

        if (openaiKey) {
            result = await generateWithOpenAI(openaiKey, { videoTitle, streamerName, streamerKoreanName, tags, videoUrl, style: mentStyle })
        } else if (geminiKey) {
            result = await generateWithGemini(geminiKey, { videoTitle, streamerName, streamerKoreanName, tags, videoUrl, style: mentStyle })
        } else {
            result = generateFallback({ videoTitle, streamerName, streamerKoreanName, tags, videoUrl, style: mentStyle })
        }

        return NextResponse.json({
            success: true,
            // Korean version
            tweetTextKo: result.tweetTextKo,
            hashtagsKo: result.hashtagsKo,
            // English version
            tweetTextEn: result.tweetTextEn,
            hashtagsEn: result.hashtagsEn,
            // Backward compatibility: default to Korean
            tweetText: result.tweetTextKo,
            hashtags: result.hashtagsKo,
            fullText: `${result.tweetTextKo}\n\n${result.hashtagsKo}`,
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
    style?: 'standard' | 'influencer'
}

interface GenerateResult {
    tweetTextKo: string
    hashtagsKo: string
    tweetTextEn: string
    hashtagsEn: string
}

async function generateWithOpenAI(apiKey: string, input: GenerateInput): Promise<GenerateResult> {
    const { videoTitle, streamerName, streamerKoreanName, tags, videoUrl } = input
    const tagList = (tags || []).map(t => t.replace('#', '')).join(', ')
    const displayName = streamerKoreanName ? `${streamerName}(${streamerKoreanName})` : streamerName

    const isInfluencer = input.style === 'influencer'

    const standardPrompt = `You are a social media manager for kStreamer dance, a K-Pop dance video platform.
Generate TWO SEPARATE tweets to promote this new dance video — one in KOREAN and one in ENGLISH.

Video Title: ${videoTitle}
Creator: ${displayName}
Tags: ${tagList}
Video URL: ${videoUrl || 'https://kstreamer.dance'}

Requirements for KOREAN tweet:
- Write entirely in Korean
- Concise, engaging (~100-150 chars main text)
- Include 1-2 relevant emojis
- Include the video URL at the end
- Focus on K-Pop dance, cover dance, and the creator

Requirements for ENGLISH tweet:
- Write entirely in English
- Concise, engaging (~100-150 chars main text)
- Include 1-2 relevant emojis
- Include the video URL at the end
- Focus on K-Pop dance, cover dance, and the creator
- Make it catchy for a global Twitter/X audience

Generate separate hashtags for each language:
- Korean hashtags: mix of Korean and English hashtags (5-7 total)
- English hashtags: English-only hashtags (5-7 total)

Return ONLY a JSON object with this exact format:
{"tweetTextKo": "Korean tweet with URL", "hashtagsKo": "#한글태그 #tag1", "tweetTextEn": "English tweet with URL", "hashtagsEn": "#tag1 #tag2"}`

    const influencerPrompt = `You are a casual K-Pop dance fan who runs a popular social media account. Write TWO SEPARATE tweets — one in KOREAN and one in ENGLISH — that feel like natural, personal recommendations.

Video Title: ${videoTitle}
Creator: ${displayName}
Tags: ${tagList}
Video URL: ${videoUrl || 'https://kstreamer.dance'}

Requirements for KOREAN tweet:
- Write entirely in Korean, casual conversational tone
- Use Korean internet slang naturally (e.g., ㅋㅋ, 미쳤다, 진짜, 대박, ㄹㅇ, etc.)
- Sound like a real person, NOT a brand
- Keep it short and punchy (under 200 chars)
- Include 1-3 emojis
- Video URL MUST appear at the end
- Do NOT mention "kStreamer" or any platform name

Requirements for ENGLISH tweet:
- Write entirely in English, casual Gen-Z/millennial Twitter tone
- Use casual expressions (e.g., "no cap", "literally can't stop watching", "obsessed", "this hits different", etc.)
- Sound like a real person, NOT a brand
- Keep it short and punchy (under 200 chars)
- Include 1-3 emojis
- Video URL MUST appear at the end
- Do NOT mention "kStreamer" or any platform name

Generate separate hashtags:
- Korean: 4-6 hashtags (mix Korean/English)
- English: 4-6 hashtags (English only)

Return ONLY a JSON object with this exact format:
{"tweetTextKo": "한글 캐주얼 트윗 with URL", "hashtagsKo": "#태그", "tweetTextEn": "English casual tweet with URL", "hashtagsEn": "#tag1"}`

    const prompt = isInfluencer ? influencerPrompt : standardPrompt

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
            max_tokens: 800,
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
        const fallback = generateFallback(input)
        return {
            tweetTextKo: parsed.tweetTextKo || fallback.tweetTextKo,
            hashtagsKo: parsed.hashtagsKo || fallback.hashtagsKo,
            tweetTextEn: parsed.tweetTextEn || fallback.tweetTextEn,
            hashtagsEn: parsed.hashtagsEn || fallback.hashtagsEn,
        }
    } catch {
        return generateFallback(input)
    }
}

async function generateWithGemini(apiKey: string, input: GenerateInput): Promise<GenerateResult> {
    const { videoTitle, streamerName, streamerKoreanName, tags, videoUrl } = input
    const tagList = (tags || []).map(t => t.replace('#', '')).join(', ')
    const displayName = streamerKoreanName ? `${streamerName}(${streamerKoreanName})` : streamerName

    const isInfluencer = input.style === 'influencer'

    const standardPrompt = `You are a social media manager for kStreamer dance, a K-Pop dance video platform.
Generate TWO SEPARATE tweets to promote this new dance video — one in KOREAN and one in ENGLISH.

Video Title: ${videoTitle}
Creator: ${displayName}
Tags: ${tagList}
Video URL: ${videoUrl || 'https://kstreamer.dance'}

Requirements for KOREAN tweet:
- Write entirely in Korean
- Concise, engaging (~100-150 chars main text)
- Include 1-2 relevant emojis
- Include the video URL at the end
- Focus on K-Pop dance, cover dance, and the creator

Requirements for ENGLISH tweet:
- Write entirely in English
- Concise, engaging (~100-150 chars main text)
- Include 1-2 relevant emojis
- Include the video URL at the end
- Focus on K-Pop dance, cover dance, and the creator
- Make it catchy for a global Twitter/X audience

Generate separate hashtags for each language:
- Korean hashtags: mix of Korean and English hashtags (5-7 total)
- English hashtags: English-only hashtags (5-7 total)

Return ONLY a JSON object with this exact format:
{"tweetTextKo": "Korean tweet with URL", "hashtagsKo": "#한글태그 #tag1", "tweetTextEn": "English tweet with URL", "hashtagsEn": "#tag1 #tag2"}`

    const influencerPrompt = `You are a casual K-Pop dance fan who runs a popular social media account. Write TWO SEPARATE tweets — one in KOREAN and one in ENGLISH — that feel like natural, personal recommendations.

Video Title: ${videoTitle}
Creator: ${displayName}
Tags: ${tagList}
Video URL: ${videoUrl || 'https://kstreamer.dance'}

Requirements for KOREAN tweet:
- Write entirely in Korean, casual conversational tone
- Use Korean internet slang naturally (e.g., ㅋㅋ, 미쳤다, 진짜, 대박, ㄹㅇ, etc.)
- Sound like a real person, NOT a brand
- Keep it short and punchy (under 200 chars)
- Include 1-3 emojis
- Video URL MUST appear at the end
- Do NOT mention "kStreamer" or any platform name

Requirements for ENGLISH tweet:
- Write entirely in English, casual Gen-Z/millennial Twitter tone
- Use casual expressions (e.g., "no cap", "literally can't stop watching", "obsessed", "this hits different", etc.)
- Sound like a real person, NOT a brand
- Keep it short and punchy (under 200 chars)
- Include 1-3 emojis
- Video URL MUST appear at the end
- Do NOT mention "kStreamer" or any platform name

Generate separate hashtags:
- Korean: 4-6 hashtags (mix Korean/English)
- English: 4-6 hashtags (English only)

Return ONLY a JSON object with this exact format:
{"tweetTextKo": "한글 캐주얼 트윗 with URL", "hashtagsKo": "#태그", "tweetTextEn": "English casual tweet with URL", "hashtagsEn": "#tag1"}`

    const prompt = isInfluencer ? influencerPrompt : standardPrompt

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 800,
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
        const fallback = generateFallback(input)
        return {
            tweetTextKo: parsed.tweetTextKo || fallback.tweetTextKo,
            hashtagsKo: parsed.hashtagsKo || fallback.hashtagsKo,
            tweetTextEn: parsed.tweetTextEn || fallback.tweetTextEn,
            hashtagsEn: parsed.hashtagsEn || fallback.hashtagsEn,
        }
    } catch {
        return generateFallback(input)
    }
}

function generateFallback(input: GenerateInput): GenerateResult {
    const { videoTitle, streamerName, streamerKoreanName, tags, videoUrl } = input
    const displayName = streamerKoreanName ? `${streamerName}(${streamerKoreanName})` : streamerName
    const url = videoUrl || 'https://kstreamer.dance'

    const isInfluencer = input.style === 'influencer'

    // Korean templates
    const standardKoTemplates = [
        `🔥 새 영상 업로드!\n💃 ${displayName}의 최신 댄스 영상\n🎵 "${videoTitle}"\n👉 ${url}`,
        `✨ NEW! ${displayName} 댄스 커버\n🎶 "${videoTitle}"\n지금 바로 확인하세요! 🔥\n👉 ${url}`,
        `💃 ${displayName}의 "${videoTitle}" 올라왔어요!\n놓치지 마세요 🎵\n👉 ${url}`
    ]

    const influencerKoTemplates = [
        `이거 진짜 미쳤다ㅋㅋ ${displayName} 댄스 실력 뭐냐 🔥\n요즘 이 분 영상만 계속 보는 중...\n👉 ${url}`,
        `오늘의 추천 영상 ㄹㅇ 이건 꼭 봐야됨\n${displayName} 댄스 커버 레전드다 진짜 😭\n👉 ${url}`,
        `와 이 영상 발견하고 3번 돌려봄ㅋㅋ\n${displayName} 춤 진짜 잘 춘다... 대박\n👉 ${url}`,
        `${displayName} 새 영상 올라옴 🔥\n이번에도 역시 미쳤다ㅋㅋ 보자마자 소름\n👉 ${url}`
    ]

    // English templates
    const standardEnTemplates = [
        `🔥 New upload!\n💃 ${streamerName}'s latest dance video\n🎵 "${videoTitle}"\nWatch now 👇\n👉 ${url}`,
        `✨ NEW! ${streamerName} dance cover\n🎶 "${videoTitle}"\nCheck it out now! 🔥\n👉 ${url}`,
        `💃 ${streamerName}'s "${videoTitle}" is here!\nDon't miss this amazing performance 🎵\n👉 ${url}`
    ]

    const influencerEnTemplates = [
        `ok but ${streamerName}'s dance skills are actually insane 🔥\ncan't stop watching this one...\n👉 ${url}`,
        `today's recommendation — you NEED to watch this\n${streamerName}'s cover is literally legendary 😭\n👉 ${url}`,
        `found this and watched it 3 times already lol\n${streamerName} is so talented it's not even fair\n👉 ${url}`,
        `${streamerName} just dropped a new video 🔥\nthis hits different no cap\n👉 ${url}`
    ]

    const koTemplates = isInfluencer ? influencerKoTemplates : standardKoTemplates
    const enTemplates = isInfluencer ? influencerEnTemplates : standardEnTemplates

    const tweetTextKo = koTemplates[Math.floor(Math.random() * koTemplates.length)]
    const tweetTextEn = enTemplates[Math.floor(Math.random() * enTemplates.length)]

    // Generate hashtags
    const videoTags = (tags || []).slice(0, 3).map(t => t.startsWith('#') ? t : `#${t}`)
    const streamerTag = `#${streamerName.replace(/\s/g, '')}`

    const defaultKoTags = isInfluencer
        ? ['#kpop', '#댄스', '#커버댄스', '#dance']
        : ['#kpop', '#댄스', '#커버댄스', '#kstreamer', '#dance']
    const koTags = Array.from(new Set([streamerTag, ...videoTags, ...defaultKoTags])).slice(0, 7)

    const defaultEnTags = isInfluencer
        ? ['#kpop', '#dance', '#coverdance', '#kpopdance']
        : ['#kpop', '#dance', '#coverdance', '#kstreamer', '#kpopdance']
    const enTags = Array.from(new Set([streamerTag, ...defaultEnTags])).slice(0, 7)

    return {
        tweetTextKo,
        hashtagsKo: koTags.join(' '),
        tweetTextEn,
        hashtagsEn: enTags.join(' '),
    }
}
