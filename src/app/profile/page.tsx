'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, CreditCard, FileText, FolderClosed, Zap, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [notesCount, setNotesCount] = useState(0)
  const [subjectsCount, setSubjectsCount] = useState(0)

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUser(user)

      const { count: nQty } = await supabase.from('notes').select('*', { count: 'exact', head: true })
      if (nQty !== null) setNotesCount(nQty)

      const { count: sQty } = await supabase.from('subjects').select('*', { count: 'exact', head: true })
      if (sQty !== null) setSubjectsCount(sQty)

      setIsLoading(false)
    }
    fetchProfile()
  }, [supabase])

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0f1d] font-sans text-slate-50 relative overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] xl:top-[-10%] left-[-10%] w-[50%] xl:w-[40%] h-[50%] xl:h-[40%] rounded-full bg-purple-600/20 blur-[100px] xl:blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] xl:w-[35%] h-[45%] xl:h-[35%] rounded-full bg-pink-600/20 blur-[100px] xl:blur-[140px] mix-blend-screen" />
        <div className="absolute top-[30%] left-[50%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-2xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
            <button onClick={() => router.back()} className="flex items-center justify-center h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black tracking-tight text-white drop-shadow-md">My Profile</h1>
            <div className="h-10 w-10" />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="relative p-2 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.4)] mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
              <p className="text-purple-300 font-bold uppercase tracking-widest text-sm animate-pulse">Loading Identity...</p>
            </div>
          ) : (
            <div className="p-8 md:p-12 flex flex-col items-center">
              
              {/* Avatar */}
              <div className="relative mb-6 group cursor-default">
                <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md opacity-50 group-hover:opacity-100 transition duration-700"></div>
                <div className="relative h-28 w-28 rounded-full bg-[#0a0f1d] border border-white/10 flex items-center justify-center shadow-2xl">
                  <User className="h-12 w-12 text-purple-300" />
                </div>
                <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-emerald-400 border-4 border-[#0a0f1d] shadow-[0_0_15px_rgba(52,211,153,0.5)]"></div>
              </div>

              {/* Basic Info */}
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-md">{user?.user_metadata?.full_name || 'Student User'}</h2>
              <div className="flex items-center gap-2 text-slate-300 mb-10 bg-white/5 px-5 py-2 rounded-full border border-white/10 shadow-inner">
                <Mail className="h-4 w-4 text-pink-400" />
                <span className="text-[13px] font-bold tracking-wide">{user?.email || 'student@example.com'}</span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                {/* Account Type */}
                <div className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-[1.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:border-blue-500/30 transition-all duration-300 group">
                  <div className="mb-4 p-3.5 bg-blue-500/20 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="text-2xl font-black text-white mb-1">Pro Plan</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Type</span>
                </div>

                {/* Notes */}
                <div className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10 rounded-[1.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:border-purple-500/30 transition-all duration-300 group">
                  <div className="mb-4 p-3.5 bg-purple-500/20 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-6 w-6 text-purple-400" />
                  </div>
                  <span className="text-2xl font-black text-white mb-1">{notesCount}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Notes</span>
                </div>

                {/* Subjects */}
                <div className="flex flex-col items-center p-6 bg-gradient-to-br from-pink-500/10 to-orange-400/10 border border-white/10 rounded-[1.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:border-pink-500/30 transition-all duration-300 group">
                  <div className="mb-4 p-3.5 bg-pink-500/20 rounded-2xl shadow-[0_0_15px_rgba(244,114,182,0.3)] group-hover:scale-110 transition-transform duration-300">
                    <FolderClosed className="h-6 w-6 text-pink-400" />
                  </div>
                  <span className="text-2xl font-black text-white mb-1">{subjectsCount}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subjects</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-10 w-full">
                <Link href="/settings">
                  <button className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-[1.25rem] shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] py-4 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold border-0">
                    <Zap className="h-5 w-5" />
                    Manage Settings
                  </button>
                </Link>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
