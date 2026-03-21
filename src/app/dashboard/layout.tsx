import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0a0f1d] font-sans text-slate-900 dark:text-slate-50 relative transition-colors duration-300">
      
      {/* ──────────────────────────────────────────────────────────────────────────
          Animated Background Orbs (Live Effect)
      ─────────────────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-100 transition-opacity duration-300">
        <div className="absolute top-[-15%] xl:top-[-10%] left-[-10%] w-[50%] xl:w-[40%] h-[50%] xl:h-[40%] rounded-full bg-purple-600/20 blur-[100px] xl:blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] xl:w-[35%] h-[45%] xl:h-[35%] rounded-full bg-pink-600/20 blur-[100px] xl:blur-[140px] mix-blend-screen" />
        <div className="absolute top-[30%] left-[50%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <main className="flex-1 overflow-hidden w-full relative">
          {children}
        </main>
      </div>

    </div>
  )
}
