import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a past timestamp into a compact relative string.
 * e.g. "5m", "3h", "2d", "1m" (month), "1y"
 */
export const formatOnlineTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 30) return `${diffDays}d`
  if (diffMonths < 12) return `${diffMonths}th`
  return `${diffYears}y`
}

/**
 * Format a message timestamp:
 * - Today     → "14:35"
 * - Yesterday → "Hôm qua 23:10"
 * - This year → "22/9 09:15"
 * - Older     → "15/12/2023 18:40"
 */
export const formatMessageTime = (date: Date): string => {
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  const timeStr = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  if (isToday) return timeStr
  if (isYesterday) return `Hôm qua ${timeStr}`
  if (date.getFullYear() === now.getFullYear())
    return `${date.getDate()}/${date.getMonth() + 1} ${timeStr}`
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${timeStr}`
}
