import { diffDays, type ISODate } from '@/lib/dates'

export type ExpenseStatus = 'pago' | 'vencido' | 'a_vencer' | 'em_aberto' | 'cartao'

export const A_VENCER_WINDOW_DAYS = 7

/**
 * Derive an expense's status from its dates — never stored, always computed, so
 * editing a payment date recalculates everything downstream automatically.
 *
 * Exactly one status applies:
 *  - pago      → has a payment date
 *  - vencido   → unpaid and past due
 *  - a_vencer  → unpaid and due within the next A_VENCER_WINDOW_DAYS
 *  - em_aberto → unpaid and still comfortably ahead of due
 */
export function expenseStatus(
  dueDate: ISODate,
  paymentDate: ISODate | null | undefined,
  today: ISODate,
): ExpenseStatus {
  if (paymentDate) return 'pago'
  const daysUntilDue = diffDays(dueDate, today)
  if (daysUntilDue < 0) return 'vencido'
  if (daysUntilDue <= A_VENCER_WINDOW_DAYS) return 'a_vencer'
  return 'em_aberto'
}

/**
 * Status of a full expense row, card-aware: an UNPAID card purchase is 'cartao'
 * (it belongs to a credit-card invoice, so it isn't "vencida" or "a vencer" by
 * the purchase date). Everything else — including a PAID card expense once its
 * invoice is settled — falls back to the plain date-based status. Financial
 * competência (cash by payment_date / vencimento) does NOT depend on this.
 */
export function expenseStatusOf(
  e: {
    due_date: ISODate
    payment_date: ISODate | null | undefined
    card_id: string | null
  },
  today: ISODate,
): ExpenseStatus {
  if (e.card_id && !e.payment_date) return 'cartao'
  return expenseStatus(e.due_date, e.payment_date, today)
}

/** Urgency bucket for the alerts bell — one bucket per expense, most urgent. */
export type UrgencyBucket =
  | 'vencida'
  | 'vence_hoje'
  | 'vence_3_dias'
  | 'vence_7_dias'
  | null

export function urgencyBucket(
  dueDate: ISODate,
  paymentDate: ISODate | null | undefined,
  today: ISODate,
): UrgencyBucket {
  if (paymentDate) return null
  const d = diffDays(dueDate, today)
  if (d < 0) return 'vencida'
  if (d === 0) return 'vence_hoje'
  if (d <= 3) return 'vence_3_dias'
  if (d <= 7) return 'vence_7_dias'
  return null
}
