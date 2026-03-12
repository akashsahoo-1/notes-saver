// ---------------------------------------------------------------------------
// AI Prompt Builder — server-safe, no browser globals
// ---------------------------------------------------------------------------

export type AIPromptType =
  | 'summary'
  | 'keypoints'
  | 'exam'
  | 'flashcards'
  | 'chat'

const MAX_CHARS = 18_000

/**
 * Trims, collapses excessive whitespace, and truncates content to the
 * safe character limit before it is embedded in any prompt.
 */
export function sanitizeContent(raw: string): string {
  return raw
    .trim()
    .replace(/\n{3,}/g, '\n\n')   // collapse 3+ newlines → 2
    .replace(/\t/g, ' ')          // tabs → single space
    .slice(0, MAX_CHARS)
}

/**
 * Builds the exact prompt string to send to the LLM.
 *
 * @param type     - Which AI feature is being requested
 * @param content  - Sanitized note content (use sanitizeContent first)
 * @param question - Required only when type === "chat"
 */
export function buildAIPrompt(
  type: AIPromptType,
  content: string,
  question?: string
): string {
  switch (type) {
    case 'summary':
      return [
        'You are a study assistant. Summarize the following study notes into',
        'clear, concise bullet points that a student can use for quick revision.',
        'Group related points under short bold headings where appropriate.',
        '',
        'Notes:',
        content,
      ].join('\n')

    case 'keypoints':
      return [
        'You are a study assistant. Extract the major concepts from the',
        'following study notes. For each concept, provide a short, clear',
        'explanation. Format as a numbered list.',
        '',
        'Notes:',
        content,
      ].join('\n')

    case 'exam':
      return [
        'You are an exam coach. Generate exam-style questions from the',
        'following study notes.',
        '',
        'Include exactly:',
        '- 3 short-answer questions (labelled SA1, SA2, SA3)',
        '- 2 multiple-choice questions with 4 options each (labelled MCQ1, MCQ2)',
        '  and mark the correct answer with ✓',
        '',
        'Notes:',
        content,
      ].join('\n')

    case 'flashcards':
      return [
        'You are a study assistant. Create 5–10 flashcards from the following',
        'study notes. Use this exact format for every card — one card per block,',
        'separated by a blank line:',
        '',
        'Q: <question>',
        'A: <answer>',
        '',
        'Keep answers concise (1–3 sentences). Do not add any extra text.',
        '',
        'Notes:',
        content,
      ].join('\n')

    case 'chat':
      return [
        'You are a helpful study tutor. Use the following study notes to answer',
        "the student's question accurately and concisely.",
        'If the answer cannot be found in the notes, say so honestly.',
        '',
        'Study Notes:',
        content,
        '',
        "Student's Question:",
        question ?? '',
      ].join('\n')
  }
}

