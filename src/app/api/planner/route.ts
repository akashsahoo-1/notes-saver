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

    let { content, subject, deadline } = await req.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is required for study plan generation.' }, { status: 400 })
    }

    content = content.trim()
    if (content.length > 20000) {
      return NextResponse.json({ error: 'Content exceeds 20,000 characters limit. Please shorten your note.' }, { status: 400 })
    }
    
    if (!subject || !deadline) {
      return NextResponse.json({ error: 'Subject and deadline are required.' }, { status: 400 })
    }

    const API_KEY = process.env.GROQ_API_KEY
    if (!API_KEY) return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })

    const numDays = parseInt(deadline, 10);
    if(isNaN(numDays) || numDays <= 0) {
        return NextResponse.json({ error: 'Invalid deadline.' }, { status: 400 })
    }

    const prompt = `Generate a ${numDays}-day study plan for the subject "${subject}" based strictly on the following text content.
Return ONLY a valid JSON object with a single key "plan" which is an array of objects.
Each object in the array must have exactly these keys: "day" (a string like "Day 1", "Day 2", etc.), and "topics" (an array of strings summarizing the topics to cover that day).
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
        return NextResponse.json({ error: 'Failed to generate plan', details: errBody }, { status: 502 })
    }

    const data = await groqRes.json()
    let result = data.choices?.[0]?.message?.content || '{"plan":[]}'

    let planData = []
    try {
        const parsed = JSON.parse(result)
        planData = parsed.plan || []
    } catch(e) {
        return NextResponse.json({ error: 'Failed to parse JSON plan out of AI response.', debug: result }, { status: 500 })
    }

    return NextResponse.json({ plan: planData })

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
