'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Zap, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      if (error) throw error
    } catch (err: any) {
      toast.error('Google Auth Failed', { description: err.message })
      setIsGoogleLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Check Profile Existence
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('user_id').eq('user_id', data.user.id).single()
        if (!profile) {
          // Initialize automatic profile
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            name: 'Student User',
            email: data.user.email,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
        }
      }

      toast.success('Successfully authenticated!')
      router.push('/dashboard/notes')
      router.refresh()
    } catch (err: any) {
      toast.error('Authentication Failed', { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] font-sans text-slate-50 relative overflow-hidden px-4">
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
        
        <div className="p-8 md:p-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md mb-2">Welcome Back</h1>
          <p className="text-sm font-medium text-slate-400 mb-8">Sign in to your AI Study Assistant</p>

          <button 
            type="button"
            onClick={handleGoogleLogin} 
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white rounded-[1.25rem] border border-white/10 hover:border-white/20 py-3.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-bold shadow-sm disabled:opacity-50 disabled:pointer-events-none mb-2"
          >
            {isGoogleLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative flex items-center py-5 w-full">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] font-black uppercase tracking-widest bg-[#0a0f1d] px-2 rounded-full border border-white/5">or login with email</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-5">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full bg-black/20 border border-white/10 hover:border-white/20 rounded-[1.25rem] py-4 pl-14 pr-5 text-[15px] font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-black/20 border border-white/10 hover:border-white/20 rounded-[1.25rem] py-4 pl-14 pr-5 text-[15px] font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all shadow-inner"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !email || !password}
              className="mt-6 w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-[1.25rem] shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] py-4 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-bold border-0 disabled:opacity-50 disabled:pointer-events-none group"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Secure Login
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-sm font-medium text-slate-400">
            Don't have an account?{' '}
            <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-bold underline decoration-purple-500/30 underline-offset-4 transition-colors">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
