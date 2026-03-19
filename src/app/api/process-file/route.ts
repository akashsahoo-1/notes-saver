import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractText } from '@/lib/extractText'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const user = { id: 'anonymous' }

    // 2. Parse Form Data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const subjectId = formData.get('subject_id') as string

    if (!file || !title || !subjectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 3. Upload File to Storage
    const storagePath = `${user.id}/${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('notes-files') // Note: As requested
      .upload(storagePath, file)

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // 4. Extract Text
    let extractedText = ''
    try {
      extractedText = await extractText(file)
    } catch (error: any) {
      return NextResponse.json({ error: `Text extraction failed: ${error.message}` }, { status: 400 })
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'No readable text found in file' }, { status: 400 })
    }

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

    if (!aiRes.ok) {
      const errorText = await aiRes.text()
      return NextResponse.json({ error: `AI failed: ${errorText}` }, { status: 502 })
    }

    const aiData = await aiRes.json()
    const aiResult = aiData.choices?.[0]?.message?.content || ''

    if (!aiResult) {
      return NextResponse.json({ error: 'AI generated empty notes' }, { status: 500 })
    }

    // 7. Store Result in Supabase
    const noteId = crypto.randomUUID()
    
    // Check if the file type exists under the notes table based on the schema and update
    // from the prompt requirement: Store in "notes" table: [id, user_id, title, content (AI result), file_type, created_at]
    const { error: insertError } = await supabase.from('notes').insert({
      id: noteId,
      subject_id: subjectId,
      title: title,
      content: aiResult,
      file_path: storagePath,  // Still saving the path
      file_type: file.type,    // As specified
      // created_at is handled by DB defaults usually
    })

    if (insertError) {
      return NextResponse.json({ error: `DB Save failed: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, noteId, result: aiResult })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
