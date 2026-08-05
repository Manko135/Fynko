import { supabase } from '@/services/supabase'
import { daysInMonth, monthKey, todayISO } from '@/lib/dates'
import type { RecurringIncome } from '@/types/domain'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export type RecurringIncomeInput = {
  description: string
  amount_cents: number
  category_id: string | null
  account_id: string | null
  day_of_month: number
  start_date: string
  end_date: string | null
}

export async function listRecurringIncomes(): Promise<RecurringIncome[]> {
  const { data, error } = await supabase
    .from('recurring_incomes')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as RecurringIncome[]
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Generate the missing monthly incomes for every ACTIVE model, from its start
 * month up to the current month (respecting an optional end date). Idempotent —
 * never duplicates a month already generated. Returns how many were created.
 */
export async function reconcileRecurringIncomes(): Promise<number> {
  const user_id = await currentUserId()
  const models = await listRecurringIncomes()
  if (models.length === 0) return 0

  // Which months each model has already generated.
  const { data: existing } = await supabase
    .from('incomes')
    .select('recurring_income_id, date')
    .not('recurring_income_id', 'is', null)
  const done = new Map<string, Set<string>>()
  for (const r of existing ?? []) {
    const set = done.get(r.recurring_income_id) ?? new Set<string>()
    set.add(monthKey(r.date))
    done.set(r.recurring_income_id, set)
  }

  const curMonth = monthKey(todayISO())
  const rows: Array<Record<string, unknown>> = []

  for (const m of models) {
    if (!m.active) continue
    const doneSet = done.get(m.id) ?? new Set<string>()
    const endMonth = m.end_date ? monthKey(m.end_date) : curMonth
    const stopMonth = endMonth < curMonth ? endMonth : curMonth

    let y = Number(m.start_date.slice(0, 4))
    let mo = Number(m.start_date.slice(5, 7))
    while (`${y}-${pad(mo)}` <= stopMonth) {
      const mk = `${y}-${pad(mo)}`
      if (!doneSet.has(mk)) {
        const day = Math.min(m.day_of_month, daysInMonth(y, mo - 1))
        const date = `${y}-${pad(mo)}-${pad(day)}`
        if (date >= m.start_date && (!m.end_date || date <= m.end_date)) {
          rows.push({
            user_id,
            description: m.description,
            category_id: m.category_id,
            account_id: m.account_id,
            amount_cents: m.amount_cents,
            date,
            recurring_income_id: m.id,
          })
        }
      }
      mo++
      if (mo > 12) {
        mo = 1
        y++
      }
    }
  }

  if (rows.length === 0) return 0
  const { error } = await supabase.from('incomes').insert(rows)
  if (error) throw error
  return rows.length
}

export async function createRecurringIncome(
  input: RecurringIncomeInput,
): Promise<RecurringIncome> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('recurring_incomes')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  // Generate the past + current occurrences immediately.
  await reconcileRecurringIncomes()
  return data as RecurringIncome
}

/** Stop future generation — incomes already received are kept. */
export async function cancelRecurringIncome(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_incomes')
    .update({ active: false })
    .eq('id', id)
  if (error) throw error
}
