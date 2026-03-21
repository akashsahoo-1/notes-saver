'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Zap, ArrowRight, Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Initialize automatic profile instantly upon registration
        await supabase.from('profiles').upsert({
          user_id: data.user.id,
          name: 'Student User',
          email: data.user.email,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

        // Optional sync metadata
        await supabase.auth.updateUser({ data: { name: 'Student User' } })
      }

      toast.success('Neural account activated successfully.')
      router.push('/dashboard/notes')
      router.refresh()
    } catch (err: any) {
      toast.error('Activation Failed', { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] font-sans text-slate-50 relative overflow-hidden px-4">
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
        
        <div className="p-8 md:p-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md mb-2">Initialize Profile</h1>
          <p className="text-sm font-medium text-slate-400 mb-10">Create an account to deploy your Study Assistant</p>

          <form onSubmit={handleSignup} className="w-full space-y-5">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Primary Email Address"
                  className="w-full bg-black/20 border border-white/10 hover:border-white/20 rounded-[1.25rem] py-4 pl-14 pr-5 text-[15px] font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
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
                  placeholder="Secure Password"
                  className="w-full bg-black/20 border border-white/10 hover:border-white/20 rounded-[1.25rem] py-4 pl-14 pr-5 text-[15px] font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !email || !password}
              className="mt-6 w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white rounded-[1.25rem] shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] py-4 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-bold border-0 disabled:opacity-50 disabled:pointer-events-none group"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-sm font-medium text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold underline decoration-blue-500/30 underline-offset-4 transition-colors">
              Access Terminal
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
