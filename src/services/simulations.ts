import { supabase } from '@/services/supabase'
import type { Simulation, SimulationItem } from '@/types/domain'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export type SimulationInput = {
  name: string
  icon: string | null
  target_date: string
  items: SimulationItem[]
  notes: string | null
}

export async function listSimulations(): Promise<Simulation[]> {
  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Simulation[]
}

export async function createSimulation(input: SimulationInput): Promise<Simulation> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('simulations')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return data as Simulation
}

export async function updateSimulation(
  id: string,
  patch: Partial<SimulationInput> & { converted_at?: string | null },
): Promise<Simulation> {
  const { data, error } = await supabase
    .from('simulations')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Simulation
}

export async function deleteSimulation(id: string): Promise<void> {
  const { error } = await supabase.from('simulations').delete().eq('id', id)
  if (error) throw error
}

export async function duplicateSimulation(s: Simulation): Promise<Simulation> {
  return createSimulation({
    name: `${s.name} (cópia)`,
    icon: s.icon,
    target_date: s.target_date,
    items: s.items,
    notes: s.notes,
  })
}
