import { useMemo } from 'react'
import { useIncomes } from '@/hooks/useIncomes'
import { useExpenses } from '@/hooks/useExpenses'
import { useCategories } from '@/hooks/useCategories'
import { useBalances } from '@/hooks/useBalances'
import { expenseStatus } from '@/lib/finance/status'
import { monthKey, todayISO, toISODate, parseISODate } from '@/lib/dates'

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export type MonthPoint = {
  key: string
  label: string
  receita: number
  despesa: number
  saldo: number
}
export type CategorySlice = { name: string; value: number; color: string }

export function useDashboardStats() {
  const { data: incomes } = useIncomes()
  const { data: expenses } = useExpenses()
  const { data: categories } = useCategories('expense')
  const { saldoAtualCents, saldoPrevistoCents, isLoading } = useBalances()

  return useMemo(() => {
    const today = todayISO()
    const inc = incomes ?? []
    const exp = expenses ?? []
    const curMonth = monthKey(today)

    const catColor = new Map(
      (categories ?? []).map((c) => [c.id, c.color ?? '#94A3B8'] as const),
    )
    const catName = new Map(
      (categories ?? []).map((c) => [c.id, c.name] as const),
    )

    // Month-scoped totals (cash basis: expenses by payment_date).
    const receitaMes = inc
      .filter((i) => monthKey(i.date) === curMonth)
      .reduce((s, i) => s + i.amount_cents, 0)
    // Competência: despesa do mês = pagas neste mês (por data de pagamento) +
    // as que vencem neste mês e ainda não foram pagas (por vencimento).
    const despesaMes = exp
      .filter((e) => monthKey(e.payment_date ?? e.due_date) === curMonth)
      .reduce((s, e) => s + e.amount_cents, 0)

    // Status buckets over all unpaid expenses.
    let vencido = 0
    let aVencer = 0
    let emAberto = 0
    let pago = 0
    for (const e of exp) {
      const st = expenseStatus(e.due_date, e.payment_date, today)
      if (st === 'pago') pago += e.amount_cents
      else if (st === 'vencido') vencido += e.amount_cents
      else if (st === 'a_vencer') aVencer += e.amount_cents
      else emAberto += e.amount_cents
    }

    // Forecast to end of month.
    const now = parseISODate(today)
    const endOfMonth = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    const receitasFuturas = inc
      .filter((i) => i.date > today && i.date <= endOfMonth)
      .reduce((s, i) => s + i.amount_cents, 0)
    const despesasPendentesMes = exp
      .filter((e) => !e.payment_date && e.due_date <= endOfMonth)
      .reduce((s, e) => s + e.amount_cents, 0)
    const saldoPrevistoFimMes =
      saldoAtualCents + receitasFuturas - despesasPendentesMes

    // Last 6 months: receita by date, despesa by payment_date.
    const months: MonthPoint[] = []
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const receita = inc
        .filter((i) => monthKey(i.date) === key)
        .reduce((s, i) => s + i.amount_cents, 0)
      const despesa = exp
        .filter((e) => monthKey(e.payment_date ?? e.due_date) === key)
        .reduce((s, e) => s + e.amount_cents, 0)
      months.push({
        key,
        label: MONTH_LABELS[d.getMonth()],
        receita: receita / 100,
        despesa: despesa / 100,
        saldo: (receita - despesa) / 100,
      })
    }
    // Cumulative saldo line.
    let running = 0
    const saldoSeries = months.map((m) => {
      running += m.receita - m.despesa
      return { label: m.label, saldo: Math.round(running * 100) / 100 }
    })

    // Category breakdown of expenses paid this month.
    const byCat = new Map<string, number>()
    for (const e of exp) {
      if (monthKey(e.payment_date ?? e.due_date) === curMonth) {
        const k = e.category_id ?? 'sem'
        byCat.set(k, (byCat.get(k) ?? 0) + e.amount_cents)
      }
    }
    const categoriesSlices: CategorySlice[] = [...byCat.entries()]
      .map(([id, cents]) => ({
        name: id === 'sem' ? 'Sem categoria' : catName.get(id) ?? '—',
        value: cents / 100,
        color: id === 'sem' ? '#94A3B8' : catColor.get(id) ?? '#94A3B8',
      }))
      .sort((a, b) => b.value - a.value)

    return {
      isLoading,
      saldoAtualCents,
      saldoPrevistoCents,
      receitaMes,
      despesaMes,
      pago,
      vencido,
      aVencer,
      emAberto,
      qtdLancamentos: inc.length + exp.length,
      saldoPrevistoFimMes,
      economiaPrevista: receitaMes - despesaMes,
      months,
      saldoSeries,
      categoriesSlices,
    }
  }, [incomes, expenses, categories, saldoAtualCents, saldoPrevistoCents, isLoading])
}
