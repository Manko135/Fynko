import { supabase } from '@/services/supabase'
import { addDays, addMonthsClamped, todayISO } from '@/lib/dates'
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

/**
 * Bring ONE subscription's charges in line with reality (the single source of
 * truth used by create, update and the periodic reconcile — same code path on
 * mobile and desktop, so behaviour can never diverge):
 *  - a charge is only created once its occurrence date has ARRIVED (due_date <=
 *    today), so a future subscription never lands on the card / consumes limit;
 *  - a retroactive date within the current cycle is charged immediately;
 *  - occurrences are keyed by (subscription_id, due_date), so re-running (mount,
 *    edit, mobile then desktop) never duplicates a charge;
 *  - any UNPAID charge sitting in the future is removed (cleans up early ones);
 *  - paused/cancelled subscriptions have their upcoming unpaid charges dropped.
 * Returns true when something changed.
 */
async function processSubscription(
  sub: Subscription,
  userId: string,
  categoryId: string,
  today: string,
): Promise<boolean> {
  const { data: rows } = await supabase
    .from('expenses')
    .select('id, due_date, payment_date')
    .eq('subscription_id', sub.id)
  const charges = rows ?? []

  if (sub.status !== 'ativa') {
    const upcoming = charges.filter((c) => !c.payment_date)
    if (upcoming.length === 0) return false
    await supabase.from('expenses').delete().in('id', upcoming.map((c) => c.id))
    return true
  }

  let changed = false

  // A subscription is not charged before its date: drop unpaid FUTURE charges.
  const futureUnpaid = charges.filter((c) => !c.payment_date && c.due_date > today)
  if (futureUnpaid.length) {
    await supabase.from('expenses').delete().in('id', futureUnpaid.map((c) => c.id))
    changed = true
  }

  // Create the charge for each occurrence already due (<= today), no duplicates.
  const have = new Set(charges.filter((c) => c.due_date <= today).map((c) => c.due_date))
  const toInsert: Array<Record<string, unknown>> = []
  let nextDue = sub.next_due
  while (nextDue <= today) {
    if (!have.has(nextDue)) {
      toInsert.push(
        linkedExpense(userId, categoryId, sub.id, {
          name: sub.name,
          amount_cents: sub.amount_cents,
          account_id: sub.account_id,
          card_id: sub.card_id,
          next_due: nextDue,
        }),
      )
      have.add(nextDue)
    }
    nextDue = advanceDue(nextDue, sub.frequency, sub.interval_days)
  }
  if (toInsert.length) {
    await supabase.from('expenses').insert(toInsert)
    changed = true
  }
  if (nextDue !== sub.next_due) {
    await supabase.from('subscriptions').update({ next_due: nextDue }).eq('id', sub.id)
    changed = true
  }
  return changed
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

  // Charges are generated only for occurrences already due; a future one waits.
  await processSubscription(sub as Subscription, user_id, category_id, todayISO())
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

  // Reflect field edits on the existing UNPAID charges — their occurrence dates
  // stay; only value/name/account/card follow the edit.
  if (patch.status === 'ativa') {
    const { data: upcoming } = await supabase
      .from('expenses')
      .select('id')
      .eq('subscription_id', id)
      .is('payment_date', null)
    if (upcoming?.length) {
      await supabase
        .from('expenses')
        .update({
          description: patch.name,
          category_id,
          account_id: patch.account_id,
          card_id: patch.card_id,
          amount_cents: patch.amount_cents,
        })
        .in('id', upcoming.map((e) => e.id))
    }
  }
  // Re-sync: create newly-due charges, drop future ones, handle pause/cancel.
  await processSubscription(sub as Subscription, user_id, category_id, todayISO())
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
 * Periodic reconcile (runs when the Assinaturas module mounts, on any device):
 * generate the charges whose dates have arrived and clean up early ones, for
 * every subscription. Idempotent — safe to run repeatedly and from mobile and
 * desktop without duplicating anything. Returns how many were changed.
 */
export async function reconcileSubscriptions(): Promise<number> {
  const user_id = await currentUserId()
  const category_id = await assinaturasCategoryId(user_id)
  const subs = await listSubscriptions()
  const today = todayISO()
  let changed = 0
  for (const s of subs) {
    if (await processSubscription(s, user_id, category_id, today)) changed++
  }
  return changed
}
