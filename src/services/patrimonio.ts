import { supabase } from '@/services/supabase'
import type { Asset, Liability } from '@/types/domain'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export type AssetInput = {
  name: string
  category: string
  value_cents: number
  crypto_symbol: string | null
  crypto_amount: number | null
  acquired_date: string | null
  notes: string | null
}
export type LiabilityInput = {
  name: string
  category: string
  value_cents: number
  notes: string | null
}

export async function listAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Asset[]
}

export async function listLiabilities(): Promise<Liability[]> {
  const { data, error } = await supabase
    .from('liabilities')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Liability[]
}

export async function createAsset(input: AssetInput): Promise<Asset> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('assets')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Asset
}

export async function updateAsset(id: string, patch: Partial<AssetInput>): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Asset
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}

export async function createLiability(input: LiabilityInput): Promise<Liability> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('liabilities')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Liability
}

export async function updateLiability(
  id: string,
  patch: Partial<LiabilityInput>,
): Promise<Liability> {
  const { data, error } = await supabase
    .from('liabilities')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Liability
}

export async function deleteLiability(id: string): Promise<void> {
  const { error } = await supabase.from('liabilities').delete().eq('id', id)
  if (error) throw error
}
