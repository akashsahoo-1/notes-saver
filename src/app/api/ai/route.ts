import { NextResponse } from 'next/server'
import { buildAIPrompt, sanitizeContent, AIPromptType } from '@/lib/ai/prompt'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const AI_PROMPT_TYPES: readonly AIPromptType[] = [
  'summary',
  'keypoints',
  'exam',
  'flashcards',
  'chat',
] as const

function isAIPromptType(value: unknown): value is AIPromptType {
  return typeof value === 'string' && (AI_PROMPT_TYPES as readonly string[]).includes(value)
}

interface RequestBody {
  content?: string
  type?: string
  fileUrl?: string
  fileType?: string
  question?: string
}

interface GroqMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface GroqChoice {
  message: GroqMessage
}

interface GroqResponse {
  choices: GroqChoice[]
}

// ---------------------------------------------------------------------------
// POST /api/ai
// ---------------------------------------------------------------------------

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

    const body = (await req.json()) as RequestBody
    const { content, type, question } = body

    // ── 1. Build text ──────────────────────────────────────────────────────
    let text = content ?? ''

    // Sanitize: trim, collapse whitespace, truncate
    text = sanitizeContent(text)

    // ── 2. Validate inputs ─────────────────────────────────────────────────
    const promptType: AIPromptType = isAIPromptType(type) ? type : 'summary'

    if (text.trim().length === 0 && promptType !== 'chat') {
      return NextResponse.json(
        { error: 'Note content is empty. Add text or attach a PDF.' },
        { status: 400 }
      )
    }

    if (text.length > 20000) {
      return NextResponse.json(
        { error: 'Content exceeds 20,000 characters limit. Please shorten your note.' },
        { status: 400 }
      )
    }

    if (promptType === 'chat' && (!question || question.trim().length === 0)) {
      return NextResponse.json(
        { error: 'A question is required for AI Chat.' },
        { status: 400 }
      )
    }

    // ── 3. Check API key ───────────────────────────────────────────────────
    const API_KEY = process.env.GROQ_API_KEY
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: GROQ_API_KEY is not set.' },
        { status: 500 }
      )
    }

    // ── 4. Build prompt ────────────────────────────────────────────────────
    const prompt = buildAIPrompt(promptType, text, question)

    // ── 5. Call Groq ───────────────────────────────────────────────────────
    const groqRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user' as const, content: prompt }],
        }),
      }
    )

    if (!groqRes.ok) {
      const errorBody = await groqRes.text()
      return NextResponse.json(
        { error: `Groq API error ${groqRes.status}: ${errorBody}` },
        { status: 502 }
      )
    }

    const data = (await groqRes.json()) as GroqResponse
    const result = data.choices?.[0]?.message?.content ?? 'No response generated.'

    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
