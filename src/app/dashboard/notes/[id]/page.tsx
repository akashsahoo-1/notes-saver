'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchAI } from '@/lib/ai/client'
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
  Zap,
  HelpCircle,
  CheckCircle,
  XCircle,
  CalendarDays,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'

const BUCKET = "notes-files";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'content' | 'summary' | 'concepts' | 'exam' | 'flashcards' | 'quiz' | 'planner' | 'chat'

interface QuizQuestion {
  question: string
  options: string[]
  answer: string
}

interface StudyDay {
  day: string
  topics: string[]
}

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

  // Quiz
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false)
  const [isQuizLoading, setIsQuizLoading] = useState(false)

  // Planner
  const [plannerDays, setPlannerDays] = useState<StudyDay[]>([])
  const [plannerProgress, setPlannerProgress] = useState<Record<string, boolean>>({})
  const [plannerSubject, setPlannerSubject] = useState('')
  const [plannerDeadline, setPlannerDeadline] = useState('7')
  const [isPlannerLoading, setIsPlannerLoading] = useState(false)

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

      const rawPlan = (noteData as Record<string, any>).study_plan;
      if (rawPlan) {
        setPlannerDays(rawPlan.days || [])
        setPlannerProgress(rawPlan.progress || {})
      }

      const rawAiOutputs = (noteData as Record<string, any>).ai_outputs;
      if (rawAiOutputs) {
        setAiOutputs(rawAiOutputs)
      }

      const rawQuizData = (noteData as Record<string, any>).quiz_data;
      if (rawQuizData && rawQuizData.questions) {
        setQuizQuestions(rawQuizData.questions)
      }

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
      toast.error('Write something first to generate AI content')
      return
    }

    setIsAiLoading((prev) => ({ ...prev, [feature]: true }))
    try {
      const { result } = await fetchAI<{ result: string }>('/api/ai', { content, fileUrl: publicUrl, fileType, type: feature })
      
      const newOutputs = { ...aiOutputs, [feature]: result }
      setAiOutputs(newOutputs)
      if (feature === 'flashcards') setFlipped({})

      const { error } = await supabase.from('notes').update({ ai_outputs: newOutputs }).eq('id', noteId)
      if (error) console.warn("Failed to persist ai_outputs locally, but continuing.")
      
      toast.success(`${feature.charAt(0).toUpperCase() + feature.slice(1)} generated!`)
    } catch (err) {
      toast.error('Something went wrong. Try again.')
    } finally {
      setIsAiLoading((prev) => ({ ...prev, [feature]: false }))
    }
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const handleGenerateQuiz = async () => {
    if (!note) return
    const content = (note.content as string | undefined) ?? ''
    if (!content) {
      toast.error('Write something first to generate AI content')
      return
    }

    setIsQuizLoading(true)
    setIsQuizSubmitted(false)
    setQuizAnswers({})
    setQuizQuestions([])
    
    try {
      const data = await fetchAI<{ quiz: QuizQuestion[] }>('/api/quiz', { content })
      if (data.quiz && data.quiz.length > 0) {
        setQuizQuestions(data.quiz)
        
        await supabase.from('notes').update({
          quiz_data: { questions: data.quiz }
        }).eq('id', noteId)

        toast.success('Quiz generated!')
      } else {
        throw new Error('Something went wrong. Try again.')
      }
    } catch (err) {
      toast.error('Something went wrong. Try again.')
    } finally {
      setIsQuizLoading(false)
    }
  }

  // ── Planner ───────────────────────────────────────────────────────────────
  const savePlannerProgress = async (newProgress: Record<string, boolean>) => {
    setPlannerProgress(newProgress)
    const { error } = await supabase.from('notes').update({
      study_plan: { days: plannerDays, progress: newProgress }
    }).eq('id', noteId)
    if(error) console.error("Failed to save plan progress to DB", error)
  }

  const handleGeneratePlanner = async () => {
    if (!note) return
    const content = (note.content as string | undefined) ?? ''
    if (!content) {
      toast.error('Write something first to generate AI content')
      return
    }

    if (!plannerSubject || !plannerDeadline) {
      toast.error('Please fill in both Subject and Deadline.')
      return
    }

    setIsPlannerLoading(true)
    setPlannerDays([])
    setPlannerProgress({})
    
    try {
      const data = await fetchAI<{ plan: StudyDay[] }>('/api/planner', { content, subject: plannerSubject, deadline: plannerDeadline })
      if (data.plan && data.plan.length > 0) {
        setPlannerDays(data.plan)
        await supabase.from('notes').update({
          study_plan: { days: data.plan, progress: {} }
        }).eq('id', noteId)
        
        toast.success('Study plan generated and saved!')
      } else {
        throw new Error('Something went wrong. Try again.')
      }
    } catch (err) {
      toast.error('Something went wrong. Try again.')
    } finally {
      setIsPlannerLoading(false)
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
      const { result } = await fetchAI<{ result: string }>('/api/ai', {
        content,
        fileUrl: publicUrl,
        fileType: note?.file_type,
        type: 'chat',
        question,
      })
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result }])
    } catch (err) {
      toast.error('Something went wrong. Try again.')
      setChatMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsChatLoading(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-5">
          <div className="relative p-2 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-sm font-bold tracking-widest uppercase text-purple-200 animate-pulse">Loading Asset...</p>
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
    <div className="flex h-screen flex-col bg-transparent overflow-hidden text-slate-100 font-sans">
      
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-2xl px-6 relative z-10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/notes">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white line-clamp-1 max-w-[220px] sm:max-w-md md:max-w-xl drop-shadow-sm">
              {noteTitle}
            </h1>
            <span className="text-[11px] text-purple-400 font-bold tracking-widest uppercase mt-0.5 opacity-90">
              {(subject?.name as string | undefined) || 'Untitled Subject'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Favorite star */}
          <button
            onClick={handleFavoriteToggle}
            disabled={isFavoriting}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={clsx(
              'flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 text-slate-400 hover:bg-white/10 hover:shadow-lg',
              isFavorite && 'bg-gradient-to-br from-pink-500/20 to-orange-400/20 shadow-[0_0_15px_rgba(244,114,182,0.3)]'
            )}
          >
            {isFavoriting
              ? <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
              : <Star className={clsx('h-5 w-5 transition-colors', isFavorite ? 'text-pink-400 fill-pink-400' : 'text-slate-400 group-hover:text-pink-300')} />
            }
          </button>

          <Link href={`/dashboard/notes/${noteId}/edit`}>
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2 h-11 items-center border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] text-white transition-all rounded-2xl px-4 text-sm font-semibold">
              <Edit className="h-4 w-4 text-purple-300" />
              <span>Edit Document</span>
            </Button>
          </Link>
          <Button variant="danger" size="sm" className="h-11 px-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-500/20 transition-all font-bold" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden w-full max-w-full relative">

        {/* Left panel (Tabs & Content) */}
        <div className={clsx(
          'flex flex-col border-r border-white/10 bg-black/20 transition-all duration-300 backdrop-blur-xl',
          filePath ? 'w-full lg:w-1/2 xl:w-5/12' : 'w-full max-w-5xl mx-auto border-x shadow-2xl z-10'
        )}>
          {/* Tab bar */}
          <div className="flex w-full overflow-x-auto shrink-0 space-x-1 px-4 py-4 custom-scrollbar bg-white/5 border-b border-white/10 shadow-inner">
            <AiTab label="Content"      id="content"    icon={FileText}      active={activeTab === 'content'}    onClick={() => setActiveTab('content')} />
            <AiTab label="Summary"      id="summary"    icon={Sparkles}      active={activeTab === 'summary'}    onClick={() => setActiveTab('summary')} />
            <AiTab label="Key Concepts" id="concepts"   icon={List}          active={activeTab === 'concepts'}   onClick={() => setActiveTab('concepts')} />
            <AiTab label="Exam Prep"    id="exam"       icon={Brain}         active={activeTab === 'exam'}       onClick={() => setActiveTab('exam')} />
            <AiTab label="Flashcards"   id="flashcards" icon={CreditCard}    active={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} />
            <AiTab label="Quiz"         id="quiz"       icon={HelpCircle}    active={activeTab === 'quiz'}       onClick={() => setActiveTab('quiz')} />
            <AiTab label="Study Planner" id="planner"   icon={CalendarDays}  active={activeTab === 'planner'}    onClick={() => setActiveTab('planner')} />
            <AiTab label="AI Tutor"     id="chat"       icon={MessageSquare} active={activeTab === 'chat'}       onClick={() => setActiveTab('chat')} />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
            <AnimatePresence mode="popLayout">

              {/* Content */}
              {activeTab === 'content' && (
                <motion.div key="content" {...tabAnim} className="p-6 md:p-8 prose prose-invert max-w-none text-slate-300 w-full break-words">
                  <div className="bg-white/5 backdrop-blur-3xl p-6 lg:p-8 rounded-3xl shadow-xl border border-white/10 hover:border-purple-500/20 transition-all">
                    {noteContent ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-slate-200 font-medium">{noteContent}</p>
                    ) : (
                      <div className="text-center py-16 opacity-70">
                        <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                          <FileText className="h-8 w-8 text-slate-500" />
                        </div>
                        <p className="font-semibold text-slate-400">No content extracted.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Standard AI tabs */}
              {(activeTab === 'summary' || activeTab === 'concepts' || activeTab === 'exam') && (
                <motion.div key={activeTab} {...tabAnim} className="flex flex-col h-full w-full p-6 md:p-8 relative">
                  {!aiOutputs[activeTab] && !isAiLoading[activeTab] ? (
                    <AIEmptyState tab={activeTab} onGenerate={() => handleAIGenerate(activeTab)} />
                  ) : isAiLoading[activeTab] ? (
                    <AILoadingState tabName={activeTab} />
                  ) : (
                    <div className="flex flex-col gap-5 h-full relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                            <Zap className="h-5 w-5 text-white" />
                          </div>
                          <h2 className="text-2xl font-black text-white tracking-tight capitalize drop-shadow-md">{activeTab.replace('-', ' ')}</h2>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleAIGenerate(activeTab)} className="gap-2 text-xs h-10 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white transition-all font-bold">
                          <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Regenerate</span>
                        </Button>
                      </div>
                      <div className="prose prose-invert w-full max-w-none rounded-3xl bg-white/5 backdrop-blur-2xl p-6 lg:p-10 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex-1 hover:border-white/20 transition-all font-medium text-slate-200">
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
                    <div className="flex flex-col gap-6 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-pink-500 to-orange-400 rounded-xl shadow-[0_0_15px_rgba(244,114,182,0.4)]">
                            <CreditCard className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">Flashcards</h2>
                            <p className="text-xs text-pink-300 font-bold tracking-widest uppercase mt-1 opacity-90">
                              {flashcards.length} card{flashcards.length !== 1 ? 's' : ''} prepared
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { handleAIGenerate('flashcards'); setFlipped({}) }} className="gap-2 text-xs h-10 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white transition-all font-bold">
                          <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Regenerate</span>
                        </Button>
                      </div>
                      {flashcards.length === 0 ? (
                        <div className="text-center py-24 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                          <p className="text-slate-400 font-semibold">Could not parse flashcards. Try regenerating.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {flashcards.map((card, i) => (
                            <FlipCard key={i} card={card} isFlipped={flipped[i] ?? false} onFlip={() => setFlipped((prev) => ({ ...prev, [i]: !prev[i] }))} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Quiz */}
              {activeTab === 'quiz' && (
                <motion.div key="quiz" {...tabAnim} className="flex flex-col h-full w-full p-6 md:p-8">
                  {quizQuestions.length === 0 && !isQuizLoading ? (
                    <AIEmptyState tab="quiz" onGenerate={handleGenerateQuiz} />
                  ) : isQuizLoading ? (
                    <AILoadingState tabName="quiz" />
                  ) : (
                    <div className="flex flex-col gap-6 relative z-10 w-full max-w-3xl mx-auto pb-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                            <HelpCircle className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">Smart Quiz</h2>
                            {isQuizSubmitted && (
                               <p className="text-xs text-indigo-300 font-bold tracking-widest uppercase mt-1">
                                 Score: {Object.keys(quizAnswers).filter(i => quizAnswers[Number(i)] === quizQuestions[Number(i)].answer).length} / {quizQuestions.length}
                               </p>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleGenerateQuiz} className="gap-2 text-xs h-10 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white transition-all font-bold">
                          <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Regenerate</span>
                        </Button>
                      </div>

                      <div className="flex flex-col gap-5">
                        {quizQuestions.map((q, i) => (
                          <div key={i} className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg">
                            <h3 className="text-[17px] font-bold text-white mb-4 leading-relaxed">{i + 1}. {q.question}</h3>
                            <div className="flex flex-col gap-3">
                              {q.options.map((opt, j) => {
                                const isSelected = quizAnswers[i] === opt;
                                const isCorrect = q.answer === opt;
                                const showCorrect = isQuizSubmitted && isCorrect;
                                const showWrong = isQuizSubmitted && isSelected && !isCorrect;
                                
                                return (
                                  <button
                                    key={j}
                                    onClick={() => !isQuizSubmitted && setQuizAnswers(prev => ({...prev, [i]: opt}))}
                                    disabled={isQuizSubmitted}
                                    className={clsx(
                                      "text-left px-5 py-4 rounded-xl border transition-all duration-200 font-medium text-[15px] flex items-center justify-between group",
                                      showCorrect ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]" :
                                      showWrong ? "bg-red-500/20 border-red-500/50 text-red-200" :
                                      isSelected ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-200" :
                                      "bg-black/20 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                                    )}
                                  >
                                    <span>{opt}</span>
                                    {showCorrect && <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 ml-3" />}
                                    {showWrong && <XCircle className="h-5 w-5 text-red-400 shrink-0 ml-3" />}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {!isQuizSubmitted && quizQuestions.length > 0 && (
                        <Button 
                          onClick={() => setIsQuizSubmitted(true)}
                          disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                          className="w-full h-14 mt-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-black text-lg shadow-[0_5px_20px_rgba(99,102,241,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed border-0"
                        >
                          Submit Answers
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Planner */}
              {activeTab === 'planner' && (
                <motion.div key="planner" {...tabAnim} className="flex flex-col h-full w-full p-6 md:p-8 overflow-y-auto custom-scrollbar">
                  {!isPlannerLoading && plannerDays.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center py-16 px-8 rounded-[2rem] border border-white/10 border-dashed bg-white/5 backdrop-blur-xl shadow-lg relative overflow-hidden w-full max-w-2xl mx-auto">
                      <div className="p-5 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-3xl mb-6 border border-teal-500/30">
                        <CalendarDays className="h-10 w-10 text-teal-300" />
                      </div>
                      <h3 className="text-2xl font-black text-white mb-3 tracking-tight drop-shadow-md">AI Study Planner</h3>
                      <p className="text-slate-300 mb-8 max-w-md leading-relaxed font-medium">
                        Set your subject and deadline, and let the AI generate a day-wise timeline to master this content.
                      </p>
                      
                      <div className="w-full max-w-sm flex flex-col gap-4 mb-8">
                        <div className="flex flex-col text-left gap-1.5">
                          <label className="text-xs font-bold tracking-widest uppercase text-slate-400">Subject Goal</label>
                          <input 
                            type="text" 
                            value={plannerSubject} 
                            onChange={e => setPlannerSubject(e.target.value)} 
                            placeholder="e.g. Master Calculus" 
                            className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-teal-500/50 outline-none w-full shadow-inner"
                          />
                        </div>
                        <div className="flex flex-col text-left gap-1.5">
                          <label className="text-xs font-bold tracking-widest uppercase text-slate-400">Deadline (Days)</label>
                          <input 
                            type="number" 
                            min="1"
                            max="60"
                            value={plannerDeadline} 
                            onChange={e => setPlannerDeadline(e.target.value)} 
                            className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-teal-500/50 outline-none w-full shadow-inner"
                          />
                        </div>
                      </div>

                      <Button onClick={handleGeneratePlanner} className="gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.5)] px-8 py-6 text-[15px] font-bold border-0 hover:scale-105 active:scale-95 transition-all w-full max-w-sm">
                        <Calendar className="h-5 w-5" /> Generate My Plan
                      </Button>
                    </div>
                  ) : isPlannerLoading ? (
                    <AILoadingState tabName="planner" />
                  ) : (
                    <div className="flex flex-col gap-8 relative z-10 w-full max-w-3xl mx-auto pb-8">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl shadow-[0_0_15px_rgba(20,184,166,0.4)]">
                             <CalendarDays className="h-5 w-5 text-white" />
                           </div>
                           <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">Study Plan</h2>
                         </div>
                         <Button variant="outline" size="sm" onClick={() => { setPlannerDays([]); setPlannerProgress({}) }} className="gap-2 text-xs h-10 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white transition-all font-bold">
                           <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">New Plan</span>
                         </Button>
                       </div>
                       
                       {/* Progress Bar */}
                       <div className="bg-white/5 rounded-2xl p-5 border border-white/10 shadow-lg">
                          <div className="flex justify-between text-sm font-bold text-slate-300 mb-2">
                             <span>Overall Progress</span>
                             <span>{Math.round((Object.values(plannerProgress).filter(Boolean).length / (plannerDays.reduce((acc, current) => acc + current.topics.length, 0) || 1)) * 100)}%</span>
                          </div>
                          <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden shadow-inner flex relative">
                             <div 
                               className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
                               style={{ width: `${(Object.values(plannerProgress).filter(Boolean).length / (plannerDays.reduce((acc, current) => acc + current.topics.length, 0) || 1)) * 100}%` }}
                             />
                          </div>
                       </div>

                       {/* Timeline Items */}
                       <div className="flex flex-col gap-6 w-full">
                         {plannerDays.map((pDay, dIndex) => (
                           <div key={dIndex} className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-md relative overflow-hidden group">
                             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                             <h4 className="text-lg font-black text-white mb-4 pl-2 tracking-wide text-teal-300">{pDay.day}</h4>
                             <div className="flex flex-col gap-3 pl-2">
                               {pDay.topics.map((topic, tIndex) => {
                                  const topicKey = `${dIndex}-${tIndex}`;
                                  const isChecked = plannerProgress[topicKey] || false;
                                  return (
                                     <label key={tIndex} className="flex items-start gap-4 cursor-pointer group/item hover:bg-white/5 p-2 rounded-xl transition-colors -ml-2">
                                        <div className="relative flex items-center justify-center shrink-0 mt-0.5 ml-2">
                                           <input 
                                             type="checkbox" 
                                             checked={isChecked}
                                             onChange={(e) => savePlannerProgress({...plannerProgress, [topicKey]: e.target.checked})}
                                             className="appearance-none w-5 h-5 border-2 border-white/20 rounded bg-black/20 checked:bg-teal-500 checked:border-teal-500 transition-all cursor-pointer peer shadow-inner hover:border-teal-400"
                                           />
                                           <CheckCircle className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                                        </div>
                                        <span className={clsx("text-[15px] font-medium transition-all duration-200 mt-px select-none leading-snug w-full pr-2", isChecked ? "text-slate-500 line-through" : "text-slate-200 group-hover/item:text-teal-200")}>
                                           {topic}
                                        </span>
                                     </label>
                                  )
                               })}
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Chat */}
              {activeTab === 'chat' && (
                <motion.div key="chat" {...tabAnim} className="flex flex-col h-full" style={{ minHeight: 0 }}>
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 shadow-[0_0_40px_rgba(168,85,247,0.15)] backdrop-blur-md hover:scale-105 transition-transform duration-500">
                          <Brain className="h-10 w-10 text-purple-300" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">AI Neural Tutor</h3>
                        <p className="text-base text-slate-400 max-w-md leading-relaxed font-medium">
                          Ask abstract questions about your note content. The system utilizes real-time document context to respond accurately.
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, i) => <ChatBubble key={i} message={msg} />)
                    )}
                    {isChatLoading && (
                      <div className="flex items-start gap-4 mt-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex items-center gap-2 rounded-3xl rounded-tl-sm bg-white/10 backdrop-blur-2xl px-5 py-4 border border-white/10 shadow-lg">
                          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                          <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse [animation-delay:150ms]" />
                          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse [animation-delay:300ms]" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="shrink-0 border-t border-white/10 bg-black/40 p-5 backdrop-blur-2xl">
                    <form className="flex items-center gap-4 relative max-w-4xl mx-auto" onSubmit={(e) => { e.preventDefault(); handleChatSend() }}>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Initialize a conversation query…"
                        disabled={isChatLoading}
                        className="flex-1 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 px-6 py-4 text-[15px] font-medium text-white placeholder:text-slate-500 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all shadow-inner disabled:opacity-50"
                      />
                      <Button type="submit" size="icon" disabled={!chatInput.trim() || isChatLoading} className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all transform hover:scale-105 active:scale-95 text-white border-0">
                        <Send className="h-6 w-6 ml-1" />
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
          <div className="hidden lg:flex flex-col w-1/2 xl:w-7/12 bg-black/10 relative border-l border-white/10 backdrop-blur-xl">
            {/* Viewer Toolbar */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/5 backdrop-blur-2xl absolute top-0 w-full z-10 gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <Presentation className="h-4 w-4 text-white shrink-0" />
                </div>
                <span className="text-[15px] font-bold text-white truncate max-w-[200px] md:max-w-xs drop-shadow-sm">
                  {filePath.split('/').pop()}
                </span>
              </div>

              <a href={publicUrl ?? '#'} target="_blank" rel="noopener noreferrer" download={filePath.split('/').pop()} className="shrink-0">
                <Button className="h-10 gap-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] border-0 text-white font-bold transition-all hover:scale-105 active:scale-95 px-5">
                  <Download className="h-4 w-4" />
                  <span className="text-sm">Download Asset</span>
                </Button>
              </a>
            </div>

            {/* Viewer Content */}
            <div className="flex flex-col flex-1 overflow-hidden pt-[72px] bg-transparent">
              <div className="flex-1 p-6 lg:p-8 relative">
                <div className="absolute inset-x-12 inset-y-12 bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-[80px] pointer-events-none rounded-full" />
                
                <div className="relative w-full h-full rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-slate-950/50 backdrop-blur-sm">
                  {publicUrl ? (
                    fileType?.includes('pdf') ? (
                      <iframe
                        src={`${publicUrl}#toolbar=0`}
                        className="w-full h-full border-none bg-slate-900"
                        title="PDF Viewer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-8 bg-black/60 backdrop-blur-2xl">
                        <img src={publicUrl} alt="Attachment Preview" className="max-h-full max-w-full object-contain rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.4)]" />
                      </div>
                    )
                  ) : (
                    <div className="flex h-full flex-col gap-5 items-center justify-center">
                      <div className="relative p-2 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                      <span className="text-purple-300 text-sm font-bold tracking-widest uppercase animate-pulse">Initializing Interface...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Operation"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="hover:bg-white/10 text-white font-semibold">Cancel</Button>
            <Button variant="danger" onClick={handleDelete} className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 border-0 shadow-[0_0_20px_rgba(239,68,68,0.4)] text-white hover:scale-105 active:scale-95 transition-all font-bold">Initiate Deletion</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-300 text-[15px] font-medium">
            Confirm permanent deletion protocol for <span className="font-bold text-white tracking-wide">"{noteTitle}"</span>?
          </p>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-md p-5 text-sm text-red-200 flex gap-4 items-start shadow-inner">
            <Trash2 className="h-6 w-6 shrink-0 text-red-400 mt-0.5" />
            <p className="leading-relaxed font-medium">
              This directive cannot be reversed. Structural documents, embeddings, and intelligence generation will be purged securely.
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
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 0.98, y: -10 },
  transition: { duration: 0.4, type: 'spring', bounce: 0 },
} as const

function TypingEffect({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayed((prev) => text.slice(0, prev.length + 3))
      i += 3
      if (i >= text.length) clearInterval(interval)
    }, 5)
    return () => clearInterval(interval)
  }, [text])
  
  return <p className="whitespace-pre-wrap leading-relaxed space-y-4">{displayed.length === text.length ? text : displayed + '▌'}</p>
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
        'relative flex items-center gap-2.5 rounded-[1.25rem] px-5 py-3 text-[13px] font-bold transition-all duration-300 select-none whitespace-nowrap z-10 tracking-wide',
        active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
      )}
    >
      {/* Glow highlight */}
      {active && (
        <motion.div
          layoutId="pageActiveTabBlob"
          className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)] z-[-1]"
          initial={false}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <Icon className={clsx('h-[18px] w-[18px] transition-colors', active ? 'text-purple-300 drop-shadow-md' : 'text-slate-500')} />
      {label}
    </button>
  )
}

const AI_TAB_LABELS: Record<string, string> = {
  summary:    'Deep Summary',
  concepts:   'Core Concepts',
  exam:       'Simulation',
  flashcards: 'Flashcards',
  quiz:       'Smart Quiz',
  planner:    'Study Planner',
}

function AIEmptyState({ tab, onGenerate }: { tab: string; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-20 px-8 rounded-[2rem] border border-white/10 border-dashed bg-white/5 backdrop-blur-xl shadow-lg transition-all duration-500 hover:bg-white/10 group relative overflow-hidden">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl mb-6 group-hover:scale-110 transition-transform duration-500 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
        <Sparkles className="h-10 w-10 text-purple-300" />
      </div>
      
      <h3 className="text-2xl font-black text-white mb-3 tracking-tight drop-shadow-md relative z-10">Generate {AI_TAB_LABELS[tab] ?? tab}</h3>
      
      <p className="text-base text-slate-300 mb-10 max-w-[360px] leading-relaxed font-medium relative z-10">
        Initiate sequence to synthesize document intelligence into pristine study materials natively.
      </p>
      
      <Button onClick={onGenerate} className="gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] px-8 py-7 transition-all hover:scale-105 active:scale-95 text-[15px] font-bold border-0 relative z-10">
        <Sparkles className="h-5 w-5" />
        Initialize Generation
      </Button>
    </div>
  )
}

function AILoadingState({ tabName }: { tabName: string }) {
  return (
    <div className="flex flex-col flex-1 rounded-[2rem] bg-white/5 backdrop-blur-2xl p-8 lg:p-10 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.2)] relative overflow-hidden">
      {/* Futuristic scanning ray */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-80 animate-[scan_2s_ease-in-out_infinite] z-20" />
      
      {/* Glints */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-500/20 blur-[60px] rounded-full pointer-events-none" />

      {/* Skeleton Header */}
      <div className="flex items-center gap-5 mb-10 relative z-10">
        <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/5 animate-pulse flex items-center justify-center shadow-inner">
          <Sparkles className="h-6 w-6 text-purple-400/50" />
        </div>
        <div className="h-7 w-56 bg-white/10 rounded-lg animate-pulse" />
      </div>
      
      {/* Skeleton Body */}
      <div className="space-y-5 relative z-10">
        <div className="h-4 w-full bg-white/10 rounded-lg animate-pulse" />
        <div className="h-4 w-11/12 bg-white/10 rounded-lg animate-pulse [animation-delay:100ms]" />
        <div className="h-4 w-4/5 bg-white/10 rounded-lg animate-pulse [animation-delay:200ms]" />
        <div className="h-4 w-full bg-white/10 rounded-lg animate-pulse [animation-delay:300ms]" />
        <div className="h-4 w-3/4 bg-white/10 rounded-lg animate-pulse [animation-delay:400ms]" />
        <div className="h-4 w-[85%] bg-white/10 rounded-lg animate-pulse [animation-delay:500ms]" />
      </div>

      {/* Floating generating indicator */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-30">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_0_40px_rgba(168,85,247,0.2)] border border-white/20 flex flex-col items-center gap-5 translate-y-0 hover:-translate-y-1 transition-transform duration-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
          <Loader2 className="h-10 w-10 text-purple-400 animate-spin relative z-10" />
          <p className="text-[15px] font-black tracking-widest uppercase text-white drop-shadow-md relative z-10">Synthesizing Data</p>
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
      className="relative w-full text-left outline-none focus-visible:ring-4 focus-visible:ring-purple-500/50 rounded-[2rem] group"
      style={{ perspective: '1500px', minHeight: '14rem' }}
      aria-label={isFlipped ? `Answer: ${card.a}` : `Question: ${card.q}`}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full cursor-pointer"
      >
        <div style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 w-full h-full rounded-[2rem] border border-white/10 bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl p-8 flex flex-col gap-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)] group-hover:border-purple-500/30 group-hover:shadow-[0_10px_40px_rgba(168,85,247,0.2)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/20 shadow-inner">Query Node</span>
          </div>
          <p className="text-lg text-white leading-relaxed font-bold drop-shadow-sm">{card.q}</p>
          <div className="mt-auto flex items-center justify-center pt-2">
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase opacity-80 group-hover:text-purple-300 transition-colors">Tap to decrypt</span>
          </div>
        </div>
        
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 w-full h-full rounded-[2rem] border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-orange-400/10 backdrop-blur-xl p-8 flex flex-col gap-5 shadow-[0_0_40px_rgba(244,114,182,0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-300 bg-pink-500/20 px-3 py-1.5 rounded-lg border border-pink-500/20 shadow-inner">Resolved Data</span>
          </div>
          <p className="text-lg text-white leading-relaxed font-bold drop-shadow-sm">{card.a}</p>
          <div className="mt-auto flex items-center justify-center pt-2">
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase opacity-80">Tap to revert</span>
          </div>
        </div>
      </motion.div>
    </button>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex items-start gap-4 md:gap-5 w-full', isUser && 'flex-row-reverse')}>
      <div className={clsx(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[13px] font-black shadow-lg relative', 
        isUser ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-blue-500/20' : 'bg-white/10 border border-white/20 backdrop-blur-md shadow-purple-500/10'
      )}>
        {isUser ? 'U' : <Zap className="h-5 w-5 text-purple-400 drop-shadow-sm" />}
      </div>
      <div className={clsx(
        'max-w-[85%] rounded-[1.5rem] px-6 py-4 text-base leading-relaxed font-medium shadow-lg backdrop-blur-xl',
        isUser ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-white rounded-tr-sm shadow-[0_5px_20px_rgba(59,130,246,0.15)]' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm shadow-[0_5px_20px_rgba(0,0,0,0.2)]'
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
