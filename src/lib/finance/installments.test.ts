import { describe, expect, it } from 'vitest'
import { generateInstallments } from './installments'

describe('generateInstallments', () => {
  it('splits an evenly divisible total into equal monthly parcels', () => {
    const parcels = generateInstallments(120000, 12, '2026-01-15')
    expect(parcels).toHaveLength(12)
    expect(parcels.every((p) => p.amountCents === 10000)).toBe(true)
    expect(parcels[0]).toMatchObject({ index: 1, label: '1/12', dueDate: '2026-01-15' })
    expect(parcels[11].dueDate).toBe('2026-12-15')
  })

  it('absorbs the division remainder into the LAST parcel (sum is exact)', () => {
    const parcels = generateInstallments(10000, 3, '2026-01-10')
    expect(parcels.map((p) => p.amountCents)).toEqual([3333, 3333, 3334])
    const sum = parcels.reduce((s, p) => s + p.amountCents, 0)
    expect(sum).toBe(10000)
  })

  it('clamps a day-31 start so February never overflows into March', () => {
    const parcels = generateInstallments(300000, 3, '2026-01-31')
    expect(parcels.map((p) => p.dueDate)).toEqual([
      '2026-01-31',
      '2026-02-28', // 2026 is not a leap year
      '2026-03-31',
    ])
  })

  it('handles February 29 in a leap year', () => {
    const parcels = generateInstallments(200000, 2, '2024-01-31')
    expect(parcels[1].dueDate).toBe('2024-02-29')
  })

  it('supports a single installment (full amount)', () => {
    const parcels = generateInstallments(4999, 1, '2026-05-01')
    expect(parcels).toEqual([
      { index: 1, count: 1, label: '1/1', dueDate: '2026-05-01', amountCents: 4999 },
    ])
  })

  it('rejects invalid parcel counts', () => {
    expect(() => generateInstallments(1000, 0, '2026-01-01')).toThrow()
    expect(() => generateInstallments(1000, 1.5, '2026-01-01')).toThrow()
  })
})
