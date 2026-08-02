import { describe, expect, it } from 'vitest'
import { addMonthsClamped, diffDays, monthKey } from './dates'

describe('addMonthsClamped', () => {
  it('keeps the same day when the target month is long enough', () => {
    expect(addMonthsClamped('2026-01-15', 1)).toBe('2026-02-15')
  })
  it('clamps Jan 31 + 1 month to Feb 28 (non-leap)', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('clamps to Feb 29 in a leap year', () => {
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29')
  })
  it('rolls across a year boundary', () => {
    expect(addMonthsClamped('2026-12-10', 1)).toBe('2027-01-10')
  })
  it('supports negative offsets', () => {
    expect(addMonthsClamped('2026-03-31', -1)).toBe('2026-02-28')
  })
})

describe('diffDays', () => {
  it('is positive when the first date is later', () => {
    expect(diffDays('2026-07-25', '2026-07-23')).toBe(2)
    expect(diffDays('2026-07-23', '2026-07-25')).toBe(-2)
  })
})

describe('monthKey', () => {
  it('extracts YYYY-MM', () => {
    expect(monthKey('2026-03-15')).toBe('2026-03')
  })
})
