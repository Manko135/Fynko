import { describe, expect, it } from 'vitest'
import { projectFinances, type ProjectionInput } from './projection'
import type { Expense, Income, RecurringIncome, Subscription } from '@/types/domain'

const inc = (p: Partial<Income>): Income => ({
  id: 'i', user_id: 'u', description: 'inc', category_id: null, account_id: 'a1',
  amount_cents: 0, date: '2026-08-15', notes: null, recurring_income_id: null,
  created_at: '', updated_at: '', ...p,
})
const exp = (p: Partial<Expense>): Expense => ({
  id: 'e', user_id: 'u', description: 'exp', category_id: null, account_id: 'a1',
  card_id: null, amount_cents: 0, due_date: '2026-08-18', purchase_date: null,
  payment_date: null, type: 'variavel', installment_group: null, installment_index: null,
  installment_count: null, subscription_id: null, notes: null, created_at: '', updated_at: '', ...p,
})
const sub = (p: Partial<Subscription>): Subscription => ({
  id: 's', user_id: 'u', name: 'Netflix', amount_cents: 0, category_id: null,
  account_id: 'a1', card_id: null, frequency: 'mensal', interval_days: null,
  next_due: '2026-08-12', status: 'ativa', color: null, icon: null, notes: null,
  created_at: '', updated_at: '', ...p,
})

const base = (p: Partial<ProjectionInput>): ProjectionInput => ({
  accounts: [{ id: 'a1', initial_balance_cents: 200000 }],
  incomes: [], expenses: [], subscriptions: [], recurringIncomes: [],
  today: '2026-08-10', target: '2026-08-20', ...p,
})

describe('projectFinances', () => {
  it('sums real balance + future flow up to the target date', () => {
    const r = projectFinances(base({
      incomes: [inc({ amount_cents: 450000, date: '2026-08-15' })],
      expenses: [exp({ amount_cents: 200000, due_date: '2026-08-18' })],
      subscriptions: [sub({ amount_cents: 30000, next_due: '2026-08-12' })],
    }))
    expect(r.saldoAtualCents).toBe(200000) // income is future, nothing paid yet
    expect(r.receitasCents).toBe(450000)
    expect(r.despesasCents).toBe(200000)
    expect(r.assinaturasCents).toBe(30000)
    expect(r.saldoPrevistoCents).toBe(420000) // 200000 + 450000 - 200000 - 30000
  })

  it('ignores flows dated after the target', () => {
    const r = projectFinances(base({
      incomes: [inc({ amount_cents: 450000, date: '2026-09-01' })], // after target
      expenses: [exp({ amount_cents: 200000, due_date: '2026-09-05' })], // after target
    }))
    expect(r.receitasCents).toBe(0)
    expect(r.despesasCents).toBe(0)
    expect(r.saldoPrevistoCents).toBe(200000)
  })

  it('projects several monthly subscription charges within the window', () => {
    const r = projectFinances(base({
      target: '2026-10-15',
      subscriptions: [sub({ amount_cents: 10000, next_due: '2026-08-12' })],
    }))
    // 12/ago, 12/set, 12/out → 3 charges of R$100.
    expect(r.assinaturasCents).toBe(30000)
  })

  it('does not double-count a subscription: skips its unpaid materialized charge', () => {
    const r = projectFinances(base({
      subscriptions: [sub({ amount_cents: 30000, next_due: '2026-08-12' })],
      expenses: [exp({ amount_cents: 30000, due_date: '2026-08-12', subscription_id: 's' })],
    }))
    expect(r.assinaturasCents).toBe(30000) // projected once
    expect(r.despesasCents).toBe(0) // the materialized sub charge is skipped
  })

  it('projects recurring incomes not yet materialized', () => {
    const rec: RecurringIncome = {
      id: 'r', user_id: 'u', description: 'Salário', amount_cents: 500000,
      category_id: null, account_id: 'a1', day_of_month: 15, start_date: '2026-01-01',
      end_date: null, active: true, created_at: '', updated_at: '',
    }
    const r = projectFinances(base({ recurringIncomes: [rec] }))
    expect(r.receitasCents).toBe(500000) // 15/ago falls in (10/ago, 20/ago]
  })

  it('separates installments into their own bucket', () => {
    const r = projectFinances(base({
      expenses: [exp({ amount_cents: 50000, due_date: '2026-08-15', installment_group: 'g', type: 'parcelada' })],
    }))
    expect(r.parcelasCents).toBe(50000)
    expect(r.despesasCents).toBe(0)
  })

  it('kind filter narrows the forecast (e.g. only receitas)', () => {
    const r = projectFinances(base({
      incomes: [inc({ amount_cents: 450000, date: '2026-08-15' })],
      expenses: [exp({ amount_cents: 200000, due_date: '2026-08-18' })],
      filter: { kinds: ['receita'] },
    }))
    expect(r.receitasCents).toBe(450000)
    expect(r.despesasCents).toBe(0) // despesas excluded from the forecast
    expect(r.saldoPrevistoCents).toBe(650000)
  })
})
