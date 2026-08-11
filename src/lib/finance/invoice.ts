import {
  addMonthsClamped,
  daysInMonth,
  diffDays,
  parseISODate,
  toISODate,
  type ISODate,
} from '@/lib/dates'
import type { Cents } from '@/lib/money'

/** A `day`-of-month date within a given year/month, clamped to month length. */
function dayInMonth(year: number, monthIndex0: number, day: number): ISODate {
  const d = Math.min(day, daysInMonth(year, monthIndex0))
  return toISODate(new Date(year, monthIndex0, d))
}

/** The next closing date that is on or after `today` ("ainda vai ocorrer"). */
export function nextClosingOnOrAfter(
  closingDay: number,
  today: ISODate,
): ISODate {
  const t = parseISODate(today)
  const thisMonth = dayInMonth(t.getFullYear(), t.getMonth(), closingDay)
  if (diffDays(thisMonth, today) >= 0) return thisMonth
  return dayInMonth(t.getFullYear(), t.getMonth() + 1, closingDay)
}

/** The first vencimento (dueDay) strictly after `ref`. */
function dueStrictlyAfter(dueDay: number, ref: ISODate): ISODate {
  const r = parseISODate(ref)
  const thisMonth = dayInMonth(r.getFullYear(), r.getMonth(), dueDay)
  if (diffDays(thisMonth, ref) > 0) return thisMonth
  return dayInMonth(r.getFullYear(), r.getMonth() + 1, dueDay)
}

/**
 * The vencimento of the invoice that is currently OPEN (the one new purchases
 * land on): it closes at the next closing date and is due on the first
 * vencimento after that close. A card that closes on the 26th and is due on the
 * 10th, seen on 09/ago, has its open invoice closing 26/ago and due 10/set — so
 * a purchase entered now (due 10/set) belongs to the current invoice, not a
 * "future" one. This is what makes the closing day and the due day line up
 * instead of being compared against each other.
 */
export function currentInvoiceDue(
  closingDay: number,
  dueDay: number,
  today: ISODate,
): ISODate {
  const nextClosing = nextClosingOnOrAfter(closingDay, today)
  return dueStrictlyAfter(dueDay, nextClosing)
}

/**
 * The vencimento of the invoice a purchase lands on, given the card's closing
 * and due days. A buy before the next closing goes on that invoice; a buy after
 * it rolls to the following one. This is exactly "which invoice is open on the
 * purchase date", so it reuses currentInvoiceDue with the purchase date.
 * Example: compra 05/08, fecha dia 10, vence dia 20 → vencimento 20/08.
 */
export function invoiceDueForPurchase(
  purchaseDate: ISODate,
  closingDay: number,
  dueDay: number,
): ISODate {
  return currentInvoiceDue(closingDay, dueDay, purchaseDate)
}

type CardExpense = {
  amountCents: Cents
  dueDate: ISODate
  paymentDate: ISODate | null | undefined
  subscriptionId?: string | null
}

/**
 * A subscription charge dated in the FUTURE is materialized as an expense (so it
 * shows in Despesas ahead of time) but must NOT hit the card yet: it doesn't
 * consume limit and isn't on the invoice until its due date arrives. Regular
 * card expenses and installments commit the card as soon as they exist.
 */
function futureSubscriptionCharge(
  e: { dueDate: ISODate; subscriptionId?: string | null },
  today: ISODate,
): boolean {
  return !!e.subscriptionId && diffDays(e.dueDate, today) > 0
}

/**
 * The unpaid expenses that make up the current invoice (everything owed up to
 * and including the open invoice's vencimento — overdue charges included, future
 * invoices excluded). Used by "pagar fatura" to know which rows to settle.
 * Generic over the row shape so callers keep their ids/extra fields.
 */
export function currentInvoiceExpenses<
  T extends {
    dueDate: ISODate
    paymentDate: ISODate | null | undefined
    subscriptionId?: string | null
  },
>(closingDay: number, dueDay: number, expenses: T[], today: ISODate): T[] {
  const currentDue = currentInvoiceDue(closingDay, dueDay, today)
  return expenses.filter(
    (e) =>
      !e.paymentDate &&
      !futureSubscriptionCharge(e, today) &&
      diffDays(e.dueDate, currentDue) <= 0,
  )
}

export type CardSummary = {
  /** Vencimento of the currently open invoice. */
  currentDue: ISODate
  /** Vencimento of the following invoice. */
  nextDue: ISODate
  /** Unpaid expenses owed on the current invoice (due on/before currentDue). */
  currentInvoiceCents: Cents
  /** Unpaid expenses that fall in the following cycle. */
  nextInvoiceCents: Cents
  /** ALL unpaid expenses on the card — future installments already commit limit. */
  usedLimitCents: Cents
  availableLimitCents: Cents
}

/**
 * Summarize a credit card's invoices and limit usage.
 *
 * The "current invoice" is every unpaid expense due on or before the OPEN
 * invoice's vencimento (see currentInvoiceDue) — so a purchase entered now shows
 * up immediately, and overdue charges still count as owed; only genuinely later
 * invoices (future installments) fall into the next/other cycles. The "used
 * limit" is EVERY unpaid expense on the card, because future installments
 * already commit available credit. A subscription charge dated in the future is
 * excluded from both until its date arrives.
 */
export function summarizeCard(
  limitCents: Cents,
  closingDay: number,
  dueDay: number,
  expenses: CardExpense[],
  today: ISODate,
): CardSummary {
  const currentDue = currentInvoiceDue(closingDay, dueDay, today)
  const nextDue = addMonthsClamped(currentDue, 1)
  let currentInvoiceCents = 0
  let nextInvoiceCents = 0
  let usedLimitCents = 0

  for (const e of expenses) {
    if (e.paymentDate) continue // paid → no longer on the card's open balance
    if (futureSubscriptionCharge(e, today)) continue // not charged to the card yet
    usedLimitCents += e.amountCents
    if (diffDays(e.dueDate, currentDue) <= 0) {
      currentInvoiceCents += e.amountCents
    } else if (diffDays(e.dueDate, nextDue) <= 0) {
      nextInvoiceCents += e.amountCents
    }
  }

  return {
    currentDue,
    nextDue,
    currentInvoiceCents,
    nextInvoiceCents,
    usedLimitCents,
    availableLimitCents: limitCents - usedLimitCents,
  }
}
