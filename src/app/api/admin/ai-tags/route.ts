import { NextRequest, NextResponse } from 'next/server'

const GEMINI_MODEL = 'gemini-2.0-flash'

const SYSTEM_PROMPT = `You are an expert video content tagger for a Korean dance streamer video platform.
Analyze the provided video frames and generate comprehensive, precise tags.

CRITICAL RULES:
1. Identify ALL visible elements: clothing type, clothing material/texture, clothing color, hairstyle, accessories, concept/theme, body features, footwear, props
2. Split compound tags into individual AND compound forms. Example: if the streamer wears leather hot pants, output: 가죽, 핫팬츠, 가죽핫팬츠 (leather, hot pants, leather hot pants)
3. Be EXTREMELY detailed - generate as many relevant tags as possible (aim for 30-80+ tags)
4. Output tags in 4 languages: Korean, English, Japanese, Chinese - each tag should appear in all 4 languages
5. Use the EXACT vocabulary style from this reference list when applicable:
   핫팬츠, 가죽, 레깅스, 동탄룩, 청핫팬츠, 청바지, 돌핀, 돌핀팬츠, 숏팬츠, 검숏팬츠, 흰숏팬츠, 하이레그, 비키니, 마이크로비키니, 여캠바지, 청숏팬츠, 가죽하이레그, 바니걸, 가죽바니걸, 코스프레, 애니코스프레, 할로윈, 할리퀸, 세라복, 교복, 마린걸, 마린복, 스튜디어스, 제복, 경찰, 경찰복, 여경코스프레, 스쿨미즈, 부르마, 바니걸하이레그, 드레스, 반바지, 치마, 커튼치마, 면치마, 면바지, 항공뷰, 민소매, 바지, 스커트, 미니스커트, 포니테일, 양갈래, 짱갈래, 단발, 긴머리, 쌩머리, 쇄골, 겨드랑이, 모자, 초커, 가터벨트, 맨발, 문신, 피어싱, 염색, 메이드, 하이힐, 중국옷, 치파오, 기모노, 치어리더, 파란눈, 크롭탑, 원피스, 오프숄더, 니삭스, 망사, 시스루, 나시, 튜브탑, 자켓, 후드, 운동복, 요가복, 라텍스, 실크, 새틴, 레이스, 데님, 면, PVC, 에나멜, 스판덱스

6. ALSO identify:
   - Dance style if visible (kpop, 걸그룹댄스, 커버댄스, 프리스타일, 폴댄스, etc.)
   - Setting/background (스튜디오, 야외, 방송, 무대, etc.)
   - Camera angle (항공뷰, 풀샷, 클로즈업, etc.)
   - Color of clothing (검정, 흰색, 빨강, 핑크, 파랑, etc.)

OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{"tags": ["tag1_ko", "tag1_en", "tag1_ja", "tag1_zh", "tag2_ko", "tag2_en", "tag2_ja", "tag2_zh", ...]}

All tags should be in a single flat array, mixing all 4 languages together.`

export async function POST(request: NextRequest) {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY
        if (!GEMINI_API_KEY) {
            console.error('[AI Tags] GEMINI_API_KEY environment variable is not set')
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
        }

        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

        const body = await request.json()
        const { images } = body as { images: string[] }

        if (!images || images.length === 0) {
            return NextResponse.json({ error: 'No images provided' }, { status: 400 })
        }

        console.log(`[AI Tags] Processing ${images.length} frames, total base64 size: ${images.reduce((sum, img) => sum + img.length, 0)} chars`)

        // Build Gemini request with image parts (limit to 4 frames to reduce payload)
        const imageParts = images.slice(0, 4).map((base64: string) => {
            // Strip data URL prefix if present
            const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '')
            return {
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: cleanBase64
                }
            }
        })

        const geminiBody = {
            contents: [{
                parts: [
                    { text: SYSTEM_PROMPT },
                    ...imageParts,
                    { text: 'Analyze these video frames and generate comprehensive tags. Return ONLY the JSON object.' }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json'
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ]
        }

        console.log(`[AI Tags] Sending ${imageParts.length} frames to Gemini...`)

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[AI Tags] Gemini API error:', response.status, errorText)
            return NextResponse.json(
                { error: `Gemini API error: ${response.status}`, details: errorText.substring(0, 500) },
                { status: 500 }
            )
        }

        const result = await response.json()

        // Check for safety filter blocks
        const candidate = result.candidates?.[0]
        if (!candidate) {
            const blockReason = result.promptFeedback?.blockReason
            console.error('[AI Tags] No candidates returned. Block reason:', blockReason, JSON.stringify(result.promptFeedback))
            return NextResponse.json(
                { error: `Content blocked by safety filter: ${blockReason || 'unknown'}`, details: JSON.stringify(result.promptFeedback) },
                { status: 422 }
            )
        }

        if (candidate.finishReason === 'SAFETY') {
            console.error('[AI Tags] Response blocked by safety filter:', JSON.stringify(candidate.safetyRatings))
            return NextResponse.json(
                { error: 'Response blocked by safety filter', details: JSON.stringify(candidate.safetyRatings) },
                { status: 422 }
            )
        }

        // Extract text from Gemini response
        const text = candidate.content?.parts?.[0]?.text || ''
        console.log('[AI Tags] Gemini response text length:', text.length)

        let tags: string[] = []
        try {
            const parsed = JSON.parse(text)
            tags = parsed.tags || []
        } catch {
            // Try to extract tags from unstructured text
            console.warn('[AI Tags] Failed to parse JSON, attempting extraction:', text.substring(0, 200))
            const match = text.match(/\[([^\]]+)\]/)
            if (match) {
                try {
                    tags = JSON.parse(`[${match[1]}]`)
                } catch {
                    tags = match[1].split(',').map((t: string) => t.trim().replace(/^["']|["']$/g, ''))
                }
            }
        }

        // Deduplicate and clean
        const uniqueTags = [...new Set(tags.map((t: string) => t.trim()).filter(Boolean))]

        console.log(`[AI Tags] Generated ${uniqueTags.length} unique tags`)
        return NextResponse.json({ tags: uniqueTags })

    } catch (error: any) {
        console.error('[AI Tags] Error:', error?.message || error)
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
