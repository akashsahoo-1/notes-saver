import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Notes Saver',
  description: 'AI-powered study companion and note-taking platform.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased selection:bg-zinc-800 selection:text-zinc-100`}>
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  )
}
