import * as React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(dateOrTimestamp: string | number | Date): string {
  if (!dateOrTimestamp) return ''
  const date = typeof dateOrTimestamp === 'string' || typeof dateOrTimestamp === 'number' 
    ? new Date(dateOrTimestamp) 
    : dateOrTimestamp
  const now = new Date()
  const secondsPast = (now.getTime() - date.getTime()) / 1000

  if (secondsPast < 60) return 'Just now'
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)} minutes ago`
  if (secondsPast <= 86400) return `${Math.floor(secondsPast / 3600)} hours ago`
  if (secondsPast > 86400) {
    const day = date.getDate()
    const month = date.toLocaleString('default', { month: 'short' })
    const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`
    return `${month} ${day}${year}`
  }
  return ''
}
