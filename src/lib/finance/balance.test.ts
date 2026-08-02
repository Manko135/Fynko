import { describe, expect, it } from 'vitest'
import {
  accountBalance,
  computeBalances,
  monthlyTotals,
} from './balance'

const today = '2026-07-23'
const accounts = [{ id: 'acc1', initialBalanceCents: 100000 }]

describe('computeBalances — cash rule', () => {
  it('counts a past-month payment in saldoAtual (money already left)', () => {
    // A March parcel marked paid in March: still <= today, so it reduced balance.
    const expenses = [
      { amountCents: 40000, dueDate: '2026-03-10', paymentDate: '2026-03-10', accountId: 'acc1' },
    ]
    const incomes = [{ amountCents: 50000, date: '2026-03-01', accountId: 'acc1' }]
    const { saldoAtualCents } = computeBalances(incomes, expenses, accounts, today)
    expect(saldoAtualCents).toBe(100000 + 50000 - 40000)
  })

  it('does NOT let a future-dated payment reduce today’s balance', () => {
    const expenses = [
      { amountCents: 40000, dueDate: '2026-08-10', paymentDate: '2026-08-10', accountId: 'acc1' },
    ]
    const { saldoAtualCents, saldoPrevistoCents } = computeBalances(
      [],
      expenses,
      accounts,
      today,
    )
    expect(saldoAtualCents).toBe(100000) // untouched today
    // Not "pending" (it has a payment date) — previsto also unaffected here.
    expect(saldoPrevistoCents).toBe(100000)
  })

  it('subtracts still-unpaid expenses and adds future income in saldoPrevisto', () => {
    const incomes = [
      { amountCents: 30000, date: '2026-07-01', accountId: 'acc1' }, // received
      { amountCents: 20000, date: '2026-07-30', accountId: 'acc1' }, // future
    ]
    const expenses = [
      { amountCents: 10000, dueDate: '2026-07-28', paymentDate: null, accountId: 'acc1' },
    ]
    const { saldoAtualCents, saldoPrevistoCents } = computeBalances(
      incomes,
      expenses,
      accounts,
      today,
    )
    expect(saldoAtualCents).toBe(100000 + 30000) // 130000
    expect(saldoPrevistoCents).toBe(130000 + 20000 - 10000) // 140000
  })
})

describe('monthlyTotals — attribution by payment date', () => {
  it('buckets a paid expense by its payment date, not by today', () => {
    const expenses = [
      { amountCents: 40000, dueDate: '2026-03-10', paymentDate: '2026-03-15', accountId: 'acc1' },
    ]
    const incomes = [{ amountCents: 50000, date: '2026-03-01', accountId: 'acc1' }]
    const totals = monthlyTotals(incomes, expenses)
    expect(totals.get('2026-03')).toEqual({ incomeCents: 50000, expenseCents: 40000 })
    expect(totals.has('2026-07')).toBe(false) // NOT attributed to "today"
  })

  it('excludes unpaid expenses from monthly cash totals', () => {
    const expenses = [
      { amountCents: 40000, dueDate: '2026-08-10', paymentDate: null, accountId: 'acc1' },
    ]
    expect(monthlyTotals([], expenses).size).toBe(0)
  })
})

describe('accountBalance', () => {
  it('tracks a single account’s in/out up to today', () => {
    const incomes = [
      { amountCents: 50000, date: '2026-07-01', accountId: 'acc1' },
      { amountCents: 99999, date: '2026-07-01', accountId: 'other' },
    ]
    const expenses = [
      { amountCents: 20000, dueDate: '2026-07-05', paymentDate: '2026-07-05', accountId: 'acc1' },
    ]
    expect(accountBalance(accounts[0], incomes, expenses, today)).toBe(
      100000 + 50000 - 20000,
    )
  })
})
