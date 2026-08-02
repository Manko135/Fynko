import { supabase } from '@/services/supabase'
import type { Budget, BudgetScope } from '@/types/domain'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export type BudgetInput = {
  scope: BudgetScope
  category_id: string | null
  card_id: string | null
  amount_cents: number
}

export async function listBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Budget[]
}

export async function createBudget(input: BudgetInput): Promise<Budget> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('budgets')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Budget
}

export async function updateBudget(
  id: string,
  patch: Partial<BudgetInput>,
): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Budget
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
}
