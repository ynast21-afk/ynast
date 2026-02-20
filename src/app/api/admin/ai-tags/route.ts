import { NextRequest, NextResponse } from 'next/server'

// Model fallback chain — try cheaper/higher-quota models when primary fails
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
]

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

// Exponential backoff delay
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Call Gemini with retries and model fallback
async function callGeminiWithFallback(
    apiKey: string,
    imageParts: Array<{ inline_data: { mime_type: string; data: string } }>,
    title?: string
): Promise<{ tags: string[]; model: string; method: string }> {
    const MAX_RETRIES = 3
    const BASE_DELAY_MS = 2000

    for (const model of GEMINI_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

        const geminiBody = {
            contents: [{
                parts: [
                    { text: SYSTEM_PROMPT },
                    ...imageParts,
                    { text: `Analyze these video frames and generate comprehensive tags.${title ? ` Video title: "${title}".` : ''} Return ONLY the JSON object.` }
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

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[AI Tags] Attempt ${attempt}/${MAX_RETRIES} with model ${model}...`)

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiBody)
                })

                // Rate limit — retry with backoff
                if (response.status === 429 || response.status === 503) {
                    const waitTime = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 1000
                    console.warn(`[AI Tags] ${response.status} from ${model}, retrying in ${(waitTime / 1000).toFixed(1)}s...`)
                    await delay(waitTime)
                    continue
                }

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error(`[AI Tags] ${model} error ${response.status}:`, errorText.substring(0, 200))
                    // Non-retryable error — try next model
                    break
                }

                const result = await response.json()
                const candidate = result.candidates?.[0]

                // Safety filter block
                if (!candidate || candidate.finishReason === 'SAFETY') {
                    console.warn(`[AI Tags] ${model} blocked by safety filter`)
                    break // Try next model
                }

                // Parse response
                const text = candidate.content?.parts?.[0]?.text || ''
                let tags: string[] = []
                try {
                    const parsed = JSON.parse(text)
                    tags = parsed.tags || []
                } catch {
                    const match = text.match(/\[([^\]]+)\]/)
                    if (match) {
                        try {
                            tags = JSON.parse(`[${match[1]}]`)
                        } catch {
                            tags = match[1].split(',').map((t: string) => t.trim().replace(/^["']|["']$/g, ''))
                        }
                    }
                }

                if (tags.length > 0) {
                    const uniqueTags = Array.from(new Set(tags.map((t: string) => t.trim()).filter(Boolean)))
                    console.log(`[AI Tags] ✅ ${model} returned ${uniqueTags.length} tags`)
                    return { tags: uniqueTags, model, method: 'gemini' }
                }

                console.warn(`[AI Tags] ${model} returned 0 tags, trying next model...`)
                break // Try next model
            } catch (error: any) {
                console.error(`[AI Tags] ${model} fetch error:`, error?.message)
                if (attempt === MAX_RETRIES) break // Exhausted retries
                const waitTime = BASE_DELAY_MS * Math.pow(2, attempt - 1)
                await delay(waitTime)
            }
        }

        console.log(`[AI Tags] Model ${model} exhausted, trying next...`)
    }

    // All models failed — return empty to trigger local fallback
    throw new Error('ALL_MODELS_FAILED')
}

// Local keyword-based fallback (no AI)
function generateFallbackTags(title?: string, streamerName?: string): string[] {
    const baseTags = [
        '댄스', 'dance', 'ダンス', '舞蹈',
        '커버댄스', 'cover dance', 'カバーダンス', '翻跳',
        'kpop', 'K-POP', 'ケーポップ', '韩流',
        '스트리머', 'streamer', 'ストリーマー', '主播',
        '방송', 'broadcast', '放送', '直播',
    ]

    const titleTags: string[] = []
    if (title) {
        const lower = title.toLowerCase()
        // Detect keywords from title for more relevant tags
        const keywordMap: Record<string, string[]> = {
            '핫팬츠': ['핫팬츠', 'hot pants', 'ホットパンツ', '热裤'],
            '비키니': ['비키니', 'bikini', 'ビキニ', '比基尼'],
            '레깅스': ['레깅스', 'leggings', 'レギンス', '紧身裤'],
            '코스프레': ['코스프레', 'cosplay', 'コスプレ', '角色扮演'],
            '교복': ['교복', 'school uniform', '制服', '校服'],
            '치어리더': ['치어리더', 'cheerleader', 'チアリーダー', '啦啦队'],
            '원피스': ['원피스', 'dress', 'ワンピース', '连衣裙'],
            '스커트': ['스커트', 'skirt', 'スカート', '短裙'],
            '바니': ['바니걸', 'bunny girl', 'バニーガール', '兔女郎'],
            '메이드': ['메이드', 'maid', 'メイド', '女仆'],
        }
        for (const [keyword, tags] of Object.entries(keywordMap)) {
            if (lower.includes(keyword)) titleTags.push(...tags)
        }
    }

    const streamerTags: string[] = []
    if (streamerName) {
        streamerTags.push(streamerName)
    }

    return Array.from(new Set([...streamerTags, ...baseTags, ...titleTags]))
}

export async function POST(request: NextRequest) {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY
        if (!GEMINI_API_KEY) {
            console.error('[AI Tags] GEMINI_API_KEY environment variable is not set')
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
        }

        const body = await request.json()
        const { images, title, streamerName } = body as { images: string[]; title?: string; streamerName?: string }

        if (!images || images.length === 0) {
            return NextResponse.json({ error: 'No images provided' }, { status: 400 })
        }

        console.log(`[AI Tags] Processing ${images.length} frames`)

        // Limit to 2 frames max to reduce token usage and avoid quota issues
        const imageParts = images.slice(0, 2).map((base64: string) => {
            const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '')
            return {
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: cleanBase64
                }
            }
        })

        try {
            // Try Gemini with retry + model fallback
            const result = await callGeminiWithFallback(GEMINI_API_KEY, imageParts, title)
            console.log(`[AI Tags] ✅ Generated ${result.tags.length} tags via ${result.model}`)
            return NextResponse.json({
                tags: result.tags,
                source: result.method,
                model: result.model,
            })
        } catch (error: any) {
            // ALL Gemini models failed — use local keyword fallback
            console.warn(`[AI Tags] ⚠️ All Gemini models failed, using local keyword fallback`)
            const fallbackTags = generateFallbackTags(title, streamerName)
            console.log(`[AI Tags] Generated ${fallbackTags.length} fallback tags`)
            return NextResponse.json({
                tags: fallbackTags,
                source: 'fallback',
                model: 'none',
                warning: 'AI 태그 생성 실패 (할당량 초과). 기본 태그로 대체되었습니다. 잠시 후 다시 시도해 주세요.',
            })
        }

    } catch (error: any) {
        console.error('[AI Tags] Error:', error?.message || error)
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
