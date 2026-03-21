import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 font-sans text-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden w-full relative">
        {children}
      </main>
    </div>
  )
}
