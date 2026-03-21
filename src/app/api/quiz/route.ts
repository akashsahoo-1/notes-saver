import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized user' }, { status: 401 })
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
    }

    let { content } = await req.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is required for quiz generation.' }, { status: 400 })
    }

    content = content.trim()
    if (content.length > 20000) {
      return NextResponse.json({ error: 'Content exceeds 20,000 characters limit. Please shorten your note.' }, { status: 400 })
    }

    const API_KEY = process.env.GROQ_API_KEY
    if (!API_KEY) return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })

    const prompt = `Generate a 5-question multiple choice quiz based strictly on the following text.
Return ONLY a valid JSON object with a single key "quiz" which is an array of objects.
Each object in the array must have exactly these keys: "question", "options" (an array of exactly 4 strings), and "answer" (a string matching exactly one of the options).
Do not include any explanation or markdown formatting outside of the JSON representation. Output valid JSON only.

Text:
${content.substring(0, 15000)}
`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      }),
    })

    if (!groqRes.ok) {
        const errBody = await groqRes.text();
        return NextResponse.json({ error: 'Failed to generate quiz', details: errBody }, { status: 502 })
    }

    const data = await groqRes.json()
    let result = data.choices?.[0]?.message?.content || '{"quiz":[]}'

    let quizData = []
    try {
        const parsed = JSON.parse(result)
        quizData = parsed.quiz || []
    } catch(e) {
        return NextResponse.json({ error: 'Failed to parse JSON quiz out of AI response.', debug: result }, { status: 500 })
    }

    return NextResponse.json({ quiz: quizData })

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
