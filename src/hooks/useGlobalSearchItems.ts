import { useMemo } from 'react'
import {
  CreditCard,
  Repeat,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCategories } from '@/hooks/useCategories'
import { useGoals } from '@/hooks/useGoals'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useIncomes } from '@/hooks/useIncomes'
import { useExpenses } from '@/hooks/useExpenses'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate } from '@/lib/dates'

export type SearchItem = {
  id: string
  type: string
  label: string
  sublabel: string
  path: string
  icon: LucideIcon
}

/** Aggregates every searchable record across the app for the ⌘K palette. */
export function useGlobalSearchItems(): SearchItem[] {
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const { data: categories } = useCategories()
  const { data: goals } = useGoals()
  const { data: subscriptions } = useSubscriptions()
  const { data: incomes } = useIncomes()
  const { data: expenses } = useExpenses()

  return useMemo(() => {
    const items: SearchItem[] = []

    for (const a of accounts ?? [])
      items.push({ id: `acc-${a.id}`, type: 'Conta', label: a.name, sublabel: a.bank ?? 'Conta', path: '/contas', icon: Wallet })
    for (const c of cards ?? [])
      items.push({ id: `card-${c.id}`, type: 'Cartão', label: c.name, sublabel: c.brand ?? 'Cartão', path: '/cartoes', icon: CreditCard })
    for (const c of categories ?? [])
      items.push({ id: `cat-${c.id}`, type: 'Categoria', label: c.name, sublabel: c.kind === 'income' ? 'Receitas' : 'Despesas', path: c.kind === 'income' ? '/receitas' : '/despesas', icon: Tag })
    for (const g of goals ?? [])
      items.push({ id: `goal-${g.id}`, type: 'Meta', label: g.name, sublabel: `Alvo ${formatBRL(g.target_cents)}`, path: '/metas', icon: Target })
    for (const s of subscriptions ?? [])
      items.push({ id: `sub-${s.id}`, type: 'Assinatura', label: s.name, sublabel: formatBRL(s.amount_cents), path: '/assinaturas', icon: Repeat })
    for (const i of incomes ?? [])
      items.push({ id: `inc-${i.id}`, type: 'Receita', label: i.description, sublabel: `${formatBRL(i.amount_cents)} · ${formatDisplayDate(i.date)}`, path: '/receitas', icon: TrendingUp })
    for (const e of expenses ?? [])
      items.push({ id: `exp-${e.id}`, type: 'Despesa', label: e.description, sublabel: `${formatBRL(e.amount_cents)} · ${formatDisplayDate(e.due_date)}`, path: '/despesas', icon: TrendingDown })

    return items
  }, [accounts, cards, categories, goals, subscriptions, incomes, expenses])
}
