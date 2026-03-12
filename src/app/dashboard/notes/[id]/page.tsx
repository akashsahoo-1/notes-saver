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
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'

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
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)

  // Tabs
  const [activeTab, setActiveTab] = useState<TabId>('content')

  // AI outputs (summary / concepts / exam / flashcards)
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

      if ((noteData as Record<string, unknown>).file_path) {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('notes-attachments')
          .createSignedUrl(
            (noteData as Record<string, unknown>).file_path as string,
            3600
          )
        if (!urlError && urlData) setSignedUrl(urlData.signedUrl)
        else toast.error('Failed to load attachment preview')
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
  }, [chatMessages, activeTab])

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!note) return
    const filePath = note.file_path as string | undefined
    if (filePath) {
      await supabase.storage.from('notes-attachments').remove([filePath])
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

  // ── AI generate (static tabs) ─────────────────────────────────────────────
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
        body: JSON.stringify({ content, fileUrl: signedUrl, fileType, type: feature }),
      })
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string }
        throw new Error(error ?? 'Failed to generate response')
      }
      const { result } = (await res.json()) as { result: string }
      setAiOutputs((prev) => ({ ...prev, [feature]: result }))
      if (feature === 'flashcards') setFlipped({})
      toast.success(`${feature.charAt(0).toUpperCase() + feature.slice(1)} generated`)
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
          fileUrl: signedUrl,
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



  // ── Loading / null guard ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
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
    <div className="flex h-screen flex-col bg-zinc-950 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-900 px-6 bg-zinc-950/50 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/notes">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold tracking-tight text-white line-clamp-1 max-w-[260px] sm:max-w-md md:max-w-lg">
              {noteTitle}
            </h1>
            <span className="text-xs text-zinc-500 font-medium">
              {(subject?.name as string | undefined) || 'Untitled Subject'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Favorite star */}
          <button
            onClick={handleFavoriteToggle}
            disabled={isFavoriting}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
              isFavorite
                ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10'
                : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10'
            )}
          >
            {isFavoriting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Star className={clsx('h-5 w-5', isFavorite && 'fill-amber-400')} />
            }
          </button>

          <Link href={`/dashboard/notes/${noteId}/edit`}>
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2 h-9 items-center">
              <Edit className="h-4 w-4" />
              <span className="md:inline hidden">Edit</span>
            </Button>
          </Link>
          <Button variant="danger" size="sm" className="h-9 px-3" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden w-full max-w-full relative">

        {/* Left panel */}
        <div className={clsx(
          'flex flex-col border-r border-zinc-900 bg-zinc-950 transition-all duration-300',
          filePath ? 'w-full lg:w-1/2' : 'w-full max-w-[60%] mx-auto'
        )}>
          {/* Tab bar */}
          <div className="flex w-full overflow-x-auto border-b border-zinc-900 shrink-0 space-x-1 px-4 py-2 custom-scrollbar">
            <AiTab label="Content"      id="content"    icon={FileText}      active={activeTab === 'content'}    onClick={() => setActiveTab('content')} />
            <AiTab label="Summary"      id="summary"    icon={Sparkles}      active={activeTab === 'summary'}    onClick={() => setActiveTab('summary')} />
            <AiTab label="Key Concepts" id="concepts"   icon={List}          active={activeTab === 'concepts'}   onClick={() => setActiveTab('concepts')} />
            <AiTab label="Exam Prep"    id="exam"       icon={Brain}         active={activeTab === 'exam'}       onClick={() => setActiveTab('exam')} />
            <AiTab label="Flashcards"   id="flashcards" icon={CreditCard}    active={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} />
            <AiTab label="AI Tutor"     id="chat"       icon={MessageSquare} active={activeTab === 'chat'}       onClick={() => setActiveTab('chat')} />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
            <AnimatePresence mode="popLayout">

              {/* Content */}
              {activeTab === 'content' && (
                <motion.div key="content" {...tabAnim} className="p-6 prose prose-invert max-w-none text-zinc-300 w-full break-words">
                  <p className="whitespace-pre-wrap leading-relaxed">{noteContent}</p>
                </motion.div>
              )}

              {/* Standard AI tabs */}
              {(activeTab === 'summary' || activeTab === 'concepts' || activeTab === 'exam') && (
                <motion.div key={activeTab} {...tabAnim} className="flex flex-col h-full w-full p-6">
                  {!aiOutputs[activeTab] && !isAiLoading[activeTab] ? (
                    <AIEmptyState tab={activeTab} onGenerate={() => handleAIGenerate(activeTab)} />
                  ) : isAiLoading[activeTab] ? (
                    <AILoadingState />
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                        <Button variant="outline" size="sm" onClick={() => handleAIGenerate(activeTab)} className="gap-2 text-xs h-8">
                          <Sparkles className="h-3 w-3" />Regenerate
                        </Button>
                      </div>
                      <div className="prose prose-invert w-full max-w-none rounded-2xl bg-zinc-900/50 p-6 border border-zinc-800">
                        <p className="whitespace-pre-wrap">{aiOutputs[activeTab]}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Flashcards */}
              {activeTab === 'flashcards' && (
                <motion.div key="flashcards" {...tabAnim} className="flex flex-col h-full w-full p-6">
                  {!aiOutputs.flashcards && !isAiLoading.flashcards ? (
                    <AIEmptyState tab="flashcards" onGenerate={() => handleAIGenerate('flashcards')} />
                  ) : isAiLoading.flashcards ? (
                    <AILoadingState />
                  ) : (
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-white">Flashcards</h2>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {flashcards.length} card{flashcards.length !== 1 ? 's' : ''} — click to flip
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { handleAIGenerate('flashcards'); setFlipped({}) }} className="gap-2 text-xs h-8">
                          <RotateCcw className="h-3 w-3" />Regenerate
                        </Button>
                      </div>
                      {flashcards.length === 0 ? (
                        <p className="text-zinc-400 text-sm">Could not parse flashcards. Try regenerating.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
                          <MessageSquare className="h-7 w-7 text-zinc-400" />
                        </div>
                        <h3 className="text-base font-medium text-white mb-1">AI Tutor</h3>
                        <p className="text-sm text-zinc-400 max-w-xs">
                          Ask any question about this note. The AI answers using only your study material.
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, i) => <ChatBubble key={i} message={msg} />)
                    )}
                    {isChatLoading && (
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-900 px-4 py-3 border border-zinc-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="shrink-0 border-t border-zinc-900 bg-zinc-950/80 p-3 backdrop-blur-sm">
                    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); handleChatSend() }}>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a question about this note…"
                        disabled={isChatLoading}
                        className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
                      />
                      <Button type="submit" size="icon" disabled={!chatInput.trim() || isChatLoading} className="h-10 w-10 shrink-0 rounded-xl">
                        <Send className="h-4 w-4" />
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
          <div className="hidden lg:flex flex-col w-1/2 bg-zinc-900/30 relative">
            {/* PDF toolbar */}
            <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-3 bg-zinc-950/20 backdrop-blur-md absolute top-0 w-full z-10 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Presentation className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-sm font-medium text-zinc-300 truncate max-w-[140px]">
                  {filePath.split('/').pop()}
                </span>
              </div>



              <a href={signedUrl ?? '#'} target="_blank" rel="noopener noreferrer" download={filePath.split('/').pop()} className="shrink-0">
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-zinc-400 hover:text-white">
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-xs">Download</span>
                </Button>
              </a>
            </div>

            {/* PDF / image viewer */}
            <div className="flex flex-col flex-1 overflow-hidden pt-[49px]">
              <div className="flex-1 overflow-hidden">
                {signedUrl ? (
                  fileType?.includes('pdf') ? (
                    <iframe
                      src={`${signedUrl}#toolbar=0`}
                      className="w-full h-full border-none bg-zinc-900"
                      title="PDF Viewer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-8 bg-black">
                      <img src={signedUrl} alt="Attachment Preview" className="max-h-full max-w-full object-contain rounded-md shadow-2xl" />
                    </div>
                  )
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
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
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-zinc-300">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">{noteTitle}</span>?
          </p>
          <p className="rounded-lg border border-red-500/20 bg-red-400/10 p-3 text-sm text-red-400">
            <strong>Warning:</strong> This action cannot be undone. The note and any attached files will be permanently deleted.
          </p>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared animation preset
// ---------------------------------------------------------------------------

const tabAnim = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
} as const

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
        'relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors select-none whitespace-nowrap',
        active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
      )}
    >
      <Icon className={clsx('h-4 w-4', active && id !== 'content' ? 'text-amber-400' : '')} />
      {label}
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute inset-0 rounded-lg border border-zinc-700 bg-zinc-800/50 shadow-inner z-[-1]"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  )
}

const AI_TAB_LABELS: Record<string, string> = {
  summary:    'Summary',
  concepts:   'Key Concepts',
  exam:       'Exam Questions',
  flashcards: 'Flashcards',
}

function AIEmptyState({ tab, onGenerate }: { tab: string; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-20 px-4 rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30">
      <Sparkles className="h-12 w-12 text-zinc-500 mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Generate {AI_TAB_LABELS[tab] ?? tab}</h3>
      <p className="text-sm text-zinc-400 mb-6 max-w-[280px]">
        Let AI analyze your note and extract valuable study materials instantly.
      </p>
      <Button onClick={onGenerate} className="gap-2">
        <Sparkles className="h-4 w-4" />
        Generate with AI
      </Button>
    </div>
  )
}

function AILoadingState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
      <div className="mb-4 relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin" />
        <Sparkles className="h-6 w-6 text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-zinc-300 animate-pulse">Analyzing note content…</p>
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
      className="relative w-full text-left"
      style={{ perspective: '1000px', minHeight: '10rem' }}
      aria-label={isFlipped ? `Answer: ${card.a}` : `Question: ${card.q}`}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full"
      >
        <div style={{ backfaceVisibility: 'hidden' }} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-3 min-h-[10rem]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">Question</span>
          <p className="text-sm text-zinc-200 leading-relaxed">{card.q}</p>
          <span className="mt-auto text-[10px] text-zinc-600">Click to reveal answer</span>
        </div>
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 w-full rounded-xl border border-zinc-600 bg-zinc-800 p-5 flex flex-col gap-3 min-h-[10rem]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Answer</span>
          <p className="text-sm text-zinc-200 leading-relaxed">{card.a}</p>
          <span className="mt-auto text-[10px] text-zinc-600">Click to flip back</span>
        </div>
      </motion.div>
    </button>
  )
}



function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', isUser ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800')}>
        {isUser ? 'Y' : <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
      </div>
      <div className={clsx(
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser ? 'bg-zinc-700 text-zinc-100 rounded-tr-sm' : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm'
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
