'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Search, Calendar, Folder, Image as ImageIcon } from 'lucide-react'
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">All Notes</h1>
          <p className="text-zinc-400">View and manage all your study materials.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder="Search notes..." 
            icon={<Search className="h-4 w-4" />}
            className="w-full sm:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Link href="/dashboard/notes/create" className="shrink-0">
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="h-4 w-4" />
              Create Note
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center rounded-2xl border border-zinc-800 border-dashed bg-zinc-900/30 py-20 flex-1 flex flex-col items-center justify-center">
          <FileText className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery ? "No notes found matching your search" : "No notes yet"}
          </h3>
          <p className="text-zinc-400 mb-6">
            {searchQuery ? "Try a different search term or clear the filter." : "Create your first note to start your study journey."}
          </p>
          {!searchQuery && (
            <Link href="/dashboard/notes/create">
              <Button variant="outline">Create Note</Button>
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
                  whileHover={{ y: -4 }}
                  className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-zinc-700 hover:shadow-xl hover:shadow-black/50"
                >
                  <div className="p-5 flex-1">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
                        <Folder className="h-3 w-3 shrink-0" />
                        <span className="truncate">{subjects[note.subject_id] || 'Unknown Subject'}</span>
                      </div>
                      {note.file_path && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                          {note.file_type?.includes('pdf') ? <FileText className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                        </div>
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-white line-clamp-2 leading-tight">
                      {note.title}
                    </h3>
                    <p className="text-sm text-zinc-400 line-clamp-3">
                      {note.content}
                    </p>
                  </div>
                  <div className="border-t border-zinc-800/50 bg-zinc-900/30 px-5 py-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(note.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
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
