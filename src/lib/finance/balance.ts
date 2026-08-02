import { monthKey, type ISODate } from '@/lib/dates'
import type { Cents } from '@/lib/money'

export type IncomeRow = {
  amountCents: Cents
  date: ISODate // when the money comes/came in
  accountId?: string | null
}

export type ExpenseRow = {
  amountCents: Cents
  dueDate: ISODate
  paymentDate: ISODate | null // null = unpaid
  accountId?: string | null
}

export type AccountSeed = {
  id: string
  initialBalanceCents: Cents
}

function onOrBefore(date: ISODate, ref: ISODate): boolean {
  return date <= ref // ISO 'YYYY-MM-DD' sorts lexicographically as chronologically
}

/**
 * Global balances, computed purely from raw rows — no stored aggregates.
 *
 * Cash rule (spec, section "regra de caixa"):
 *  - saldoAtual counts income received up to today and expenses whose PAYMENT
 *    date is up to today. An expense marked paid today but dated to a past
 *    month still counts (money already left); a payment dated to the future
 *    does NOT reduce today's balance yet.
 *  - saldoPrevisto additionally subtracts every still-unpaid expense and adds
 *    income scheduled for the future.
 */
export function computeBalances(
  incomes: IncomeRow[],
  expenses: ExpenseRow[],
  accounts: AccountSeed[],
  today: ISODate,
): { saldoAtualCents: Cents; saldoPrevistoCents: Cents } {
  const initial = accounts.reduce((s, a) => s + a.initialBalanceCents, 0)

  let incomeSoFar = 0
  let futureIncome = 0
  for (const i of incomes) {
    if (onOrBefore(i.date, today)) incomeSoFar += i.amountCents
    else futureIncome += i.amountCents
  }

  let paidSoFar = 0
  let pending = 0
  for (const e of expenses) {
    if (e.paymentDate && onOrBefore(e.paymentDate, today)) {
      paidSoFar += e.amountCents
    } else if (!e.paymentDate) {
      pending += e.amountCents
    }
    // A future-dated payment is neither "paid so far" nor "pending".
  }

  const saldoAtualCents = initial + incomeSoFar - paidSoFar
  const saldoPrevistoCents = saldoAtualCents + futureIncome - pending
  return { saldoAtualCents, saldoPrevistoCents }
}

/** Current balance of a single account (initial + income in − paid out). */
export function accountBalance(
  account: AccountSeed,
  incomes: IncomeRow[],
  expenses: ExpenseRow[],
  today: ISODate,
): Cents {
  let bal = account.initialBalanceCents
  for (const i of incomes) {
    if (i.accountId === account.id && onOrBefore(i.date, today)) {
      bal += i.amountCents
    }
  }
  for (const e of expenses) {
    if (
      e.accountId === account.id &&
      e.paymentDate &&
      onOrBefore(e.paymentDate, today)
    ) {
      bal -= e.amountCents
    }
  }
  return bal
}

export type MonthlyTotal = { incomeCents: Cents; expenseCents: Cents }

/**
 * Sum income by its date and PAID expenses by their payment date, bucketed to
 * 'YYYY-MM'. This is what makes a March payment show up in March's charts even
 * if it was marked paid in July. Unpaid expenses are excluded (no cash impact).
 */
export function monthlyTotals(
  incomes: IncomeRow[],
  expenses: ExpenseRow[],
): Map<string, MonthlyTotal> {
  const map = new Map<string, MonthlyTotal>()
  const bucket = (k: string): MonthlyTotal => {
    let m = map.get(k)
    if (!m) {
      m = { incomeCents: 0, expenseCents: 0 }
      map.set(k, m)
    }
    return m
  }
  for (const i of incomes) bucket(monthKey(i.date)).incomeCents += i.amountCents
  for (const e of expenses) {
    if (e.paymentDate) bucket(monthKey(e.paymentDate)).expenseCents += e.amountCents
  }
  return map
}
