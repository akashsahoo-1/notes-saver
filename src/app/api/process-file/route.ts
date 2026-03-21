import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractText } from '@/lib/extractText'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = "nodejs";

const BUCKET = "notes-files";

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized user' }, { status: 401 })
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
    }

    // 2. Parse Form Data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const subjectId = formData.get('subject_id') as string

    const manualContent = (formData.get('content') as string) || ''

    if (!file || !title || !subjectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 3. Upload File to Storage
    const storagePath = `${user.id}/${file.name}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file)

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)
    const publicUrl = publicUrlData.publicUrl

    // 4. Extract Text
    let extractedText = ''
    try {
      extractedText = await extractText(file)
    } catch (error: any) {
      console.warn("File parsing failed, continuing without text", error)
    }

    let aiResult = manualContent
    if (extractedText && extractedText.trim()) {
      // 5. Clean & Trim Text
      const MAX_CHARS = 20000
      extractedText = extractedText.replace(/\s+/g, ' ').trim()
      extractedText = extractedText.substring(0, MAX_CHARS)

      // 6. Send to AI
      const apiPrompt = `Convert the following content into structured study notes.
Give:
1. Summary
2. Key Points
3. Important Concepts
4. Simple Explanation

Content:
${extractedText}`

      const API_KEY = process.env.GROQ_API_KEY
      if (!API_KEY) throw new Error('GROQ_API_KEY not configured')

      const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: apiPrompt }],
        }),
      })

      if (aiRes.ok) {
        const aiData = await aiRes.json()
        const resultText = aiData.choices?.[0]?.message?.content
        if (resultText) aiResult = resultText
      } else {
        const errorText = await aiRes.text()
        console.warn(`AI failed: ${errorText}`)
      }
    }

    // 7. Store Result in Supabase
    const noteId = crypto.randomUUID()
    
    const { error: insertError } = await supabase.from('notes').insert({
      id: noteId,
      subject_id: subjectId,
      title: title,
      content: aiResult || 'Attachment uploaded. No notes generated.',
      file_path: storagePath,
      file_url: publicUrl,
      file_type: file.type,
    })

    if (insertError) {
      return NextResponse.json({ error: `DB Save failed: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, noteId, result: aiResult })
    
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
