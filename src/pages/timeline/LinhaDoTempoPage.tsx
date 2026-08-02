import { useMemo } from 'react'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  History,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react'
import { useIncomes } from '@/hooks/useIncomes'
import { useExpenses } from '@/hooks/useExpenses'
import { useTransfers } from '@/hooks/useTransfers'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useGoals, useContributions } from '@/hooks/useGoals'
import { formatBRL } from '@/lib/money'
import { diffDays, formatDisplayDate, todayISO } from '@/lib/dates'
import { expenseStatus } from '@/lib/finance/status'

type Event = {
  id: string
  date: string
  icon: LucideIcon
  iconClass: string
  title: string
  subtitle: string
  amount: string
  amountClass: string
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function groupLabel(date: string, today: string): string {
  const d = diffDays(today, date) // positive = past
  if (d === 0) return 'Hoje'
  if (d === 1) return 'Ontem'
  if (d > 1 && d <= 7) return 'Últimos 7 dias'
  if (d < 0 && d >= -7) return 'Próximos dias'
  if (d < -7) return 'Mais à frente'
  const [y, m] = date.split('-').map(Number)
  return `${MONTHS[m - 1]} de ${y}`
}

export function LinhaDoTempoPage() {
  const { data: incomes } = useIncomes()
  const { data: expenses } = useExpenses()
  const { data: transfers } = useTransfers()
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const { data: goals } = useGoals()
  const { data: contributions } = useContributions()
  const today = todayISO()

  const events = useMemo(() => {
    const accName = new Map((accounts ?? []).map((a) => [a.id, a.name]))
    const cardName = new Map((cards ?? []).map((c) => [c.id, c.name]))
    const goalName = new Map((goals ?? []).map((g) => [g.id, g.name]))
    const list: Event[] = []

    for (const i of incomes ?? []) {
      list.push({
        id: `inc-${i.id}`,
        date: i.date,
        icon: ArrowUpRight,
        iconClass: 'bg-positive/12 text-positive',
        title: i.description,
        subtitle: `Receita${i.account_id ? ` · ${accName.get(i.account_id) ?? ''}` : ''}`,
        amount: formatBRL(i.amount_cents, { sign: true }),
        amountClass: 'text-positive',
      })
    }

    for (const e of expenses ?? []) {
      const date = e.payment_date ?? e.due_date
      const st = expenseStatus(e.due_date, e.payment_date, today)
      const src = e.card_id
        ? cardName.get(e.card_id)
        : e.account_id
          ? accName.get(e.account_id)
          : null
      const stLabel =
        st === 'pago' ? 'Paga' : st === 'vencido' ? 'Vencida' : st === 'a_vencer' ? 'A vencer' : 'Em aberto'
      list.push({
        id: `exp-${e.id}`,
        date,
        icon: ArrowDownRight,
        iconClass: 'bg-danger/12 text-danger',
        title: e.description + (e.installment_count ? ` (${e.installment_index}/${e.installment_count})` : ''),
        subtitle: `${stLabel}${src ? ` · ${src}` : ''}`,
        amount: `− ${formatBRL(e.amount_cents)}`,
        amountClass: 'text-ink/80',
      })
    }

    for (const t of transfers ?? []) {
      list.push({
        id: `tr-${t.id}`,
        date: t.date,
        icon: ArrowLeftRight,
        iconClass: 'bg-brand/12 text-brand',
        title: 'Transferência',
        subtitle: `${accName.get(t.from_account_id ?? '') ?? '—'} → ${accName.get(t.to_account_id ?? '') ?? '—'}`,
        amount: formatBRL(t.amount_cents),
        amountClass: 'text-ink/70',
      })
    }

    for (const c of contributions ?? []) {
      const isAporte = c.amount_cents >= 0
      list.push({
        id: `contrib-${c.id}`,
        date: c.date,
        icon: PiggyBank,
        iconClass: 'bg-gold/15 text-gold',
        title: `${isAporte ? 'Aporte' : 'Retirada'} · ${goalName.get(c.goal_id) ?? 'Meta'}`,
        subtitle: 'Meta',
        amount: formatBRL(c.amount_cents, { sign: true }),
        amountClass: isAporte ? 'text-positive' : 'text-danger',
      })
    }

    // Newest first.
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

    // Group by relative label, preserving order.
    const groups: { label: string; items: Event[] }[] = []
    for (const ev of list) {
      const label = groupLabel(ev.date, today)
      let g = groups.find((x) => x.label === label)
      if (!g) {
        g = { label, items: [] }
        groups.push(g)
      }
      g.items.push(ev)
    }
    return groups
  }, [incomes, expenses, transfers, accounts, cards, goals, contributions, today])

  const isEmpty = events.length === 0

  return (
    <div className="mx-auto max-w-3xl">
      {isEmpty ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand">
            <History className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-xl font-bold">Sua história financeira</h2>
          <p className="text-sm text-muted">
            Conforme você registra receitas, despesas, transferências e aportes,
            tudo aparece aqui em ordem cronológica.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {events.map((group) => (
            <div key={group.label}>
              <div className="sticky top-16 z-10 mb-2 bg-bg/85 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted backdrop-blur">
                {group.label}
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 rounded-xl border border-rule bg-surface px-4 py-3 transition-colors hover:bg-surface-2/50"
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${ev.iconClass}`}>
                      <ev.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{ev.title}</div>
                      <div className="truncate text-xs text-muted">
                        {ev.subtitle} · {formatDisplayDate(ev.date)}
                      </div>
                    </div>
                    <span className={`shrink-0 font-mono text-sm font-medium tnum ${ev.amountClass}`}>
                      {ev.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
