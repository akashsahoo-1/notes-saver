'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { ArrowLeft, UploadCloud, File as FileIcon, X } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf', 
  'image/jpeg', 
  'image/jpg', 
  'image/png',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '' // some OS don't send right types for pptx
]

const noteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  content: z.string().optional(),
  subject_id: z.string().min(1, 'Please select a subject'),
})

type NoteFormValues = z.infer<typeof noteSchema>

export default function CreateNotePage() {
  const supabase = createClient()
  const router = useRouter()
  const [subjects, setSubjects] = useState<any[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema)
  })

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('id, name').order('name')
      if (data) setSubjects(data)
    }
    fetchSubjects()
  }, [supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File too large', { description: 'Max file size is 10MB.' })
      return
    }

    if (!ACCEPTED_FILE_TYPES.includes(selectedFile.type) && !selectedFile.name.match(/\.(ppt|pptx|pdf|png|jpe?g)$/i)) {
      toast.error('Invalid file type', { description: 'Only PDF, PNG, JPG, PPT, PPTX are allowed.' })
      return
    }

    setFile(selectedFile)
  }

  const onSubmit = async (data: NoteFormValues) => {
    setIsUploading(true)

    try {
      if (file) {
        // AI processing path for files
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', data.title)
        formData.append('subject_id', data.subject_id)

        const res = await fetch('/api/process-file', {
          method: 'POST',
          body: formData
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.error || 'Failed to process file')
        }

        toast.success('Notes generated successfully!')
        router.push(`/dashboard/notes/${result.noteId}`)
        return
      }

      // NO FILE - Manual save
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const userId = userData.user.id
      const noteId = crypto.randomUUID()

      const { error: insertError } = await supabase.from('notes').insert({
        id: noteId,
        user_id: userId,
        subject_id: data.subject_id,
        title: data.title,
        content: data.content,
        file_path: null,
        file_type: null,
      })

      if (insertError) throw new Error(`Failed to save note: ${insertError.message}`)

      toast.success('Note created successfully!')
      router.push(`/dashboard/notes/${noteId}`)

    } catch (error: any) {
      toast.error('Error', { 
        description: error.message,
        action: error.message.includes('AI failed') || error.message.includes('Text extraction') ? {
          label: 'Retry',
          onClick: () => onSubmit(data)
        } : undefined
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard/notes">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-zinc-900 border border-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create New Note</h1>
          <p className="text-zinc-400">Write your notes and attach study materials.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 md:p-8 backdrop-blur-sm shadow-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Note Title</label>
              <Input
                {...register('title')}
                placeholder="e.g. Chapter 1: Introduction"
                error={errors.title?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Subject</label>
              <select
                {...register('subject_id')}
                className={`flex h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 ${errors.subject_id ? 'border-red-500/50 focus-visible:ring-red-500/50' : ''}`}
              >
                <option value="">Select a subject...</option>
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              {errors.subject_id && <p className="mt-1 text-xs text-red-500">{errors.subject_id.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Content</label>
            <textarea
              {...register('content')}
              rows={8}
              className={`flex w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 ${errors.content ? 'border-red-500/50 focus-visible:ring-red-500/50' : ''}`}
              placeholder="Start writing your notes here..."
            />
            {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Attachment (Optional)</label>

            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                    <FileIcon className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="truncate">
                    <p className="truncate text-sm font-medium text-zinc-200">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 transition-colors hover:bg-zinc-800/50">
                <input
                  type="file"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleFileChange}
                  accept=".pdf,image/png,image/jpeg,image/jpg,.ppt,.pptx"
                />
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 shadow-inner">
                    <UploadCloud className="h-6 w-6 text-zinc-400" />
                  </div>
                  <p className="mb-1 text-sm font-medium text-zinc-200">Click to upload or drag and drop</p>
                  <p className="text-xs text-zinc-500">PDF, PPTX, PNG, JPG (max. 10MB)</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
            <Link href="/dashboard/notes">
              <Button variant="ghost" type="button">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isUploading} className="min-w-[120px]">
              Save Note
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
