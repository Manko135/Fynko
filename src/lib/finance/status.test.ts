import { describe, expect, it } from 'vitest'
import { expenseStatus, urgencyBucket } from './status'

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
