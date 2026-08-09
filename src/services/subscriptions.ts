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
 *  - every occurrence already due (due_date <= today) has a charge — a
 *    retroactive/current one is created immediately;
 *  - the NEXT upcoming occurrence (the first due_date > today) is materialized
 *    too, so an approaching subscription shows up in Despesas ahead of time as
 *    "A vencer"/"Em aberto" (its status is derived from the due date). A future
 *    charge on a CARD is still kept off the invoice/limit until its date arrives
 *    — that exclusion lives in summarizeCard, not here;
 *  - occurrences are keyed by (subscription_id, due_date), so re-running (mount,
 *    edit, mobile then desktop) never duplicates a charge;
 *  - stray unpaid charges beyond the upcoming occurrence are cleaned up;
 *  - paused/cancelled subscriptions have their upcoming unpaid charges dropped.
 *  - next_due is kept pointing at the upcoming occurrence.
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
    const unpaid = charges.filter((c) => !c.payment_date)
    if (unpaid.length === 0) return false
    await supabase.from('expenses').delete().in('id', unpaid.map((c) => c.id))
    return true
  }

  // Occurrences we want materialized: every one already due (<= today) plus the
  // first upcoming one (> today). next_due lands on that upcoming occurrence.
  const wanted: string[] = []
  let cursor = sub.next_due
  while (cursor <= today) {
    wanted.push(cursor)
    cursor = advanceDue(cursor, sub.frequency, sub.interval_days)
  }
  wanted.push(cursor)
  const upcoming = cursor

  let changed = false

  // Rows to remove: stray unpaid FUTURE charges other than the upcoming one
  // (leftovers from an earlier schedule/edit), plus any duplicate unpaid charge
  // that shares a due_date with another (self-heals accidental double-inserts —
  // e.g. two reconciles racing). Past-due unpaid charges are kept as history;
  // one charge per due_date survives.
  const remove: Array<{ id: string }> = []
  const seen = new Set<string>()
  for (const c of charges) {
    if (c.payment_date) continue
    if (c.due_date > today && c.due_date !== upcoming) {
      remove.push(c)
      continue
    }
    if (seen.has(c.due_date)) remove.push(c)
    else seen.add(c.due_date)
  }
  if (remove.length) {
    await supabase.from('expenses').delete().in('id', remove.map((c) => c.id))
    changed = true
  }

  // Create any wanted occurrence that doesn't already have a surviving charge.
  const removed = new Set(remove.map((c) => c.id))
  const have = new Set(charges.filter((c) => !removed.has(c.id)).map((c) => c.due_date))
  const toInsert = wanted
    .filter((d) => !have.has(d))
    .map((d) =>
      linkedExpense(userId, categoryId, sub.id, {
        name: sub.name,
        amount_cents: sub.amount_cents,
        account_id: sub.account_id,
        card_id: sub.card_id,
        next_due: d,
      }),
    )
  if (toInsert.length) {
    await supabase.from('expenses').insert(toInsert)
    changed = true
  }

  if (upcoming !== sub.next_due) {
    await supabase.from('subscriptions').update({ next_due: upcoming }).eq('id', sub.id)
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
 * generate the charges whose dates have arrived (and the next upcoming one) and
 * clean up strays, for every subscription. Idempotent — safe to run repeatedly
 * and from mobile and desktop without duplicating anything. Returns how many
 * were changed.
 */
let reconciling: Promise<number> | null = null
export async function reconcileSubscriptions(): Promise<number> {
  // Concurrent callers (React StrictMode double-invokes the mount effect; two
  // tabs; a remount) share ONE run, so a brand-new charge can't be inserted
  // twice before either read sees the other.
  if (reconciling) return reconciling
  reconciling = runReconcile()
  try {
    return await reconciling
  } finally {
    reconciling = null
  }
}

async function runReconcile(): Promise<number> {
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
