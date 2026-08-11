import { describe, expect, it } from 'vitest'
import { expenseStatus, expenseStatusOf, urgencyBucket } from './status'

const today = '2026-07-23'

describe('expenseStatus', () => {
  it('is pago when there is a payment date', () => {
    expect(expenseStatus('2026-07-01', '2026-07-02', today)).toBe('pago')
  })
  it('is vencido when unpaid and past due', () => {
    expect(expenseStatus('2026-07-20', null, today)).toBe('vencido')
  })
  it('is a_vencer when unpaid and due within 7 days (inclusive of today)', () => {
    expect(expenseStatus('2026-07-23', null, today)).toBe('a_vencer')
    expect(expenseStatus('2026-07-30', null, today)).toBe('a_vencer')
  })
  it('is em_aberto when unpaid and comfortably ahead', () => {
    expect(expenseStatus('2026-08-15', null, today)).toBe('em_aberto')
  })
})

describe('expenseStatusOf', () => {
  it('is cartao for an unpaid card purchase, whatever the due date', () => {
    // Would be "vencido" by date, but it's on a card → cartao.
    expect(expenseStatusOf({ due_date: '2026-07-20', payment_date: null, card_id: 'c1' }, today)).toBe('cartao')
    expect(expenseStatusOf({ due_date: '2026-08-15', payment_date: null, card_id: 'c1' }, today)).toBe('cartao')
  })
  it('a PAID card expense falls back to pago (invoice settled)', () => {
    expect(expenseStatusOf({ due_date: '2026-07-20', payment_date: '2026-07-21', card_id: 'c1' }, today)).toBe('pago')
  })
  it('a non-card expense keeps the plain date-based status', () => {
    expect(expenseStatusOf({ due_date: '2026-07-20', payment_date: null, card_id: null }, today)).toBe('vencido')
    expect(expenseStatusOf({ due_date: '2026-08-15', payment_date: null, card_id: null }, today)).toBe('em_aberto')
  })
})

describe('urgencyBucket', () => {
  it('puts each expense in exactly one bucket', () => {
    expect(urgencyBucket('2026-07-20', null, today)).toBe('vencida')
    expect(urgencyBucket('2026-07-23', null, today)).toBe('vence_hoje')
    expect(urgencyBucket('2026-07-25', null, today)).toBe('vence_3_dias')
    expect(urgencyBucket('2026-07-29', null, today)).toBe('vence_7_dias')
    expect(urgencyBucket('2026-08-10', null, today)).toBe(null)
  })
  it('is null when paid', () => {
    expect(urgencyBucket('2026-07-20', '2026-07-19', today)).toBe(null)
  })
})
