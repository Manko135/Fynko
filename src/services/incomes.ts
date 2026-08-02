import { supabase } from '@/services/supabase'
import type { Income } from '@/types/domain'

export type IncomeInput = {
  description: string
  category_id: string | null
  account_id: string | null
  amount_cents: number
  date: string
  notes: string | null
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export async function listIncomes(): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data as Income[]
}

export async function createIncome(input: IncomeInput): Promise<Income> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('incomes')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Income
}

export async function updateIncome(
  id: string,
  patch: Partial<IncomeInput>,
): Promise<Income> {
  const { data, error } = await supabase
    .from('incomes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Income
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id)
  if (error) throw error
}
