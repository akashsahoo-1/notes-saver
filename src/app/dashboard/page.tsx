import { createClient } from '@/lib/supabase/server'
import { BookOpen, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { count: subjectCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true })
  const { count: notesCount } = await supabase.from('notes').select('*', { count: 'exact', head: true })

  return (
    <div className="flex h-full flex-col p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-10 flex flex-col items-start gap-2 pt-10 md:pt-0">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Welcome back, {user?.email?.split('@')[0] || 'Student'}! 👋
        </h1>
        <p className="text-zinc-400">Here's a quick overview of your study materials.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewCard
          title="Total Subjects"
          value={subjectCount || 0}
          icon={BookOpen}
          color="bg-blue-500/10 text-blue-500"
          href="/dashboard/subjects"
        />
        <OverviewCard
          title="Total Notes"
          value={notesCount || 0}
          icon={FileText}
          color="bg-purple-500/10 text-purple-500"
          href="/dashboard/notes"
        />
        <OverviewCard
          title="AI Tools"
          value="4 Active"
          icon={Sparkles}
          color="bg-amber-500/10 text-amber-500"
          href="/dashboard/notes"
        />
      </div>

      <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 text-center border-dashed">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
          <BookOpen className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="mb-2 text-xl font-medium text-white">Start your study session</h3>
        <p className="mb-6 text-zinc-400 max-w-md mx-auto">
          Create a new subject or dive straight into taking notes. Organize everything in one place with AI-powered features.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard/notes/create">
            <Button size="lg" className="w-full sm:w-auto">Create Note</Button>
          </Link>
          <Link href="/dashboard/subjects">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">Manage Subjects</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function OverviewCard({ title, value, icon: Icon, color, href }: any) {
  return (
    <Link href={href} className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-800/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Link>
  )
}
