import { supabase } from '@/services/supabase'
import { addDays, addMonthsClamped } from '@/lib/dates'
import type { Subscription, SubscriptionFrequency } from '@/types/domain'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

/** The "Assinaturas" expense category, creating it if it doesn't exist. */
async function assinaturasCategoryId(userId: string): Promise<string> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('kind', 'expense')
    .eq('name', 'Assinaturas')
    .maybeSingle()
  if (data) return data.id
  const { data: created, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: 'Assinaturas', kind: 'expense', color: '#0F766E', is_default: true })
    .select('id')
    .single()
  if (error) throw error
  return created.id
}

export function advanceDue(
  date: string,
  freq: SubscriptionFrequency,
  intervalDays?: number | null,
): string {
  // Personalizada advances by a free day interval when set; otherwise rolls
  // monthly as a sensible default (keeps legacy custom subscriptions working).
  if (freq === 'personalizada' && intervalDays && intervalDays > 0) {
    return addDays(date, intervalDays)
  }
  return addMonthsClamped(date, freq === 'anual' ? 12 : 1)
}

export type SubscriptionInput = {
  name: string
  amount_cents: number
  account_id: string | null
  card_id: string | null
  frequency: SubscriptionFrequency
  interval_days: number | null
  next_due: string
  status: Subscription['status']
  color: string | null
  notes: string | null
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('next_due', { ascending: true })
  if (error) throw error
  return data as Subscription[]
}

/** Payload of the expense that mirrors a subscription's next charge. */
function linkedExpense(
  userId: string,
  categoryId: string,
  subId: string,
  input: Pick<SubscriptionInput, 'name' | 'amount_cents' | 'account_id' | 'card_id' | 'next_due'>,
) {
  return {
    user_id: userId,
    description: input.name,
    category_id: categoryId,
    account_id: input.account_id,
    card_id: input.card_id,
    amount_cents: input.amount_cents,
    due_date: input.next_due,
    payment_date: null,
    type: 'fixa' as const,
    subscription_id: subId,
  }
}

export async function createSubscription(input: SubscriptionInput): Promise<Subscription> {
  const user_id = await currentUserId()
  const category_id = await assinaturasCategoryId(user_id)

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .insert({ ...input, user_id, category_id })
    .select()
    .single()
  if (error) throw error

  // Generate the linked expense for the next charge (only if active).
  if (input.status === 'ativa') {
    const { error: expErr } = await supabase
      .from('expenses')
      .insert(linkedExpense(user_id, category_id, sub.id, input))
    if (expErr) throw expErr
  }
  return sub as Subscription
}

export async function updateSubscription(
  id: string,
  patch: SubscriptionInput,
): Promise<Subscription> {
  const user_id = await currentUserId()
  const category_id = await assinaturasCategoryId(user_id)

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .update({ ...patch, category_id })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Reflect the change in the UNPAID linked expense (the upcoming charge).
  const { data: upcoming } = await supabase
    .from('expenses')
    .select('id')
    .eq('subscription_id', id)
    .is('payment_date', null)

  const expensePatch = {
    description: patch.name,
    category_id,
    account_id: patch.account_id,
    card_id: patch.card_id,
    amount_cents: patch.amount_cents,
    due_date: patch.next_due,
  }

  if (patch.status !== 'ativa') {
    // Paused/cancelled: drop the upcoming charge.
    if (upcoming?.length)
      await supabase.from('expenses').delete().in('id', upcoming.map((e) => e.id))
  } else if (upcoming?.length) {
    await supabase.from('expenses').update(expensePatch).in('id', upcoming.map((e) => e.id))
  } else {
    // Re-activated with no upcoming charge → create one.
    await supabase.from('expenses').insert(linkedExpense(user_id, category_id, id, patch))
  }
  return sub as Subscription
}

export async function deleteSubscription(id: string): Promise<void> {
  // Remove only the upcoming (unpaid) linked charge; keep paid history (its
  // subscription_id is nulled by the FK on delete).
  const { data: upcoming } = await supabase
    .from('expenses')
    .select('id')
    .eq('subscription_id', id)
    .is('payment_date', null)
  if (upcoming?.length)
    await supabase.from('expenses').delete().in('id', upcoming.map((e) => e.id))
  const { error } = await supabase.from('subscriptions').delete().eq('id', id)
  if (error) throw error
}

/**
 * Roll forward: for each active subscription whose upcoming charge is already
 * paid (no unpaid linked expense), advance next_due by the frequency and create
 * the next charge. Keeps exactly one pending charge per active subscription
 * without a persistent server. Returns how many were advanced.
 */
export async function reconcileSubscriptions(): Promise<number> {
  const user_id = await currentUserId()
  const category_id = await assinaturasCategoryId(user_id)
  const subs = await listSubscriptions()
  let advanced = 0

  for (const s of subs) {
    if (s.status !== 'ativa') continue
    const { count } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', s.id)
      .is('payment_date', null)
    if ((count ?? 0) > 0) continue

    const nextDue = advanceDue(s.next_due, s.frequency, s.interval_days)
    await supabase.from('subscriptions').update({ next_due: nextDue }).eq('id', s.id)
    await supabase.from('expenses').insert(
      linkedExpense(user_id, category_id, s.id, {
        name: s.name,
        amount_cents: s.amount_cents,
        account_id: s.account_id,
        card_id: s.card_id,
        next_due: nextDue,
      }),
    )
    advanced++
  }
  return advanced
}
