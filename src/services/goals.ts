import { supabase } from '@/services/supabase'
import type { Goal, GoalContribution } from '@/types/domain'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export type GoalInput = {
  name: string
  target_cents: number
  due_date: string | null
  color: string | null
  icon: string | null
  notes: string | null
}

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Goal[]
}

export async function listContributions(): Promise<GoalContribution[]> {
  const { data, error } = await supabase
    .from('goal_contributions')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data as GoalContribution[]
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('goals')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

export async function updateGoal(
  id: string,
  patch: Partial<GoalInput>,
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function addContribution(input: {
  goal_id: string
  amount_cents: number
  date: string
  note: string | null
}): Promise<GoalContribution> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('goal_contributions')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as GoalContribution
}
