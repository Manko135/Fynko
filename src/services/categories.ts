import { supabase } from '@/services/supabase'
import { DEFAULT_CATEGORIES } from '@/lib/defaultCategories'
import type { Category, CategoryKind } from '@/types/domain'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data as Category[]
}

export async function createCategory(input: {
  name: string
  kind: CategoryKind
  color: string | null
  icon?: string | null
}): Promise<Category> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, user_id, is_default: false })
    .select()
    .single()
  if (error) throw error
  return data as Category
}

/**
 * Seed the default categories once, if the user has none yet. Idempotent: it
 * checks first and does nothing when categories already exist.
 */
export async function ensureDefaultCategories(): Promise<void> {
  const user_id = await currentUserId()
  const { count, error } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  if ((count ?? 0) > 0) return

  const rows = (Object.keys(DEFAULT_CATEGORIES) as CategoryKind[]).flatMap(
    (kind) =>
      DEFAULT_CATEGORIES[kind].map((c) => ({
        user_id,
        name: c.name,
        kind,
        color: c.color,
        is_default: true,
      })),
  )
  const { error: insErr } = await supabase.from('categories').insert(rows)
  if (insErr) throw insErr
}
