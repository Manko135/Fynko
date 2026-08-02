import { supabase } from '@/services/supabase'
import type { Transfer } from '@/types/domain'

export type TransferInput = {
  from_account_id: string
  to_account_id: string
  amount_cents: number
  date: string
  note: string | null
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export async function listTransfers(): Promise<Transfer[]> {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data as Transfer[]
}

export async function createTransfer(input: TransferInput): Promise<Transfer> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('transfers')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Transfer
}

export async function deleteTransfer(id: string): Promise<void> {
  const { error } = await supabase.from('transfers').delete().eq('id', id)
  if (error) throw error
}
