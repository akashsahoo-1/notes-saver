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
  User,
  Library,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Subject {
  id: string
  name: string
}

interface FavoriteNote {
  id: string
  title: string
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [favoriteNotes, setFavoriteNotes] = useState<FavoriteNote[]>([])
  const [notesCount, setNotesCount] = useState(0)
  const [subjectsCount, setSubjectsCount] = useState(0)

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileRef])

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data, count } = await supabase
        .from('subjects')
        .select('id, name', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (data) setSubjects(data as Subject[])
      if (count !== null) setSubjectsCount(count)
    }

    const fetchFavorites = async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, title')
        .eq('is_favorite', true)
        .order('created_at', { ascending: false })
      if (data) setFavoriteNotes(data as FavoriteNote[])
    }

    const fetchNotesCount = async () => {
      const { count } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
      if (count !== null) setNotesCount(count)
    }

    fetchSubjects()
    fetchFavorites()
    fetchNotesCount()

    const channels = supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, fetchSubjects)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        fetchFavorites()
        fetchNotesCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channels)
    }
  }, [supabase])

  const handleLogout = async () => {
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const SidebarContent = (
    <div className="flex h-full w-full flex-col bg-white/5 backdrop-blur-2xl border-r border-white/10 text-slate-100 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.5)] z-20">
      
      {/* Top Header */}
      <div className="flex flex-col px-6 pt-8 pb-5 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-2 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Notes Saver</span>
            <span className="text-[10px] uppercase tracking-widest text-[#a1a1aa] font-bold">AI Study Assistant</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto p-5 custom-scrollbar flex-1 relative z-10">
        
        {/* Search */}
        <div className="relative group px-1">
          <Input
            placeholder="Search notes..."
            icon={<Search className="h-4 w-4 text-slate-400 group-hover:text-purple-400 transition-colors" />}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-purple-500/50 rounded-2xl transition-all shadow-inner h-11"
          />
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-3 px-1">
          <div className="flex flex-col p-4 rounded-3xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/5 shadow-inner hover:scale-105 transition-transform duration-300">
            <span className="text-2xl font-black text-white">{notesCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total Notes</span>
          </div>
          <div className="flex flex-col p-4 rounded-3xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-white/5 shadow-inner hover:scale-105 transition-transform duration-300">
            <span className="text-2xl font-black text-white">{subjectsCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Subjects</span>
          </div>
        </div>

        {/* Overview nav */}
        <nav className="flex flex-col gap-1.5 px-1 mt-2">
          <h2 className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500/80">Overview</h2>
          <NavItem href="/dashboard/notes" icon={Library} label="All Notes" active={pathname === '/dashboard/notes'} />
          <NavItem href="/dashboard/notes/create" icon={PlusCircle} label="Create Note" active={pathname === '/dashboard/notes/create'} />
        </nav>

        {/* Favorites */}
        {favoriteNotes.length > 0 && (
          <div className="flex flex-col gap-1.5 px-1 mt-2">
            <h2 className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500/80 flex items-center gap-2">
              <Star className="h-3 w-3 text-pink-400 fill-pink-400/50" />
              Favorites
            </h2>
            {favoriteNotes.map((note) => (
              <NavItem
                key={note.id}
                href={`/dashboard/notes/${note.id}`}
                icon={Star}
                label={note.title}
                active={pathname === `/dashboard/notes/${note.id}`}
                iconClassName="text-pink-400 fill-pink-400/30"
              />
            ))}
          </div>
        )}

        {/* Subjects */}
        <div className="flex flex-col gap-1.5 px-1 mt-2 mb-4">
          <div className="mb-2 flex items-center justify-between px-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500/80">Subjects</h2>
            <Link href="/dashboard/subjects" className="text-slate-400 hover:text-purple-400 transition-colors p-1 rounded-lg hover:bg-purple-500/10">
              <PlusCircle className="h-4 w-4" />
            </Link>
          </div>
          {subjects.length === 0 ? (
            <div className="mx-2 py-5 text-xs font-medium text-slate-500 bg-white/5 rounded-2xl text-center border border-white/5 border-dashed">No subjects yet</div>
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

      {/* User Info Bottom */}
      <div className="mt-auto shrink-0 p-5 border-t border-white/5 bg-black/20 relative" ref={profileRef}>
        <div 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-4 p-2.5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group pointer-events-auto"
        >
          <div className="relative h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform duration-300">
            <div className="h-full w-full rounded-full bg-[#0a0f1d] flex items-center justify-center">
              <User className="h-5 w-5 text-purple-300" />
            </div>
            {/* Online Indicator */}
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0a0f1d]" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[15px] font-bold text-white truncate group-hover:text-purple-300 transition-colors">Student User</span>
            <span className="text-xs text-slate-400 font-medium truncate tracking-wide">Pro Account</span>
          </div>
        </div>

        <AnimatePresence>
          {isProfileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-24 left-4 w-56 bg-[#0a0f1d]/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 p-1.5"
            >
              <div onClick={() => { setIsProfileOpen(false); router.push('/profile') }} className="p-3 hover:bg-white/10 rounded-xl cursor-pointer text-sm font-semibold text-white transition-colors">
                My Profile
              </div>
              <div onClick={() => { setIsProfileOpen(false); router.push('/settings') }} className="p-3 hover:bg-white/10 rounded-xl cursor-pointer text-sm font-semibold text-white transition-colors">
                Settings
              </div>
              <div className="h-px bg-white/10 my-1.5 mx-2" />
              <div onClick={() => { setIsProfileOpen(false); handleLogout() }} className="p-3 hover:bg-red-500/10 rounded-xl cursor-pointer text-sm font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 z-40 w-full bg-[#0a0f1d]/90 backdrop-blur-2xl border-b border-white/10 p-5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">Notes Saver</span>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors" onClick={() => setIsOpen(true)}>
          <Menu className="h-7 w-7" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#0a0f1d]/80 backdrop-blur-md md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[290px] transform md:relative md:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {SidebarContent}
        {isOpen && (
          <button
            className="absolute top-6 right-6 text-slate-400 hover:bg-white/10 p-2 rounded-full transition-colors md:hidden z-50 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </motion.aside>
    </>
  )
}

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
        'group flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 relative overflow-hidden',
        active 
          ? 'text-white' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white hover:scale-[1.02]'
      )}
    >
      {/* Active Highlighting */}
      {active && (
        <motion.div
          layoutId="sidebarActiveBg"
          className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent z-0 border-l-[3px] border-purple-500"
          initial={false}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors z-10',
          iconClassName ?? (active ? 'text-purple-400' : 'text-slate-500 group-hover:text-purple-300')
        )}
      />
      <span className="truncate z-10">{label}</span>
    </Link>
  )
}
