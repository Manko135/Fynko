import { describe, expect, it } from 'vitest'
import { validateRows } from './import'

describe('validateRows', () => {
  it('accepts valid rows and parses BR/ISO dates and comma/dot decimals', () => {
    const { valid, errors } = validateRows([
      { tipo: 'receita', descricao: 'Salário', categoria: 'Salário', valor: '5.000,00', data: '2026-08-05', conta: 'Nubank', pago: '' },
      { tipo: 'despesa', descricao: 'Mercado', categoria: 'Mercado', valor: '350.90', data: '10/08/2026', conta: 'Nubank', pago: 'sim' },
    ])
    expect(errors).toHaveLength(0)
    expect(valid).toHaveLength(2)
    expect(valid[0]).toMatchObject({ kind: 'income', amountCents: 500000, date: '2026-08-05' })
    expect(valid[1]).toMatchObject({ kind: 'expense', amountCents: 35090, date: '2026-08-10', paid: true })
  })

  it('reports line-numbered errors for bad rows (header is line 1)', () => {
    const { valid, errors } = validateRows([
      { tipo: 'xyz', descricao: 'a', valor: '1', data: '2026-01-01' },      // line 2: bad tipo
      { tipo: 'despesa', descricao: '', valor: '1', data: '2026-01-01' },   // line 3: empty desc
      { tipo: 'receita', descricao: 'ok', valor: 'abc', data: '2026-01-01' }, // line 4: bad value
      { tipo: 'receita', descricao: 'ok', valor: '10', data: '32/13/2026' }, // line 5: bad date
    ])
    expect(valid).toHaveLength(0)
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5])
  })

  it('is accent/case-insensitive on tipo and pago', () => {
    const { valid } = validateRows([
      { tipo: 'DESPESA', descricao: 'x', valor: '10', data: '2026-01-01', pago: 'PAGO' },
    ])
    expect(valid[0]).toMatchObject({ kind: 'expense', paid: true })
  })
})
