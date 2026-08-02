/**
 * Date helpers for Fynko. We store dates as 'YYYY-MM-DD' strings (no timezone
 * surprises — a due date is a calendar day, not an instant). All comparisons
 * are date-only.
 */

export type ISODate = string // 'YYYY-MM-DD'

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse 'YYYY-MM-DD' into a local Date at midnight (no UTC shift). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysInMonth(year: number, monthIndex0: number): number {
  // Day 0 of next month === last day of this month.
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/**
 * Add `n` months to a date, clamping the day to the target month's length.
 * Jan 31 + 1 month → Feb 28 (or 29). A day-31 due date never "vaza" into the
 * next month. `n` may be negative.
 */
export function addMonthsClamped(iso: ISODate, n: number): ISODate {
  const d = parseISODate(iso)
  const targetMonthFirst = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const y = targetMonthFirst.getFullYear()
  const m = targetMonthFirst.getMonth()
  const day = Math.min(d.getDate(), daysInMonth(y, m))
  return toISODate(new Date(y, m, day))
}

/** Whole-day difference a - b (positive when a is after b). */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISODate(a).getTime() - parseISODate(b).getTime()
  return Math.round(ms / 86_400_000)
}

/** 'YYYY-MM' bucket key for the month a date falls in. */
export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7)
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

/** Human date for the UI, e.g. '23 jul 2026'. */
export function formatDisplayDate(iso: ISODate): string {
  return parseISODate(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
