import { useMemo } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useIncomes } from '@/hooks/useIncomes'
import { useExpenses } from '@/hooks/useExpenses'
import { useTransfers } from '@/hooks/useTransfers'
import {
  accountBalance,
  computeBalances,
  type ExpenseRow,
  type IncomeRow,
} from '@/lib/finance/balance'
import { monthKey, todayISO } from '@/lib/dates'
import type { Account, Expense, Income } from '@/types/domain'

function toIncomeRows(incomes: Income[]): IncomeRow[] {
  return incomes.map((i) => ({
    amountCents: i.amount_cents,
    date: i.date,
    accountId: i.account_id,
  }))
}

function toExpenseRows(expenses: Expense[]): ExpenseRow[] {
  return expenses.map((e) => ({
    amountCents: e.amount_cents,
    dueDate: e.due_date,
    paymentDate: e.payment_date,
    // A card purchase sits on the invoice and does not debit any bank account
    // until the invoice is paid — at which point it carries both a payment_date
    // and the paying account_id, and debits that account on the payment date.
    accountId: e.card_id && !e.payment_date ? null : e.account_id,
  }))
}

/**
 * Single source of truth for balances across the app. Derives everything from
 * the raw accounts/incomes/expenses queries via the tested finance engine, so
 * any change (e.g. editing a payment date) recomputes automatically.
 */
export function useBalances() {
  const accountsQ = useAccounts()
  const incomesQ = useIncomes()
  const expensesQ = useExpenses()
  const transfersQ = useTransfers()

  const accounts = accountsQ.data
  const incomes = incomesQ.data
  const expenses = expensesQ.data
  const transfers = transfersQ.data

  return useMemo(() => {
    const today = todayISO()
    const accs: Account[] = accounts ?? []
    const incRows = toIncomeRows(incomes ?? [])
    const expRows = toExpenseRows(expenses ?? [])
    const seeds = accs.map((a) => ({
      id: a.id,
      initialBalanceCents: a.initial_balance_cents,
    }))

    const { saldoAtualCents, saldoPrevistoCents } = computeBalances(
      incRows,
      expRows,
      seeds,
      today,
    )

    // Monthly balance — only what's already REALIZED this month:
    //  income: received so far (a salary scheduled for later doesn't count yet);
    //  expenses: paid this month, plus bills of this month that have ALREADY
    //  come due (unpaid but past/at their due date). A bill that only falls due
    //  later this month isn't counted until its due date arrives.
    const curMonth = monthKey(today)
    let receitaMes = 0
    let despesaMes = 0
    for (const i of incomes ?? []) {
      if (monthKey(i.date) === curMonth && i.date <= today) receitaMes += i.amount_cents
    }
    for (const e of expenses ?? []) {
      if (e.payment_date) {
        if (monthKey(e.payment_date) === curMonth) despesaMes += e.amount_cents
      } else if (monthKey(e.due_date) === curMonth && e.due_date <= today) {
        despesaMes += e.amount_cents
      }
    }
    const saldoMesCents = receitaMes - despesaMes

    const byAccount = new Map<string, number>()
    for (const a of accs) {
      byAccount.set(
        a.id,
        accountBalance(
          { id: a.id, initialBalanceCents: a.initial_balance_cents },
          incRows,
          expRows,
          today,
        ),
      )
    }

    // Transfers move money between the user's own accounts: they change each
    // account's balance but NOT the global total (internal reallocation).
    for (const t of transfers ?? []) {
      if (t.date > today) continue
      if (t.from_account_id && byAccount.has(t.from_account_id)) {
        byAccount.set(
          t.from_account_id,
          (byAccount.get(t.from_account_id) ?? 0) - t.amount_cents,
        )
      }
      if (t.to_account_id && byAccount.has(t.to_account_id)) {
        byAccount.set(
          t.to_account_id,
          (byAccount.get(t.to_account_id) ?? 0) + t.amount_cents,
        )
      }
    }

    return {
      saldoAtualCents,
      saldoPrevistoCents,
      saldoMesCents,
      byAccount,
      isLoading:
        accountsQ.isLoading ||
        incomesQ.isLoading ||
        expensesQ.isLoading ||
        transfersQ.isLoading,
    }
  }, [
    accounts,
    incomes,
    expenses,
    transfers,
    accountsQ.isLoading,
    incomesQ.isLoading,
    expensesQ.isLoading,
    transfersQ.isLoading,
  ])
}
