import { useMemo } from 'react'
import { useIncomes } from '@/hooks/useIncomes'
import { useExpenses } from '@/hooks/useExpenses'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { expenseStatus, type ExpenseStatus } from '@/lib/finance/status'
import { monthKey, todayISO } from '@/lib/dates'
import type { FilterValue } from '@/components/ui/FilterBar'

export type Period = { type: 'mes' | 'ano'; year: number; month: number }

export type ReportRow = {
  kind: 'Receita' | 'Despesa'
  date: string
  description: string
  category: string
  origin: string
  status: string
  amountCents: number
}

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  pago: 'Pago', vencido: 'Vencido', a_vencer: 'A vencer', em_aberto: 'Em aberto',
}
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function periodMatches(dateISO: string, p: Period): boolean {
  if (p.type === 'ano') return dateISO.slice(0, 4) === String(p.year)
  return monthKey(dateISO) === `${p.year}-${String(p.month + 1).padStart(2, '0')}`
}

export function useReportData(period: Period, filters: FilterValue = {}) {
  const { data: incomes } = useIncomes()
  const { data: expenses } = useExpenses()
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()

  return useMemo(() => {
    const today = todayISO()
    const catMap = new Map((categories ?? []).map((c) => [c.id, c]))
    const accMap = new Map((accounts ?? []).map((a) => [a.id, a]))
    const cardMap = new Map((cards ?? []).map((c) => [c.id, c]))

    const fCat = filters.category ?? []
    const fAcc = filters.account ?? []
    const fCard = filters.card ?? []
    const fStatus = filters.status ?? []

    const incomePass = (i: { category_id: string | null; account_id: string | null }) => {
      if (fCard.length || fStatus.length) return false // income has no card / expense-status
      if (fCat.length && !(i.category_id && fCat.includes(i.category_id))) return false
      if (fAcc.length && !(i.account_id && fAcc.includes(i.account_id))) return false
      return true
    }
    const expensePass = (e: {
      category_id: string | null; account_id: string | null; card_id: string | null; due_date: string; payment_date: string | null
    }) => {
      if (fCat.length && !(e.category_id && fCat.includes(e.category_id))) return false
      if (fAcc.length && !(e.account_id && fAcc.includes(e.account_id))) return false
      if (fCard.length && !(e.card_id && fCard.includes(e.card_id))) return false
      if (fStatus.length && !fStatus.includes(expenseStatus(e.due_date, e.payment_date, today))) return false
      return true
    }

    const allInc = (incomes ?? []).filter(incomePass)
    const allExp = (expenses ?? []).filter(expensePass)
    const incRows = allInc.filter((i) => periodMatches(i.date, period))
    // Competência: a despesa pertence ao período do seu PAGAMENTO se paga, ou
    // do seu VENCIMENTO se ainda não paga. Assim contas vencidas e não pagas do
    // mês aparecem no relatório do mês (e uma paga entra no mês do pagamento).
    const expRows = allExp.filter((e) => periodMatches(e.payment_date ?? e.due_date, period))

    const rows: ReportRow[] = []
    for (const i of incRows) {
      rows.push({
        kind: 'Receita', date: i.date, description: i.description,
        category: i.category_id ? catMap.get(i.category_id)?.name ?? '—' : '—',
        origin: i.account_id ? accMap.get(i.account_id)?.name ?? '—' : '—',
        status: 'Recebido', amountCents: i.amount_cents,
      })
    }
    for (const e of expRows) {
      rows.push({
        kind: 'Despesa', date: e.payment_date ?? e.due_date, description: e.description,
        category: e.category_id ? catMap.get(e.category_id)?.name ?? '—' : '—',
        origin: e.card_id ? cardMap.get(e.card_id)?.name ?? '—' : e.account_id ? accMap.get(e.account_id)?.name ?? '—' : '—',
        status: STATUS_LABEL[expenseStatus(e.due_date, e.payment_date, today)],
        amountCents: e.amount_cents,
      })
    }
    rows.sort((a, b) => (a.date < b.date ? 1 : -1))

    const totalReceitas = incRows.reduce((s, i) => s + i.amount_cents, 0)
    const totalDespesas = expRows.reduce((s, e) => s + e.amount_cents, 0)

    // Por categoria
    const byCatMap = new Map<string, { name: string; color: string; receita: number; despesa: number }>()
    const bump = (id: string | null, field: 'receita' | 'despesa', cents: number) => {
      const key = id ?? 'sem'
      const cat = id ? catMap.get(id) : null
      const cur = byCatMap.get(key) ?? { name: cat?.name ?? 'Sem categoria', color: cat?.color ?? '#94A3B8', receita: 0, despesa: 0 }
      cur[field] += cents
      byCatMap.set(key, cur)
    }
    for (const i of incRows) bump(i.category_id, 'receita', i.amount_cents)
    for (const e of expRows) bump(e.category_id, 'despesa', e.amount_cents)
    const byCategory = [...byCatMap.values()].sort((a, b) => b.despesa - a.despesa)

    // Por conta
    const byAccMap = new Map<string, { name: string; entradas: number; saidas: number }>()
    const bumpAcc = (id: string | null, field: 'entradas' | 'saidas', cents: number) => {
      if (!id) return
      const cur = byAccMap.get(id) ?? { name: accMap.get(id)?.name ?? '—', entradas: 0, saidas: 0 }
      cur[field] += cents
      byAccMap.set(id, cur)
    }
    for (const i of incRows) bumpAcc(i.account_id, 'entradas', i.amount_cents)
    for (const e of expRows) if (!e.card_id) bumpAcc(e.account_id, 'saidas', e.amount_cents)
    const byAccount = [...byAccMap.values()]

    // Por cartão
    const byCardMap = new Map<string, { name: string; color: string; total: number }>()
    for (const e of expRows) {
      if (!e.card_id) continue
      const c = cardMap.get(e.card_id)
      const cur = byCardMap.get(e.card_id) ?? { name: c?.name ?? '—', color: c?.color ?? '#94A3B8', total: 0 }
      cur.total += e.amount_cents
      byCardMap.set(e.card_id, cur)
    }
    const byCard = [...byCardMap.values()].sort((a, b) => b.total - a.total)

    // Por status
    const byStatusMap = new Map<string, number>()
    for (const e of expRows) {
      const st = STATUS_LABEL[expenseStatus(e.due_date, e.payment_date, today)]
      byStatusMap.set(st, (byStatusMap.get(st) ?? 0) + e.amount_cents)
    }
    const byStatus = [...byStatusMap.entries()].map(([status, total]) => ({ status, total }))

    // Série mensal do ano selecionado (para evolução / fluxo de caixa)
    const monthly = MONTHS.map((label, m) => {
      const key = `${period.year}-${String(m + 1).padStart(2, '0')}`
      const receita = allInc.filter((i) => monthKey(i.date) === key).reduce((s, i) => s + i.amount_cents, 0)
      const despesa = allExp.filter((e) => monthKey(e.payment_date ?? e.due_date) === key).reduce((s, e) => s + e.amount_cents, 0)
      return { label, receita: receita / 100, despesa: despesa / 100, saldo: (receita - despesa) / 100 }
    })
    let running = 0
    const evolucao = monthly.map((m) => {
      running += m.receita - m.despesa
      return { label: m.label, saldo: Math.round(running * 100) / 100 }
    })

    // Indicadores extras
    const maiorDespesa = expRows.reduce<{ description: string; amountCents: number } | null>(
      (max, e) => (!max || e.amount_cents > max.amountCents ? { description: e.description, amountCents: e.amount_cents } : max), null)
    const maiorReceita = incRows.reduce<{ description: string; amountCents: number } | null>(
      (max, i) => (!max || i.amount_cents > max.amountCents ? { description: i.description, amountCents: i.amount_cents } : max), null)
    const categoriaMaiorGasto = byCategory.find((c) => c.despesa > 0) ?? null
    const economia = incRows.filter((i) => i.date <= today).reduce((s, i) => s + i.amount_cents, 0)
      - expRows.filter((e) => e.payment_date).reduce((s, e) => s + e.amount_cents, 0)
    const previsao = totalReceitas - totalDespesas

    return {
      rows, totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas, count: rows.length,
      byCategory, byAccount, byCard, byStatus,
      monthly, evolucao,
      maiorDespesa, maiorReceita, categoriaMaiorGasto, economia, previsao,
    }
  }, [incomes, expenses, categories, accounts, cards, period, filters])
}
