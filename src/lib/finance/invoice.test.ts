import { describe, expect, it } from 'vitest'
import {
  currentInvoiceDue,
  currentInvoiceExpenses,
  invoiceDueForPurchase,
  nextClosingOnOrAfter,
  summarizeCard,
} from './invoice'

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

describe('currentInvoiceDue', () => {
  it('a card closing on the 26th, due on the 10th, before closing → next month', () => {
    // Seen 09/ago: open invoice closes 26/ago, due 10/set.
    expect(currentInvoiceDue(26, 10, '2026-08-09')).toBe('2026-09-10')
  })
  it('after the closing has passed rolls one cycle further', () => {
    // Seen 27/ago: closing 26/ago passed → next closing 26/set, due 10/out.
    expect(currentInvoiceDue(26, 10, '2026-08-27')).toBe('2026-10-10')
  })
  it('due day after the closing day resolves in the same cycle', () => {
    // Closes on the 5th, due on the 20th; seen 09/ago (after 05/ago close) →
    // next closing 05/set, due 20/set.
    expect(currentInvoiceDue(5, 20, '2026-08-09')).toBe('2026-09-20')
  })
})

describe('invoiceDueForPurchase', () => {
  it('a buy before the closing goes on that invoice (spec example)', () => {
    // Compra 05/08, fecha dia 10, vence dia 20 → vencimento 20/08.
    expect(invoiceDueForPurchase('2026-08-05', 10, 20)).toBe('2026-08-20')
  })
  it('a buy after the closing rolls to the next invoice', () => {
    // Compra 15/08 (após fechar 10/08) → fecha 10/09, vence 20/09.
    expect(invoiceDueForPurchase('2026-08-15', 10, 20)).toBe('2026-09-20')
  })
  it('handles a due day before the closing day (vencimento no mês seguinte)', () => {
    // Fecha dia 26, vence dia 10; compra 05/08 → vence 10/09.
    expect(invoiceDueForPurchase('2026-08-05', 26, 10)).toBe('2026-09-10')
  })
})

describe('summarizeCard', () => {
  it('shows a normal purchase on the current invoice right away (Sicredi bug)', () => {
    // closing 26, due 10, seen 09/ago → current invoice due 10/set.
    const expenses = [
      { amountCents: 1300, dueDate: '2026-09-10', paymentDate: null },
      { amountCents: 13836, dueDate: '2026-09-10', paymentDate: null },
    ]
    const s = summarizeCard(20000, 26, 10, expenses, '2026-08-09')
    expect(s.currentInvoiceCents).toBe(15136)
    expect(s.usedLimitCents).toBe(15136)
    expect(s.availableLimitCents).toBe(4864)
  })

  it('buckets current, next and later cycles by due date', () => {
    const today = '2026-08-09' // current due 10/set, next due 10/out
    const expenses = [
      { amountCents: 20000, dueDate: '2026-09-10', paymentDate: null }, // current
      { amountCents: 15000, dueDate: '2026-10-10', paymentDate: null }, // next
      { amountCents: 30000, dueDate: '2026-12-10', paymentDate: null }, // later parcel
      { amountCents: 5000, dueDate: '2026-06-20', paymentDate: '2026-06-20' }, // paid
    ]
    const s = summarizeCard(500000, 26, 10, expenses, today)
    expect(s.currentInvoiceCents).toBe(20000)
    expect(s.nextInvoiceCents).toBe(15000)
    expect(s.usedLimitCents).toBe(65000) // all unpaid; paid one excluded
    expect(s.availableLimitCents).toBe(435000)
  })

  it('counts an overdue unpaid charge as still owed on the current invoice', () => {
    const expenses = [
      { amountCents: 8000, dueDate: '2026-07-10', paymentDate: null }, // overdue
      { amountCents: 2000, dueDate: '2026-09-10', paymentDate: null }, // current
    ]
    const s = summarizeCard(500000, 26, 10, expenses, '2026-08-09')
    expect(s.currentInvoiceCents).toBe(10000)
  })

  it('keeps a FUTURE subscription charge off the card until its date', () => {
    const expenses = [
      { amountCents: 10000, dueDate: '2026-08-25', paymentDate: null, subscriptionId: 'sub1' },
      { amountCents: 2000, dueDate: '2026-09-10', paymentDate: null },
    ]
    const s = summarizeCard(500000, 26, 10, expenses, '2026-08-09')
    expect(s.usedLimitCents).toBe(2000) // subscription excluded
    expect(s.currentInvoiceCents).toBe(2000)
  })
})

describe('currentInvoiceExpenses', () => {
  it('returns the rows owed on the current invoice, with their ids', () => {
    const rows = [
      { id: 'a', dueDate: '2026-09-10', paymentDate: null },
      { id: 'b', dueDate: '2026-09-10', paymentDate: null },
      { id: 'c', dueDate: '2026-10-10', paymentDate: null }, // next invoice
    ]
    const items = currentInvoiceExpenses(26, 10, rows, '2026-08-09')
    expect(items.map((i) => i.id)).toEqual(['a', 'b'])
  })
})
