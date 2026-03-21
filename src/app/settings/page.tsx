'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, Moon, LogOut, Trash2, Shield, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [name, setName] = useState('Student User')
  const [email, setEmail] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Initialization
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      
      if (user) {
        setEmail(user.email || '')
        const { data: profile } = await supabase.from('profiles').select('name').eq('user_id', user.id).single()
        if (profile?.name) {
          setName(profile.name)
        } else if (user.user_metadata?.name) {
          setName(user.user_metadata.name)
        }
      }
    }
    loadData()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push("/login")
        }
      }
    )

    const savedTheme = localStorage.getItem('theme')
    const isDark = savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'))
    setIsDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [supabase, router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // Upsert into profiles table exactly as requested
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: user.id,
        name: name.trim(),
        email: user.email,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

      await supabase.auth.updateUser({ data: { name: name.trim() } })

      if (profileError && profileError.code !== '42P01') {
        throw profileError
      }

      toast.success('Successfully updated profile!')
      // Local state is already updated via naming component
    } catch (err: any) {
      toast.error('Failed to update profile', { description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#0a0f1d] font-sans text-slate-900 dark:text-slate-50 relative overflow-x-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-100 transition-opacity duration-300">
        <div className="absolute top-[-15%] xl:top-[-10%] left-[-10%] w-[50%] xl:w-[40%] h-[50%] xl:h-[40%] rounded-full bg-purple-600/20 blur-[100px] xl:blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] xl:w-[35%] h-[45%] xl:h-[35%] rounded-full bg-pink-600/20 blur-[100px] xl:blur-[140px] mix-blend-screen" />
        <div className="absolute top-[30%] left-[50%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 flex flex-col items-center p-6 py-12 min-h-screen w-full">
        <div className="w-full max-w-3xl bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 md:px-10 border-b border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5">
            <button onClick={() => router.back()} className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black tracking-tight text-white drop-shadow-md">Settings Configuration</h1>
            <div className="h-10 w-10" />
          </div>

          <div className="p-6 md:p-10 space-y-10">
            
            {/* Section 1: Account */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <User className="h-4 w-4 text-purple-400" /> Account Data
              </h2>
              <div className="bg-black/20 rounded-3xl border border-white/5 p-6 md:p-8 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-5 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Linked Email</label>
                  <div className="relative opacity-60 cursor-not-allowed">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input 
                      type="email" 
                      value={email}
                      readOnly
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-5 text-white font-medium cursor-not-allowed pointer-events-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white rounded-[1rem] font-bold transition-all text-sm border border-white/10 shadow-sm flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 
                    Save Variations
                  </button>
                </div>
              </div>
            </section>

            {/* Section 2: Preferences */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" /> Interface Preferences
              </h2>
              <div className="bg-black/20 rounded-3xl border border-white/5 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={clsx("p-3.5 rounded-2xl border shadow-inner transition-colors", isDarkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-slate-500/10 border-slate-500/20")}>
                      <Moon className={clsx("h-5 w-5 transition-colors", isDarkMode ? "text-blue-400" : "text-slate-400")} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-slate-900 dark:text-white text-[15px]">Dark App Mode</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Interface defaults to Dribbble styling.</p>
                    </div>
                  </div>
                  <div 
                    onClick={toggleTheme}
                    className={clsx(
                      "w-14 h-7 rounded-full flex items-center p-1 cursor-pointer transition-all border shadow-inner",
                      isDarkMode ? "bg-blue-500 border-blue-400/50 justify-end shadow-[0_0_15px_rgba(59,130,246,0.4)]" : "bg-slate-300 dark:bg-slate-700 border-slate-200 dark:border-slate-600 justify-start"
                    )}
                  >
                    <div className="bg-white w-5 h-5 rounded-full shadow-sm"></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Danger Zone */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-red-500/80 mb-5 flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Danger Authorization
              </h2>
              <div className="bg-red-500/5 rounded-3xl border border-red-500/10 p-6 md:p-8 flex flex-col gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center justify-between p-4 px-5 rounded-2xl bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] border border-white/5 transition-all group shadow-sm text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-500/10 rounded-lg group-hover:bg-slate-500/20 transition-colors">
                      <LogOut className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-bold text-slate-300 group-hover:text-white transition-colors">Terminate Session</span>
                  </div>
                  {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <ArrowLeft className="h-4 w-4 rotate-180 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-1" />}
                </button>

                <button 
                  onClick={() => toast.error('Account deletion disabled manually.')}
                  className="w-full flex items-center justify-between p-4 px-5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98] border border-red-500/20 transition-all group shadow-sm text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/30 transition-colors">
                      <Trash2 className="h-4 w-4 text-red-400 group-hover:text-red-300 transition-colors" />
                    </div>
                    <span className="font-bold text-red-400 group-hover:text-red-300 transition-colors">Liquidate Account Data</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-red-500 group-hover:translate-x-1 transition-transform" />
                </button>

              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
