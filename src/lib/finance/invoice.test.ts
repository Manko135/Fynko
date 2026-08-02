import { describe, expect, it } from 'vitest'
import { invoiceWindows, nextClosingOnOrAfter, summarizeCard } from './invoice'

describe('nextClosingOnOrAfter', () => {
  it('uses this month when the closing day is still ahead', () => {
    expect(nextClosingOnOrAfter(10, '2026-07-05')).toBe('2026-07-10')
  })
  it('rolls to next month when this month already closed', () => {
    expect(nextClosingOnOrAfter(10, '2026-07-15')).toBe('2026-08-10')
  })
  it('includes the closing day itself (on or after)', () => {
    expect(nextClosingOnOrAfter(10, '2026-07-10')).toBe('2026-07-10')
  })
  it('clamps a day-31 closing in a short month', () => {
    expect(nextClosingOnOrAfter(31, '2026-02-15')).toBe('2026-02-28')
  })
})

describe('invoiceWindows', () => {
  it('brackets the current invoice by prev/next closing', () => {
    expect(invoiceWindows(10, '2026-07-05')).toEqual({
      prevClosing: '2026-06-10',
      nextClosing: '2026-07-10',
      afterNextClosing: '2026-08-10',
    })
  })
})

describe('summarizeCard', () => {
  const today = '2026-07-05' // windows: (06-10, 07-10] current, (07-10, 08-10] next
  const expenses = [
    { amountCents: 20000, dueDate: '2026-07-08', paymentDate: null }, // current
    { amountCents: 15000, dueDate: '2026-07-25', paymentDate: null }, // next
    { amountCents: 30000, dueDate: '2026-09-08', paymentDate: null }, // future parcel
    { amountCents: 5000, dueDate: '2026-06-20', paymentDate: '2026-06-20' }, // paid, excluded
  ]

  it('buckets current and next invoices by due date', () => {
    const s = summarizeCard(500000, 10, expenses, today)
    expect(s.currentInvoiceCents).toBe(20000)
    expect(s.nextInvoiceCents).toBe(15000)
  })

  it('commits ALL unpaid expenses against the limit, not just this invoice', () => {
    const s = summarizeCard(500000, 10, expenses, today)
    expect(s.usedLimitCents).toBe(65000) // 20000 + 15000 + 30000 (paid one excluded)
    expect(s.availableLimitCents).toBe(435000)
  })
})
