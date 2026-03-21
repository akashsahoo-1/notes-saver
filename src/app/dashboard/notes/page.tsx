'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Search, Calendar, Folder, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

export default function NotesPage() {
  const supabase = createClient()
  const [notes, setNotes] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      
      // Fetch subjects map for display
      const { data: subjectData } = await supabase.from('subjects').select('id, name')
      const subMap: Record<string, string> = {}
      if (subjectData) {
        subjectData.forEach(s => { subMap[s.id] = s.name })
      }
      setSubjects(subMap)

      // Fetch notes
      const { data: notesData } = await supabase.from('notes').select('*').order('created_at', { ascending: false })
      if (notesData) setNotes(notesData)
      
      setIsLoading(false)
    }
    
    fetchData()
  }, [supabase])

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (subjects[note.subject_id] || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col h-full min-h-[calc(100vh-2rem)]">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 drop-shadow-md">All Notes</h1>
          <p className="text-slate-400 font-medium tracking-wide">View and manage all your compiled study materials.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder="Search repository..." 
            icon={<Search className="h-4 w-4 text-purple-400" />}
            className="w-full sm:w-64 bg-white/5 border-white/10 text-white rounded-2xl h-11 focus:border-purple-500/50 shadow-inner transition-all hover:border-white/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Link href="/dashboard/notes/create" className="shrink-0">
            <Button className="w-full sm:w-auto gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white border-0 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] rounded-2xl h-11 px-6 font-bold transition-all hover:scale-105 active:scale-95">
              <Plus className="h-4 w-4" />
              Create Document
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center flex-1">
          <div className="flex flex-col items-center gap-5">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)]">
               <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <p className="text-sm font-bold tracking-widest text-purple-300 uppercase animate-pulse">Loading Repository...</p>
          </div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center rounded-[2rem] border border-white/10 border-dashed bg-white/5 backdrop-blur-xl py-24 flex-1 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl mb-6 shadow-inner border border-purple-500/30 group-hover:scale-110 transition-transform duration-500">
             <FileText className="h-10 w-10 text-purple-300" />
          </div>
          <h3 className="text-2xl font-black text-white mb-3 tracking-tight drop-shadow-md relative z-10">
            {searchQuery ? "No coordinates matched" : "Empty Repository"}
          </h3>
          <p className="text-slate-300 mb-8 max-w-[360px] leading-relaxed font-medium relative z-10">
            {searchQuery ? "Try a different search query or clear the filter boundaries." : "Create your first note 🚀"}
          </p>
          {!searchQuery && (
            <Link href="/dashboard/notes/create" className="relative z-10">
              <Button className="gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] px-8 py-6 transition-all hover:scale-105 active:scale-95 text-[15px] font-bold border-0">
                <Sparkles className="h-5 w-5" />
                Initialize Asset
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
          <AnimatePresence>
            {filteredNotes.map((note) => (
              <Link key={note.id} href={`/dashboard/notes/${note.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-purple-500/50 hover:shadow-[0_20px_40px_rgba(168,85,247,0.15)] shadow-lg"
                >
                  <div className="p-6 flex-1 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="mb-4 flex items-start justify-between relative z-10">
                      <div className="inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1.5 text-[11px] font-black tracking-widest uppercase text-purple-300 border border-purple-500/20 shadow-inner">
                        <Folder className="h-3 w-3 shrink-0" />
                        <span className="truncate">{subjects[note.subject_id] || 'Unknown Subject'}</span>
                      </div>
                      {note.file_path && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/20 shadow-inner">
                          {note.file_type?.includes('pdf') ? <FileText className="h-4 w-4 text-pink-300" /> : <ImageIcon className="h-4 w-4 text-pink-300" />}
                        </div>
                      )}
                    </div>
                    <h3 className="mb-3 text-[19px] font-black tracking-tight text-white line-clamp-2 leading-snug drop-shadow-sm relative z-10 group-hover:text-purple-300 transition-colors">
                      {note.title}
                    </h3>
                    <p className="text-[14px] text-slate-300 line-clamp-3 font-medium leading-relaxed relative z-10">
                      {note.content}
                    </p>
                  </div>
                  <div className="border-t border-white/10 bg-black/20 px-6 py-4 relative z-10 shrink-0">
                    <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-slate-400">
                      <div className="flex items-center gap-2">
                         <Calendar className="h-3.5 w-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                         {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
