'use client'

import {
  BookOpen,
  Search,
  PlusCircle,
  FileText,
  LogOut,
  FolderClosed,
  Menu,
  X,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subject {
  id: string
  name: string
}

interface FavoriteNote {
  id: string
  title: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [favoriteNotes, setFavoriteNotes] = useState<FavoriteNote[]>([])

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from('subjects')
        .select('id, name')
        .order('created_at', { ascending: false })
      if (data) setSubjects(data as Subject[])
    }

    const fetchFavorites = async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, title')
        .eq('is_favorite', true)
        .order('created_at', { ascending: false })
      if (data) setFavoriteNotes(data as FavoriteNote[])
    }

    fetchSubjects()
    fetchFavorites()

    // Realtime: subjects
    const subjectsChannel = supabase
      .channel('sidebar_subjects')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subjects' },
        fetchSubjects
      )
      .subscribe()

    // Realtime: favorite notes
    const favoritesChannel = supabase
      .channel('sidebar_favorites')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        fetchFavorites
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subjectsChannel)
      supabase.removeChannel(favoritesChannel)
    }
  }, [supabase])

  const handleLogout = async () => {
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const SidebarContent = (
    <div className="flex h-full w-full flex-col bg-[#0f172a]/95 text-slate-100 shadow-2xl border-r border-slate-800 backdrop-blur-2xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3.5 px-6 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-center rounded-xl bg-indigo-500 p-2 shadow-lg shadow-indigo-500/30">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Notes Saver</span>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto p-4 custom-scrollbar flex-1">
        {/* Search */}
        <div className="px-2">
          <Input
            placeholder="Search notes..."
            icon={<Search className="h-4 w-4 text-slate-400" />}
            className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:bg-[#1e293b] rounded-xl"
          />
        </div>

        {/* Overview nav */}
        <nav className="flex flex-col gap-1.5 px-2">
          <h2 className="mb-2.5 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-500/80">
            Overview
          </h2>
          <NavItem href="/dashboard/notes"        icon={FileText}   label="All Notes"    active={pathname === '/dashboard/notes'} />
          <NavItem href="/dashboard/notes/create"  icon={PlusCircle} label="Create Note"  active={pathname === '/dashboard/notes/create'} />
        </nav>

        {/* Favorites */}
        {favoriteNotes.length > 0 && (
          <div className="flex flex-col gap-1.5 px-2">
            <h2 className="mb-2.5 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-500/80 flex items-center gap-1.5">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 opacity-80" />
              Favorites
            </h2>
            {favoriteNotes.map((note) => (
              <NavItem
                key={note.id}
                href={`/dashboard/notes/${note.id}`}
                icon={Star}
                label={note.title}
                active={pathname === `/dashboard/notes/${note.id}`}
                iconClassName="text-yellow-400 fill-yellow-400/50"
              />
            ))}
          </div>
        )}

        {/* Subjects */}
        <div className="flex flex-col gap-1.5 px-2">
          <div className="mb-2.5 flex items-center justify-between px-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500/80">
              Subjects
            </h2>
            <Link
              href="/dashboard/subjects"
              className="text-slate-400 hover:text-indigo-400 transition-colors p-1 rounded-md hover:bg-indigo-500/10"
              aria-label="Add Subject"
            >
              <PlusCircle className="h-4 w-4" />
            </Link>
          </div>
          {subjects.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500 bg-slate-800/30 rounded-xl text-center border border-slate-800/50 border-dashed">No subjects yet</div>
          ) : (
            subjects.map((subject) => (
              <NavItem
                key={subject.id}
                href={`/dashboard/subjects/${subject.id}`}
                icon={FolderClosed}
                label={subject.name}
                active={pathname === `/dashboard/subjects/${subject.id}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 z-40 w-full bg-[#0f172a]/90 backdrop-blur-xl border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 p-1.5 rounded-lg shadow-sm">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">Notes Saver</span>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors" onClick={() => setIsOpen(true)}>
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] transform md:relative md:translate-x-0 transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {SidebarContent}
        {isOpen && (
          <button
            className="absolute top-4 right-4 text-slate-400 hover:bg-slate-800 p-1 rounded-full transition-colors md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </motion.aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// NavItem sub-component
// ---------------------------------------------------------------------------

interface NavItemProps {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  iconClassName?: string
}

function NavItem({ href, icon: Icon, label, active, iconClassName }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active 
          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 shadow-inner' 
          : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-100 hover:shadow-sm'
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          iconClassName ?? (active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400')
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  )
}
