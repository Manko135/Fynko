import { addDays, addMonthsClamped, daysInMonth, toISODate, type ISODate } from '@/lib/dates'
import { computeBalances } from '@/lib/finance/balance'
import type {
  Expense,
  Income,
  RecurringIncome,
  Subscription,
  SubscriptionFrequency,
} from '@/types/domain'

/**
 * Financial projection: "given my real balance today, and everything the system
 * already predicts will happen between today and a target date, how much will I
 * have on that date?". It REUSES the app's existing rules — no second engine:
 *  - today's balance comes from computeBalances (the same cash rule used app-wide);
 *  - materialized incomes/expenses are summed by their effective date (payment
 *    date if paid, else due date — the vencimento);
 *  - recurring incomes and subscriptions are projected forward using the SAME
 *    schedule rules the reconcilers use (day_of_month / next_due + frequency),
 *    so occurrences that aren't materialized yet are still counted;
 *  - installments are already fully materialized, so they need no projection.
 * Nothing here writes data — it's a pure what-if.
 */

export type ProjectionKind = 'receita' | 'despesa' | 'assinatura' | 'parcela'

export type ProjectionFilter = {
  accountIds?: string[]
  cardIds?: string[]
  categoryIds?: string[]
  kinds?: ProjectionKind[]
}

export type ProjectionEvent = {
  date: ISODate
  kind: ProjectionKind
  label: string
  /** Signed: positive = inflow, negative = outflow. */
  amountCents: number
}

export type Projection = {
  saldoAtualCents: number
  receitasCents: number
  despesasCents: number
  assinaturasCents: number
  parcelasCents: number
  saldoPrevistoCents: number
  events: ProjectionEvent[]
}

export type ProjectionInput = {
  accounts: { id: string; initial_balance_cents: number }[]
  incomes: Income[]
  expenses: Expense[]
  subscriptions: Subscription[]
  recurringIncomes: RecurringIncome[]
  today: ISODate
  target: ISODate
  filter?: ProjectionFilter
}

/** Mirrors services/subscriptions advanceDue — kept pure so lib has no service dep. */
function nextOccurrence(
  date: ISODate,
  freq: SubscriptionFrequency,
  intervalDays?: number | null,
): ISODate {
  if (freq === 'personalizada' && intervalDays && intervalDays > 0) {
    return addDays(date, intervalDays)
  }
  return addMonthsClamped(date, freq === 'anual' ? 12 : 1)
}

function kindOn(filter: ProjectionFilter | undefined, k: ProjectionKind): boolean {
  return !filter?.kinds || filter.kinds.length === 0 || filter.kinds.includes(k)
}

/** AND across active filter groups (account/card/category), OR within each. */
function matches(
  filter: ProjectionFilter | undefined,
  item: { account_id?: string | null; card_id?: string | null; category_id?: string | null },
): boolean {
  if (!filter) return true
  const { accountIds, cardIds, categoryIds } = filter
  if (accountIds?.length && !(item.account_id && accountIds.includes(item.account_id))) return false
  if (cardIds?.length && !(item.card_id && cardIds.includes(item.card_id))) return false
  if (categoryIds?.length && !(item.category_id && categoryIds.includes(item.category_id))) return false
  return true
}

export function projectFinances(input: ProjectionInput): Projection {
  const { accounts, incomes, expenses, subscriptions, recurringIncomes, today, target, filter } = input

  // 1) Real balance today — the app's existing cash rule, untouched.
  const seeds = accounts.map((a) => ({ id: a.id, initialBalanceCents: a.initial_balance_cents }))
  const incRows = incomes.map((i) => ({ amountCents: i.amount_cents, date: i.date, accountId: i.account_id }))
  const expRows = expenses.map((e) => ({
    amountCents: e.amount_cents,
    dueDate: e.due_date,
    paymentDate: e.payment_date,
    accountId: e.card_id && !e.payment_date ? null : e.account_id,
  }))
  const { saldoAtualCents } = computeBalances(incRows, expRows, seeds, today)

  const events: ProjectionEvent[] = []
  let receitasCents = 0
  let despesasCents = 0
  let assinaturasCents = 0
  let parcelasCents = 0

  const inWindow = (d: ISODate) => d > today && d <= target

  // 2) Materialized incomes (recurring ones are projected below to avoid gaps).
  if (kindOn(filter, 'receita')) {
    for (const i of incomes) {
      if (i.recurring_income_id) continue
      if (!inWindow(i.date)) continue
      if (!matches(filter, i)) continue
      receitasCents += i.amount_cents
      events.push({ date: i.date, kind: 'receita', label: i.description, amountCents: i.amount_cents })
    }
    // Recurring incomes: project each active model's monthly occurrence.
    for (const m of recurringIncomes) {
      if (!m.active || !matches(filter, m)) continue
      for (const d of monthlyOccurrences(m.day_of_month, today, target, m.start_date, m.end_date)) {
        receitasCents += m.amount_cents
        events.push({ date: d, kind: 'receita', label: m.description, amountCents: m.amount_cents })
      }
    }
  }

  // 3) Materialized expenses. Skip UNPAID subscription charges — they're
  //    projected from the subscription schedule so nothing is missed or doubled.
  for (const e of expenses) {
    if (e.subscription_id && !e.payment_date) continue
    const isParcela = !!e.installment_group
    const kind: ProjectionKind = isParcela ? 'parcela' : 'despesa'
    if (!kindOn(filter, kind) || !matches(filter, e)) continue
    let hits = false
    if (e.payment_date) {
      if (e.payment_date > today && e.payment_date <= target) hits = true
    } else if (e.due_date <= target) {
      hits = true // includes overdue still owed
    }
    if (!hits) continue
    if (isParcela) parcelasCents += e.amount_cents
    else despesasCents += e.amount_cents
    events.push({ date: e.payment_date ?? e.due_date, kind, label: e.description, amountCents: -e.amount_cents })
  }

  // 4) Subscriptions: project occurrences from next_due up to the target date.
  if (kindOn(filter, 'assinatura')) {
    for (const s of subscriptions) {
      if (s.status !== 'ativa' || !matches(filter, s)) continue
      let cursor = s.next_due
      let guard = 0
      while (cursor <= target && guard++ < 600) {
        assinaturasCents += s.amount_cents
        events.push({ date: cursor, kind: 'assinatura', label: s.name, amountCents: -s.amount_cents })
        cursor = nextOccurrence(cursor, s.frequency, s.interval_days)
      }
    }
  }

  const saldoPrevistoCents =
    saldoAtualCents + receitasCents - despesasCents - assinaturasCents - parcelasCents

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  return {
    saldoAtualCents,
    receitasCents,
    despesasCents,
    assinaturasCents,
    parcelasCents,
    saldoPrevistoCents,
    events,
  }
}

/** Monthly occurrences of `day` strictly after `today` and up to `target`. */
function monthlyOccurrences(
  day: number,
  today: ISODate,
  target: ISODate,
  startDate: ISODate,
  endDate: ISODate | null,
): ISODate[] {
  const out: ISODate[] = []
  let y = Number(today.slice(0, 4))
  let mo = Number(today.slice(5, 7)) - 1 // 0-based
  let guard = 0
  while (guard++ < 600) {
    const d = toISODate(new Date(y, mo, Math.min(day, daysInMonth(y, mo))))
    if (d > target) break
    if (d > today && d >= startDate && (!endDate || d <= endDate)) out.push(d)
    mo++
    if (mo > 11) {
      mo = 0
      y++
    }
  }
  return out
}
