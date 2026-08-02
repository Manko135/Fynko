import { supabase } from '@/services/supabase'
import type { Card } from '@/types/domain'

export type CardInput = {
  name: string
  brand: string | null
  limit_cents: number
  closing_day: number
  due_day: number
  color: string | null
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export async function listCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Card[]
}

export async function createCard(input: CardInput): Promise<Card> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('cards')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Card
}

export async function updateCard(
  id: string,
  patch: Partial<CardInput>,
): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Card
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw error
}
