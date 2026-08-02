import { supabase } from '@/services/supabase'

const TABLES = [
  'accounts', 'cards', 'categories', 'incomes', 'expenses', 'goals',
  'goal_contributions', 'transfers', 'subscriptions', 'budgets', 'assets', 'liabilities',
] as const

async function uid(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export type Backup = {
  app: 'fynko'
  version: number
  exportedAt: string
  // Raw rows per table; loosely typed since this round-trips arbitrary snapshots.
  data: Record<string, any[]>
}

/** Full account snapshot (RLS restricts to the signed-in user). */
export async function exportAll(): Promise<Backup> {
  const data: Backup['data'] = {}
  for (const t of TABLES) {
    const { data: rows, error } = await supabase.from(t).select('*')
    if (error) throw error
    data[t] = rows ?? []
  }
  return { app: 'fynko', version: 1, exportedAt: new Date().toISOString(), data }
}

type Row = Record<string, any>
async function insertReturningId(table: string, row: Row): Promise<string> {
  const { data, error } = await supabase.from(table).insert(row).select('id').single()
  if (error) throw error
  return data.id as string
}

/**
 * Restore a backup. Categories/accounts/cards with a matching name are reused
 * (not duplicated); everything else is added as new, with foreign keys remapped
 * to the reused/new ids.
 */
export async function importAll(dump: Backup): Promise<void> {
  if (dump?.app !== 'fynko' || !dump.data) throw new Error('Arquivo de backup inválido.')
  const userId = await uid()
  const d = dump.data
  const catMap = new Map<string, string>()
  const accMap = new Map<string, string>()
  const cardMap = new Map<string, string>()
  const goalMap = new Map<string, string>()
  const subMap = new Map<string, string>()

  // categories — reuse by (kind,name)
  const { data: existCats } = await supabase.from('categories').select('id,name,kind')
  const catKey = new Map((existCats ?? []).map((c) => [`${c.kind}:${c.name}`, c.id]))
  for (const c of d.categories ?? []) {
    const key = `${c.kind}:${c.name}`
    let id = catKey.get(key)
    if (!id) {
      id = await insertReturningId('categories', { user_id: userId, name: c.name, kind: c.kind, color: c.color, icon: c.icon, is_default: c.is_default })
      catKey.set(key, id)
    }
    catMap.set(c.id as string, id)
  }

  // accounts — reuse by name
  const { data: existAccs } = await supabase.from('accounts').select('id,name')
  const accName = new Map((existAccs ?? []).map((a) => [a.name, a.id]))
  for (const a of d.accounts ?? []) {
    let id = accName.get(a.name)
    if (!id) {
      id = await insertReturningId('accounts', { user_id: userId, name: a.name, bank: a.bank, type: a.type, color: a.color, initial_balance_cents: a.initial_balance_cents, notes: a.notes })
      accName.set(a.name, id)
    }
    accMap.set(a.id as string, id)
  }

  // cards — reuse by name
  const { data: existCards } = await supabase.from('cards').select('id,name')
  const cardName = new Map((existCards ?? []).map((c) => [c.name, c.id]))
  for (const c of d.cards ?? []) {
    let id = cardName.get(c.name)
    if (!id) {
      id = await insertReturningId('cards', { user_id: userId, name: c.name, brand: c.brand, limit_cents: c.limit_cents, closing_day: c.closing_day, due_day: c.due_day, color: c.color })
      cardName.set(c.name, id)
    }
    cardMap.set(c.id as string, id)
  }

  // goals — always new
  for (const g of d.goals ?? []) {
    goalMap.set(g.id as string, await insertReturningId('goals', { user_id: userId, name: g.name, target_cents: g.target_cents, due_date: g.due_date, color: g.color, icon: g.icon }))
  }

  // subscriptions — new, remap refs
  for (const s of d.subscriptions ?? []) {
    subMap.set(s.id as string, await insertReturningId('subscriptions', { user_id: userId, name: s.name, amount_cents: s.amount_cents, category_id: catMap.get(s.category_id) ?? null, account_id: accMap.get(s.account_id) ?? null, card_id: cardMap.get(s.card_id) ?? null, frequency: s.frequency, next_due: s.next_due, status: s.status, color: s.color, icon: s.icon, notes: s.notes }))
  }

  const bulk = async (table: string, rows: Row[]) => {
    if (rows.length) {
      const { error } = await supabase.from(table).insert(rows)
      if (error) throw error
    }
  }

  await bulk('incomes', (d.incomes ?? []).map((i) => ({ user_id: userId, description: i.description, category_id: catMap.get(i.category_id) ?? null, account_id: accMap.get(i.account_id) ?? null, amount_cents: i.amount_cents, date: i.date, notes: i.notes })))
  await bulk('expenses', (d.expenses ?? []).map((e) => ({ user_id: userId, description: e.description, category_id: catMap.get(e.category_id) ?? null, account_id: accMap.get(e.account_id) ?? null, card_id: cardMap.get(e.card_id) ?? null, amount_cents: e.amount_cents, due_date: e.due_date, payment_date: e.payment_date, type: e.type, installment_group: e.installment_group, installment_index: e.installment_index, installment_count: e.installment_count, notes: e.notes, subscription_id: subMap.get(e.subscription_id) ?? null })))
  await bulk('goal_contributions', (d.goal_contributions ?? []).map((c) => ({ user_id: userId, goal_id: goalMap.get(c.goal_id), amount_cents: c.amount_cents, date: c.date, note: c.note })).filter((c) => c.goal_id))
  await bulk('transfers', (d.transfers ?? []).map((t) => ({ user_id: userId, from_account_id: accMap.get(t.from_account_id) ?? null, to_account_id: accMap.get(t.to_account_id) ?? null, amount_cents: t.amount_cents, date: t.date, note: t.note })))
  await bulk('budgets', (d.budgets ?? []).map((b) => ({ user_id: userId, scope: b.scope, category_id: catMap.get(b.category_id) ?? null, card_id: cardMap.get(b.card_id) ?? null, amount_cents: b.amount_cents })))
  await bulk('assets', (d.assets ?? []).map((a) => ({ user_id: userId, name: a.name, category: a.category, value_cents: a.value_cents, acquired_date: a.acquired_date, notes: a.notes })))
  await bulk('liabilities', (d.liabilities ?? []).map((l) => ({ user_id: userId, name: l.name, category: l.category, value_cents: l.value_cents, notes: l.notes })))
}
