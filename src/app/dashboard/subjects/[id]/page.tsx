import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Plus,
  Calendar,
  Folder,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Note {
  id: string
  title: string
  content: string | null
  subject_id: string
  file_path: string | null
  file_type: string | null
  created_at: string
}

interface Subject {
  id: string
  name: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SubjectNotesPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch subject (RLS ensures ownership)
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('id, name, created_at')
    .eq('id', id)
    .single<Subject>()

  if (subjectError || !subject) {
    notFound()
  }

  // Fetch notes belonging to this subject
  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, content, subject_id, file_path, file_type, created_at')
    .eq('subject_id', id)
    .order('created_at', { ascending: false })
    .returns<Note[]>()

  const noteList: Note[] = notes ?? []

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/subjects"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Subjects
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
              <Folder className="h-3.5 w-3.5" />
              Subject
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {subject.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {noteList.length === 0
                ? 'No notes yet'
                : `${noteList.length} note${noteList.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <Link
            href={`/dashboard/notes/create?subject=${id}`}
            className="shrink-0"
          >
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="h-4 w-4" />
              New Note
            </Button>
          </Link>
        </div>
      </div>

      {/* Notes Grid */}
      {noteList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 border-dashed bg-zinc-900/30 py-24 text-center">
          <FileText className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No notes in this subject
          </h3>
          <p className="text-zinc-400 mb-6 max-w-xs">
            Create your first note for{' '}
            <span className="text-white font-medium">{subject.name}</span> to
            get started.
          </p>
          <Link href={`/dashboard/notes/create?subject=${id}`}>
            <Button variant="outline">Create Note</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
          {noteList.map((note) => (
            <Link
              key={note.id}
              href={`/dashboard/notes/${note.id}`}
              className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-zinc-700 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1"
            >
              <div className="p-5 flex-1">
                {/* File type badge */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
                    <Folder className="h-3 w-3 shrink-0" />
                    <span className="truncate">{subject.name}</span>
                  </div>
                  {note.file_path && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                      {note.file_type?.includes('pdf') ? (
                        <FileText className="h-3 w-3" />
                      ) : (
                        <ImageIcon className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-white line-clamp-2 leading-tight">
                  {note.title}
                </h3>

                {/* Content preview */}
                <p className="text-sm text-zinc-400 line-clamp-3">
                  {note.content ?? ''}
                </p>
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-800/50 bg-zinc-900/30 px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Calendar className="h-3 w-3" />
                  {new Date(note.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
