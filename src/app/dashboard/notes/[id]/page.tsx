'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Download,
  Sparkles,
  Loader2,
  List,
  Brain,
  Presentation,
  CreditCard,
  MessageSquare,
  Send,
  RotateCcw,
  Star,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'

const BUCKET = "notes-files";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'content' | 'summary' | 'concepts' | 'exam' | 'flashcards' | 'chat'

interface Flashcard {
  q: string
  a: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseFlashcards(raw: string): Flashcard[] {
  const cards: Flashcard[] = []
  const blocks = raw.split(/\n{2,}/)
  for (const block of blocks) {
    const qMatch = block.match(/^Q:\s*(.+)/im)
    const aMatch = block.match(/^A:\s*([\s\S]+)/im)
    if (qMatch && aMatch) {
      cards.push({ q: qMatch[1].trim(), a: aMatch[1].trim() })
    }
  }
  return cards
}

// ---------------------------------------------------------------------------
// Note page
// ---------------------------------------------------------------------------

export default function NoteViewPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const noteId = params.id as string

  // Note data
  const [note, setNote] = useState<Record<string, unknown> | null>(null)
  const [subject, setSubject] = useState<Record<string, unknown> | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)

  // Tabs
  const [activeTab, setActiveTab] = useState<TabId>('content')

  // AI outputs
  const [aiOutputs, setAiOutputs] = useState<Record<string, string>>({})
  const [isAiLoading, setIsAiLoading] = useState<Record<string, boolean>>({})

  // Flashcard flip state
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ── Fetch note ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!noteId) return
    const fetchNoteAndFile = async () => {
      setIsLoading(true)
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single()

      if (noteError || !noteData) {
        toast.error('Note not found')
        router.push('/dashboard/notes')
        return
      }
      setNote(noteData as Record<string, unknown>)

      const { data: subData } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', (noteData as Record<string, unknown>).subject_id)
        .single()
      if (subData) setSubject(subData as Record<string, unknown>)

      if ((noteData as Record<string, unknown>).file_url) {
        setPublicUrl((noteData as Record<string, unknown>).file_url as string)
      } else if ((noteData as Record<string, unknown>).file_path) {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl((noteData as Record<string, unknown>).file_path as string)
        if (urlData) setPublicUrl(urlData.publicUrl)
      }
      setIsLoading(false)
    }
    fetchNoteAndFile()
  }, [noteId, router, supabase])

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, activeTab, isChatLoading])

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!note) return
    const filePath = note.file_path as string | undefined
    if (filePath) {
      await supabase.storage.from(BUCKET).remove([filePath])
    }
    const { error } = await supabase.from('notes').delete().eq('id', noteId)
    if (error) {
      toast.error('Failed to delete note', { description: error.message })
    } else {
      toast.success('Note deleted')
      router.push('/dashboard/notes')
    }
    setIsDeleteModalOpen(false)
  }

  // ── Favorite toggle ───────────────────────────────────────────────────────
  const handleFavoriteToggle = async () => {
    if (!note || isFavoriting) return
    const current = note.is_favorite as boolean | undefined
    const next = !current
    setIsFavoriting(true)
    const { error } = await supabase
      .from('notes')
      .update({ is_favorite: next })
      .eq('id', noteId)

    if (error) {
      toast.error('Failed to update favorite', { description: error.message })
    } else {
      setNote((prev) => prev ? { ...prev, is_favorite: next } : prev)
      toast.success(next ? 'Added to favorites ⭐' : 'Removed from favorites')
    }
    setIsFavoriting(false)
  }

  // ── AI generate ───────────────────────────────────────────────────────────
  const handleAIGenerate = async (feature: string) => {
    if (!note) return
    const content = (note.content as string | undefined) ?? ''
    const fileType = note.file_type as string | undefined

    if (!content && fileType !== 'application/pdf') {
      toast.error('No content or PDF attachment available to analyze')
      return
    }

    setIsAiLoading((prev) => ({ ...prev, [feature]: true }))
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, fileUrl: publicUrl, fileType, type: feature }),
      })
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string }
        throw new Error(error ?? 'Failed to generate response')
      }
      const { result } = (await res.json()) as { result: string }
      setAiOutputs((prev) => ({ ...prev, [feature]: result }))
      if (feature === 'flashcards') setFlipped({})
      toast.success(`${feature.charAt(0).toUpperCase() + feature.slice(1)} generated!`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to generate ${feature}`, { description: message })
    } finally {
      setIsAiLoading((prev) => ({ ...prev, [feature]: false }))
    }
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  const handleChatSend = async () => {
    const question = chatInput.trim()
    if (!question || isChatLoading) return
    const content = (note?.content as string | undefined) ?? ''

    setChatMessages((prev) => [...prev, { role: 'user', content: question }])
    setChatInput('')
    setIsChatLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          fileUrl: publicUrl,
          fileType: note?.file_type,
          type: 'chat',
          question,
        }),
      })
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string }
        throw new Error(error ?? 'Failed to get a response')
      }
      const { result } = (await res.json()) as { result: string }
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result }])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error('AI Tutor failed to respond', { description: message })
      setChatMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsChatLoading(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading note...</p>
        </div>
      </div>
    )
  }
  if (!note) return null

  const noteTitle    = note.title as string
  const noteContent  = (note.content as string | undefined) ?? ''
  const filePath     = note.file_path as string | undefined
  const fileType     = note.file_type as string | undefined
  const isFavorite   = (note.is_favorite as boolean | undefined) ?? false

  const flashcards: Flashcard[]  = aiOutputs.flashcards ? parseFlashcards(aiOutputs.flashcards) : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-[#0f172a] overflow-hidden text-slate-100 font-sans">
      
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-6 bg-[#0f172a]/80 backdrop-blur-md z-10 relative shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/notes">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white line-clamp-1 max-w-[220px] sm:max-w-md md:max-w-lg">
              {noteTitle}
            </h1>
            <span className="text-xs text-indigo-400 font-medium tracking-wide uppercase mt-0.5">
              {(subject?.name as string | undefined) || 'Untitled Subject'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Favorite star */}
          <button
            onClick={handleFavoriteToggle}
            disabled={isFavoriting}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 text-slate-400 hover:bg-slate-800',
              isFavorite && 'text-yellow-400 hover:text-yellow-300'
            )}
          >
            {isFavoriting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Star className={clsx('h-5 w-5', isFavorite && 'fill-yellow-400')} />
            }
          </button>

          <Link href={`/dashboard/notes/${noteId}/edit`}>
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2 h-9 items-center border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-200 transition-all rounded-xl">
              <Edit className="h-4 w-4" />
              <span>Edit Note</span>
            </Button>
          </Link>
          <Button variant="danger" size="sm" className="h-9 px-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border-0 transition-all" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline font-medium">Delete</span>
          </Button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden w-full max-w-full relative">

        {/* Left panel (Tabs & Content) */}
        <div className={clsx(
          'flex flex-col border-r border-slate-800 bg-[#0f172a] transition-all duration-300',
          filePath ? 'w-full lg:w-1/2 xl:w-5/12' : 'w-full max-w-4xl mx-auto border-r-0 shadow-xl'
        )}>
          {/* Tab bar */}
          <div className="flex w-full overflow-x-auto border-b border-slate-800 shrink-0 space-x-2 px-4 py-3 custom-scrollbar bg-slate-900/50">
            <AiTab label="Content"      id="content"    icon={FileText}      active={activeTab === 'content'}    onClick={() => setActiveTab('content')} />
            <AiTab label="Summary"      id="summary"    icon={Sparkles}      active={activeTab === 'summary'}    onClick={() => setActiveTab('summary')} />
            <AiTab label="Key Concepts" id="concepts"   icon={List}          active={activeTab === 'concepts'}   onClick={() => setActiveTab('concepts')} />
            <AiTab label="Exam Prep"    id="exam"       icon={Brain}         active={activeTab === 'exam'}       onClick={() => setActiveTab('exam')} />
            <AiTab label="Flashcards"   id="flashcards" icon={CreditCard}    active={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} />
            <AiTab label="AI Tutor"     id="chat"       icon={MessageSquare} active={activeTab === 'chat'}       onClick={() => setActiveTab('chat')} />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto w-full custom-scrollbar bg-[#0f172a]">
            <AnimatePresence mode="popLayout">

              {/* Content */}
              {activeTab === 'content' && (
                <motion.div key="content" {...tabAnim} className="p-6 md:p-8 prose prose-invert prose-slate max-w-none text-slate-300 w-full break-words">
                  <div className="bg-[#1e293b] p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-800">
                    {noteContent ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{noteContent}</p>
                    ) : (
                      <div className="text-center py-10 opacity-70">
                        <FileText className="h-10 w-10 mx-auto text-slate-500 mb-3" />
                        <p>No content extracted yet.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Standard AI tabs */}
              {(activeTab === 'summary' || activeTab === 'concepts' || activeTab === 'exam') && (
                <motion.div key={activeTab} {...tabAnim} className="flex flex-col h-full w-full p-6 md:p-8">
                  {!aiOutputs[activeTab] && !isAiLoading[activeTab] ? (
                    <AIEmptyState tab={activeTab} onGenerate={() => handleAIGenerate(activeTab)} />
                  ) : isAiLoading[activeTab] ? (
                    <AILoadingState tabName={activeTab} />
                  ) : (
                    <div className="flex flex-col gap-5 h-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <h2 className="text-xl font-bold text-white tracking-tight capitalize">{activeTab.replace('-', ' ')}</h2>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleAIGenerate(activeTab)} className="gap-2 text-xs h-9 rounded-xl border-slate-700 hover:bg-slate-800 hover:text-white transition-all">
                          <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Regenerate</span>
                        </Button>
                      </div>
                      <div className="prose prose-invert prose-slate w-full max-w-none rounded-2xl bg-[#1e293b] p-6 lg:p-8 border border-slate-800 shadow-sm flex-1">
                        <TypingEffect text={aiOutputs[activeTab]} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Flashcards */}
              {activeTab === 'flashcards' && (
                <motion.div key="flashcards" {...tabAnim} className="flex flex-col h-full w-full p-6 md:p-8">
                  {!aiOutputs.flashcards && !isAiLoading.flashcards ? (
                    <AIEmptyState tab="flashcards" onGenerate={() => handleAIGenerate('flashcards')} />
                  ) : isAiLoading.flashcards ? (
                    <AILoadingState tabName="flashcards" />
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Flashcards</h2>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">
                              {flashcards.length} card{flashcards.length !== 1 ? 's' : ''} — click to flip
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { handleAIGenerate('flashcards'); setFlipped({}) }} className="gap-2 text-xs h-9 rounded-xl border-slate-700 hover:bg-slate-800 transition-all">
                          <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Regenerate</span>
                        </Button>
                      </div>
                      {flashcards.length === 0 ? (
                        <div className="text-center py-20 bg-[#1e293b] rounded-2xl border border-slate-800">
                          <p className="text-slate-400">Could not parse flashcards. Try regenerating.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {flashcards.map((card, i) => (
                            <FlipCard key={i} card={card} isFlipped={flipped[i] ?? false} onFlip={() => setFlipped((prev) => ({ ...prev, [i]: !prev[i] }))} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Chat */}
              {activeTab === 'chat' && (
                <motion.div key="chat" {...tabAnim} className="flex flex-col h-full" style={{ minHeight: 0 }}>
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar bg-[#0f172a]">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 shadow-inner">
                          <MessageSquare className="h-8 w-8 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Your Personal AI Tutor</h3>
                        <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                          Ask any question about this specific note or its attached document. The AI will assist you using your study material as context.
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, i) => <ChatBubble key={i} message={msg} />)
                    )}
                    {isChatLoading && (
                      <div className="flex items-start gap-3 mt-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 shadow-sm">
                          <Sparkles className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-[#1e293b] px-4 py-3.5 border border-slate-800 shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="shrink-0 border-t border-slate-800 bg-[#0f172a]/95 p-4 backdrop-blur-xl">
                    <form className="flex items-center gap-3 relative max-w-4xl mx-auto" onSubmit={(e) => { e.preventDefault(); handleChatSend() }}>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a question about this note…"
                        disabled={isChatLoading}
                        className="flex-1 rounded-full bg-[#1e293b] border border-slate-700 px-5 py-3.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner disabled:opacity-50"
                      />
                      <Button type="submit" size="icon" disabled={!chatInput.trim() || isChatLoading} className="h-12 w-12 shrink-0 rounded-full bg-indigo-500 hover:bg-indigo-600 shadow-md transition-all hover:scale-105 active:scale-95 text-white">
                        <Send className="h-5 w-5 ml-0.5" />
                      </Button>
                    </form>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Right panel: PDF preview */}
        {filePath && (
          <div className="hidden lg:flex flex-col w-1/2 xl:w-7/12 bg-[#0f172a] relative border-l border-slate-800/50">
            {/* PDF toolbar */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 bg-[#0f172a]/80 backdrop-blur-md absolute top-0 w-full z-10 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 bg-slate-800 rounded-md">
                  <Presentation className="h-4 w-4 text-indigo-400 shrink-0" />
                </div>
                <span className="text-sm font-semibold text-slate-200 truncate max-w-[200px] md:max-w-xs">
                  {filePath.split('/').pop()}
                </span>
              </div>

              <a href={publicUrl ?? '#'} target="_blank" rel="noopener noreferrer" download={filePath.split('/').pop()} className="shrink-0">
                <Button variant="outline" size="sm" className="h-8 gap-2 border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg">
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Download File</span>
                </Button>
              </a>
            </div>

            {/* Viewer */}
            <div className="flex flex-col flex-1 overflow-hidden pt-[57px] bg-[#1e293b]/50">
              <div className="flex-1 overflow-hidden p-4 lg:p-6 drop-shadow-2xl">
                {publicUrl ? (
                  fileType?.includes('pdf') ? (
                    <iframe
                      src={`${publicUrl}#toolbar=0`}
                      className="w-full h-full rounded-2xl border border-slate-800 bg-white shadow-lg overflow-hidden"
                      title="PDF Viewer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-8 bg-[#1e293b] rounded-2xl border border-slate-800 shadow-inner">
                      <img src={publicUrl} alt="Attachment Preview" className="max-h-full max-w-full object-contain rounded-xl shadow-md" />
                    </div>
                  )
                ) : (
                  <div className="flex h-full flex-col gap-4 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="text-slate-400 text-sm font-medium">Loading viewer...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Note"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="hover:bg-slate-800 text-slate-300">Cancel</Button>
            <Button variant="danger" onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete Permanently</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete{' '}
            <span className="font-bold text-white">{noteTitle}</span>?
          </p>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 flex gap-3 items-start">
            <Trash2 className="h-5 w-5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Warning:</strong> This action cannot be undone. All extracted content, AI generations, and the origin file itself will be permanently deleted.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared animations & utils
// ---------------------------------------------------------------------------

const tabAnim = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -10 },
  transition: { duration: 0.25, ease: 'easeOut' },
} as const

function TypingEffect({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    // Extremely fast typing effect for UX
    const interval = setInterval(() => {
      setDisplayed((prev) => text.slice(0, prev.length + 3))
      i += 3
      if (i >= text.length) clearInterval(interval)
    }, 5)
    return () => clearInterval(interval)
  }, [text])
  
  return <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{displayed.length === text.length ? text : displayed + '▌'}</p>
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AiTabProps {
  label: string
  id: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}

function AiTab({ label, id, icon: Icon, active, onClick }: AiTabProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors select-none whitespace-nowrap z-10',
        active ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      )}
    >
      <Icon className={clsx('h-4 w-4 transition-colors', active ? 'text-indigo-400' : 'text-slate-500')} />
      {label}
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute inset-0 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-sm z-[-1]"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        />
      )}
    </button>
  )
}

const AI_TAB_LABELS: Record<string, string> = {
  summary:    'Note Summary',
  concepts:   'Key Concepts',
  exam:       'Exam Preparation',
  flashcards: 'Flashcard Deck',
}

function AIEmptyState({ tab, onGenerate }: { tab: string; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-20 px-6 rounded-3xl border border-slate-800 border-dashed bg-[#1e293b]/30 shadow-sm transition-all hover:bg-[#1e293b]/50 group">
      <div className="p-4 bg-slate-800 rounded-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
        <Sparkles className="h-8 w-8 text-indigo-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Generate {AI_TAB_LABELS[tab] ?? tab}</h3>
      <p className="text-[15px] text-slate-400 mb-8 max-w-[320px] leading-relaxed">
        Let AI analyze everything in this note to synthesize exactly what you need to study.
      </p>
      <Button onClick={onGenerate} className="gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 px-6 py-6 transition-all hover:scale-105 active:scale-95 text-base">
        <Sparkles className="h-5 w-5" />
        Generate Now
      </Button>
    </div>
  )
}

function AILoadingState({ tabName }: { tabName: string }) {
  return (
    <div className="flex flex-col flex-1 rounded-2xl bg-[#1e293b] p-8 border border-slate-800 shadow-sm relative overflow-hidden">
      {/* Skeleton Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-10 w-10 rounded-lg bg-slate-700/50 animate-pulse flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-indigo-400/50" />
        </div>
        <div className="h-6 w-48 bg-slate-700/50 rounded animate-pulse" />
      </div>
      
      {/* Skeleton Body */}
      <div className="space-y-4">
        <div className="h-4 w-full bg-slate-700/50 rounded animate-pulse" />
        <div className="h-4 w-11/12 bg-slate-700/50 rounded animate-pulse [animation-delay:100ms]" />
        <div className="h-4 w-4/5 bg-slate-700/50 rounded animate-pulse [animation-delay:200ms]" />
        <div className="h-4 w-full bg-slate-700/50 rounded animate-pulse [animation-delay:300ms]" />
        <div className="h-4 w-3/4 bg-slate-700/50 rounded animate-pulse [animation-delay:400ms]" />
      </div>

      {/* Floating generating indicator */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center">
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-200">Generating {tabName}...</p>
        </div>
      </div>
    </div>
  )
}

interface FlipCardProps {
  card: Flashcard
  isFlipped: boolean
  onFlip: () => void
}

function FlipCard({ card, isFlipped, onFlip }: FlipCardProps) {
  return (
    <button
      onClick={onFlip}
      className="relative w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl"
      style={{ perspective: '1200px', minHeight: '12rem' }}
      aria-label={isFlipped ? `Answer: ${card.a}` : `Question: ${card.q}`}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full cursor-pointer"
      >
        <div style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 w-full h-full rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#1e293b] to-slate-800 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">Question</span>
          </div>
          <p className="text-base text-slate-100 leading-relaxed font-medium">{card.q}</p>
          <div className="mt-auto flex items-center justify-center pt-2">
            <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase opacity-70">Click to flip</span>
          </div>
        </div>
        
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 w-full h-full rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#1e293b] to-slate-800 p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">Answer</span>
          </div>
          <p className="text-base text-slate-100 leading-relaxed font-medium">{card.a}</p>
          <div className="mt-auto flex items-center justify-center pt-2">
            <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase opacity-70">Click to flip back</span>
          </div>
        </div>
      </motion.div>
    </button>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex items-start gap-3 md:gap-4', isUser && 'flex-row-reverse')}>
      <div className={clsx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm', 
        isUser ? 'bg-indigo-500 text-white' : 'bg-[#1e293b] border border-slate-700'
      )}>
        {isUser ? 'U' : <Sparkles className="h-4 w-4 text-indigo-400" />}
      </div>
      <div className={clsx(
        'max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm',
        isUser ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-[#1e293b] border border-slate-800 text-slate-200 rounded-tl-sm'
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <TypingEffect text={message.content} />
        )}
      </div>
    </div>
  )
}
