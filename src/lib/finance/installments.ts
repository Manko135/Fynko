import { addMonthsClamped, type ISODate } from '@/lib/dates'
import type { Cents } from '@/lib/money'

export type Installment = {
  /** 1-based position in the group. */
  index: number
  count: number
  /** e.g. '3/12' for display. */
  label: string
  dueDate: ISODate
  amountCents: Cents
}

/**
 * Split a total into `count` monthly installments starting at `firstDueDate`.
 *
 * Rules (from spec):
 *  - Each installment is floor(total / count) cents; the leftover cents from
 *    the division are added to the LAST installment so the sum is exact.
 *  - Monthly due dates clamp to month length (a day-31 start never overflows
 *    February into March) — see addMonthsClamped.
 */
export function generateInstallments(
  totalCents: Cents,
  count: number,
  firstDueDate: ISODate,
): Installment[] {
  if (count < 1 || !Number.isInteger(count)) {
    throw new Error('O número de parcelas deve ser um inteiro ≥ 1.')
  }
  if (!Number.isInteger(totalCents)) {
    throw new Error('O valor total deve estar em centavos inteiros.')
  }

  const base = Math.trunc(totalCents / count)
  const remainder = totalCents - base * count // always goes to the last one

  const result: Installment[] = []
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1
    result.push({
      index: i + 1,
      count,
      label: `${i + 1}/${count}`,
      dueDate: addMonthsClamped(firstDueDate, i),
      amountCents: base + (isLast ? remainder : 0),
    })
  }
  return result
}
