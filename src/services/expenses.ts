import { supabase } from '@/services/supabase'
import type { Expense } from '@/types/domain'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('due_date', { ascending: false })
  if (error) throw error
  return data as Expense[]
}

/**
 * Insert one row, or many at once (installment groups). Returns the created
 * rows. user_id is stamped from the session for RLS.
 */
export async function insertExpenses(
  rows: Array<Record<string, unknown>>,
): Promise<Expense[]> {
  const user_id = await currentUserId()
  const withUser = rows.map((r) => ({ ...r, user_id }))
  const { data, error } = await supabase
    .from('expenses')
    .insert(withUser)
    .select()
  if (error) throw error
  return data as Expense[]
}

export async function updateExpense(
  id: string,
  patch: Record<string, unknown>,
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

/** Delete every expense in an installment group at once. */
export async function deleteExpenseGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('installment_group', groupId)
  if (error) throw error
}

/**
 * Settle a set of expenses (pay the invoice): stamp the payment date and the
 * paying account on every listed expense, in one call. The paying account is
 * what debits the balance on the payment date (cash rule).
 */
export async function settleExpenses(
  ids: string[],
  accountId: string,
  paymentDate: string,
): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('expenses')
    .update({ payment_date: paymentDate, account_id: accountId })
    .in('id', ids)
  if (error) throw error
}
