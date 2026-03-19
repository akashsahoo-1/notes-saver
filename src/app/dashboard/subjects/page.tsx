'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, Folder } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(50, 'Too long'),
})

type SubjectFormValues = z.infer<typeof subjectSchema>

export default function SubjectsPage() {
  const supabase = createClient()
  const [subjects, setSubjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema)
  })

  // Edit form
  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors, isSubmitting: isEditSubmitting } } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema)
  })

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from('subjects').select('*').order('created_at', { ascending: false })
    if (error) {
      toast.error('Failed to load subjects', { description: error.message })
    } else {
      setSubjects(data || [])
    }
    setIsLoading(false)
  }

  const onCreateSubmit = async (data: SubjectFormValues) => {
    const { error } = await supabase.from('subjects').insert({
      name: data.name,
      user_id: "default-user-id"
    })

    if (error) {
      toast.error('Failed to create subject', { description: error.message })
    } else {
      toast.success('Subject created')
      setIsCreateModalOpen(false)
      reset()
      fetchSubjects()
    }
  }

  const onEditSubmit = async (data: SubjectFormValues) => {
    if (!selectedSubject) return

    const { error } = await supabase.from('subjects')
      .update({ name: data.name })
      .eq('id', selectedSubject.id)

    if (error) {
      toast.error('Failed to update subject', { description: error.message })
    } else {
      toast.success('Subject updated')
      setIsEditModalOpen(false)
      fetchSubjects()
    }
  }

  const handleDelete = async () => {
    if (!selectedSubject) return
    
    // Deleting a subject will cascade delete notes due to our SQL schema
    const { error } = await supabase.from('subjects').delete().eq('id', selectedSubject.id)
    
    if (error) {
      toast.error('Failed to delete subject', { description: error.message })
    } else {
      toast.success('Subject deleted')
      setIsDeleteModalOpen(false)
      fetchSubjects()
    }
  }

  const openEditModal = (subject: any) => {
    setSelectedSubject(subject)
    resetEdit({ name: subject.name })
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (subject: any) => {
    setSelectedSubject(subject)
    setIsDeleteModalOpen(true)
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Subjects</h1>
          <p className="text-zinc-400">Manage your study subjects and categories.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto gap-2">
          <Plus className="h-4 w-4" />
          New Subject
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center rounded-2xl border border-zinc-800 border-dashed bg-zinc-900/30 py-20">
          <Folder className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No subjects found</h3>
          <p className="text-zinc-400 mb-6">Create your first subject to start organizing your notes.</p>
          <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">
            Create Subject
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {subjects.map((subject) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors overflow-hidden"
              >
                {/* Clickable body — navigates to the subject's notes */}
                <Link href={`/dashboard/subjects/${subject.id}`} className="flex flex-col p-5 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-300 transition-colors shrink-0">
                        <Folder className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-zinc-100 truncate max-w-[140px]">{subject.name}</h3>
                    </div>
                    {/* Action buttons — stop propagation so clicks don't follow the Link */}
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.preventDefault(); openEditModal(subject) }}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-700 transition-colors"
                        aria-label={`Edit ${subject.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); openDeleteModal(subject) }}
                        className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-zinc-700 transition-colors"
                        aria-label={`Delete ${subject.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 text-xs tracking-wider text-zinc-500 uppercase">
                    Created {new Date(subject.created_at).toLocaleDateString()}
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => { setIsCreateModalOpen(false); reset() }} 
        title="Create New Subject"
      >
        <form id="create-subject-form" onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Name</label>
            <Input 
              {...register('name')} 
              placeholder="e.g. Computer Science" 
              error={errors.name?.message}
              autoFocus
            />
          </div>
        </form>
      </Modal>

      {/* Since Form inside modal with footer buttons need coupling, I'll put buttons in modal footer using form="id" */}
      {isCreateModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => { setIsCreateModalOpen(false); reset() }} 
          title="Create New Subject"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setIsCreateModalOpen(false); reset() }}>Cancel</Button>
              <Button form="create-subject-form" type="submit" isLoading={isSubmitting}>Create</Button>
            </>
          }
        >
          <form id="create-subject-form" onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Name</label>
              <Input 
                {...register('name')} 
                placeholder="e.g. Computer Science" 
                error={errors.name?.message}
                autoFocus
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => setIsEditModalOpen(false)} 
          title="Edit Subject"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button form="edit-subject-form" type="submit" isLoading={isEditSubmitting}>Save</Button>
            </>
          }
        >
          <form id="edit-subject-form" onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Name</label>
              <Input 
                {...registerEdit('name')} 
                placeholder="e.g. Computer Science" 
                error={editErrors.name?.message}
                autoFocus
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="Delete Subject"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete Subject</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-zinc-300">
            Are you sure you want to delete <span className="font-semibold text-white">{selectedSubject?.name}</span>? 
          </p>
          <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-500/20">
            <strong>Warning:</strong> This action cannot be undone. All notes and files associated with this subject will be permanently deleted.
          </p>
        </div>
      </Modal>
    </div>
  )
}
