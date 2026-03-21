'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, Moon, LogOut, Trash2, Shield, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0f1d] font-sans text-slate-50 relative overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] xl:top-[-10%] left-[-10%] w-[50%] xl:w-[40%] h-[50%] xl:h-[40%] rounded-full bg-purple-600/20 blur-[100px] xl:blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] xl:w-[35%] h-[45%] xl:h-[35%] rounded-full bg-pink-600/20 blur-[100px] xl:blur-[140px] mix-blend-screen" />
        <div className="absolute top-[30%] left-[50%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 flex flex-col items-center p-6 py-12 min-h-screen w-full">
        <div className="w-full max-w-3xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 md:px-10 border-b border-white/10 bg-white/5">
            <button onClick={() => router.back()} className="flex items-center justify-center h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
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
              <div className="bg-black/20 rounded-3xl border border-white/5 p-6 md:p-8 space-y-6 shadow-inner">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input 
                      type="text" 
                      defaultValue="Student User"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-5 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Linked Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input 
                      type="email" 
                      defaultValue="student@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-5 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button onClick={() => toast.success('Profile configurations synchronized successfully.')} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-[1rem] font-bold transition-all text-sm border border-white/10 shadow-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Save Variations
                  </button>
                </div>
              </div>
            </section>

            {/* Section 2: Preferences */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" /> Interface Preferences
              </h2>
              <div className="bg-black/20 rounded-3xl border border-white/5 p-6 md:p-8 shadow-inner hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
                      <Moon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-white text-[15px]">Dark App Mode</h3>
                      <p className="text-[11px] text-slate-400 font-medium tracking-wide">Interface defaults to Dribbble styling.</p>
                    </div>
                  </div>
                  <div className="w-14 h-7 bg-blue-500 rounded-full flex items-center p-1 cursor-not-allowed justify-end shadow-[0_0_15px_rgba(59,130,246,0.4)] opacity-90 transition-all border border-blue-400/50 shadow-inner">
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
              <div className="bg-red-500/5 rounded-3xl border border-red-500/10 p-6 md:p-8 flex flex-col gap-5 shadow-inner">
                
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center justify-between p-4 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group shadow-sm text-left"
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
                  onClick={() => toast.error('Account deletion disabled due to active Pro Plan safeguards.')}
                  className="w-full flex items-center justify-between p-4 px-5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all group shadow-sm text-left"
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
