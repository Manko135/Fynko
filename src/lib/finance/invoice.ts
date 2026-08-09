import {
  addMonthsClamped,
  daysInMonth,
  diffDays,
  parseISODate,
  toISODate,
  type ISODate,
} from '@/lib/dates'
import type { Cents } from '@/lib/money'

/** The closing date within a given year/month, clamped to month length. */
function closingInMonth(
  year: number,
  monthIndex0: number,
  closingDay: number,
): ISODate {
  const day = Math.min(closingDay, daysInMonth(year, monthIndex0))
  return toISODate(new Date(year, monthIndex0, day))
}

/** The next closing date that is on or after `today` ("ainda vai ocorrer"). */
export function nextClosingOnOrAfter(
  closingDay: number,
  today: ISODate,
): ISODate {
  const t = parseISODate(today)
  const thisMonth = closingInMonth(t.getFullYear(), t.getMonth(), closingDay)
  if (diffDays(thisMonth, today) >= 0) return thisMonth
  return closingInMonth(t.getFullYear(), t.getMonth() + 1, closingDay)
}

export type InvoiceWindows = {
  /** Exclusive lower bound. */
  prevClosing: ISODate
  /** Inclusive upper bound of the current invoice. */
  nextClosing: ISODate
  /** Inclusive upper bound of the next invoice. */
  afterNextClosing: ISODate
}

export function invoiceWindows(
  closingDay: number,
  today: ISODate,
): InvoiceWindows {
  const nextClosing = nextClosingOnOrAfter(closingDay, today)
  return {
    prevClosing: addMonthsClamped(nextClosing, -1),
    nextClosing,
    afterNextClosing: addMonthsClamped(nextClosing, 1),
  }
}

type CardExpense = {
  amountCents: Cents
  dueDate: ISODate
  paymentDate: ISODate | null | undefined
  subscriptionId?: string | null
}

/** Is `due` inside the half-open window (lower, upper]? */
function inWindow(due: ISODate, lower: ISODate, upper: ISODate): boolean {
  return diffDays(due, lower) > 0 && diffDays(due, upper) <= 0
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
 * The unpaid expenses that make up the current invoice (due in the current
 * window). Used by "pagar fatura" to know which rows to settle. Generic over
 * the row shape so callers keep their ids/extra fields.
 */
export function currentInvoiceExpenses<
  T extends {
    dueDate: ISODate
    paymentDate: ISODate | null | undefined
    subscriptionId?: string | null
  },
>(closingDay: number, expenses: T[], today: ISODate): T[] {
  const w = invoiceWindows(closingDay, today)
  return expenses.filter(
    (e) =>
      !e.paymentDate &&
      !futureSubscriptionCharge(e, today) &&
      inWindow(e.dueDate, w.prevClosing, w.nextClosing),
  )
}

export type CardSummary = {
  windows: InvoiceWindows
  /** Unpaid expenses whose due date falls in the current invoice window. */
  currentInvoiceCents: Cents
  /** Unpaid expenses whose due date falls in the next window. */
  nextInvoiceCents: Cents
  /** ALL unpaid expenses on the card — future parcels already commit limit. */
  usedLimitCents: Cents
  availableLimitCents: Cents
}

/**
 * Summarize a credit card's invoices and limit usage.
 *
 * Per spec: the "current invoice" is unpaid expenses with a due date between the
 * previous closing (exclusive) and the next upcoming closing (inclusive); the
 * "used limit" is EVERY unpaid expense on the card, not just the current
 * invoice, because future installments already commit available credit.
 */
export function summarizeCard(
  limitCents: Cents,
  closingDay: number,
  expenses: CardExpense[],
  today: ISODate,
): CardSummary {
  const windows = invoiceWindows(closingDay, today)
  let currentInvoiceCents = 0
  let nextInvoiceCents = 0
  let usedLimitCents = 0

  for (const e of expenses) {
    if (e.paymentDate) continue // paid → no longer on the card's open balance
    if (futureSubscriptionCharge(e, today)) continue // not charged to the card yet
    usedLimitCents += e.amountCents
    if (inWindow(e.dueDate, windows.prevClosing, windows.nextClosing)) {
      currentInvoiceCents += e.amountCents
    } else if (
      inWindow(e.dueDate, windows.nextClosing, windows.afterNextClosing)
    ) {
      nextInvoiceCents += e.amountCents
    }
  }

  return {
    windows,
    currentInvoiceCents,
    nextInvoiceCents,
    usedLimitCents,
    availableLimitCents: limitCents - usedLimitCents,
  }
}
