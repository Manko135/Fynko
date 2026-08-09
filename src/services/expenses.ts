import { supabase } from '@/services/supabase'
import type { Expense } from '@/types/domain'

export type InvoiceParcel = {
  description: string
  amount_cents: number
  due_date: string
}

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

/**
 * Parcel a card invoice instead of paying it now. The invoice's original
 * expenses are REPLACED by the installments (removed so the amount isn't counted
 * twice), and one installment expense is created per parcel, grouped so the user
 * can identify them. Removing the originals is safe: a subscription's next_due
 * has already advanced past the current cycle, so the reconcile won't recreate
 * the charge that was just parcelled.
 */
export async function parcelInvoice(
  invoiceExpenseIds: string[],
  parcels: InvoiceParcel[],
): Promise<void> {
  const user_id = await currentUserId()
  if (invoiceExpenseIds.length) {
    const { error: delErr } = await supabase
      .from('expenses')
      .delete()
      .in('id', invoiceExpenseIds)
    if (delErr) throw delErr
  }
  const group = crypto.randomUUID()
  const rows = parcels.map((p, i) => ({
    user_id,
    description: p.description,
    amount_cents: p.amount_cents,
    due_date: p.due_date,
    payment_date: null,
    type: 'parcelada' as const,
    installment_group: group,
    installment_index: i + 1,
    installment_count: parcels.length,
    account_id: null,
    card_id: null,
    category_id: null,
  }))
  const { error } = await supabase.from('expenses').insert(rows)
  if (error) throw error
}
