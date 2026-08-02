import { supabase } from '@/services/supabase'
import type { Account } from '@/types/domain'

export type AccountInput = {
  name: string
  bank: string | null
  type: Account['type']
  color: string | null
  initial_balance_cents: number
  notes: string | null
}

export async function listAccounts(): Promise<Account[]> {
  // RLS restricts rows to the signed-in user automatically.
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Account[]
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Account
}

export async function updateAccount(
  id: string,
  patch: Partial<AccountInput>,
): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Account
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw error
}
