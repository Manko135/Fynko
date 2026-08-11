import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Target,
} from 'lucide-react'
import { useIncomes } from '@/hooks/useIncomes'
import { useExpenses } from '@/hooks/useExpenses'
import { useCategories } from '@/hooks/useCategories'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useGoals } from '@/hooks/useGoals'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { goalIcon } from '@/lib/goalIcons'
import { formatBRL } from '@/lib/money'
import {
  formatDisplayDate,
  monthKey,
  parseISODate,
  todayISO,
  toISODate,
} from '@/lib/dates'
import { expenseStatusOf } from '@/lib/finance/status'
import { cn } from '@/utils/cn'
import type { Expense, Goal, Income, Subscription } from '@/types/domain'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const LEGEND = [
  { color: 'var(--color-danger)', label: 'Conta vencida' },
  { color: 'var(--color-positive)', label: 'Receita' },
  { color: 'var(--color-warning)', label: 'Próxima do vencimento' },
  { color: '#3B82F6', label: 'Assinatura' },
  { color: '#A855F7', label: 'Meta' },
  { color: 'var(--color-faint)', label: 'Sem movimentação' },
]

export function CalendarioPage() {
  const { data: incomes } = useIncomes()
  const { data: expenses } = useExpenses()
  const { data: incomeCats } = useCategories('income')
  const { data: expenseCats } = useCategories('expense')
  const { data: subscriptions } = useSubscriptions()
  const { data: goals } = useGoals()
  const today = todayISO()

  const now = parseISODate(today)
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState<string>(today)

  const catColor = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of [...(incomeCats ?? []), ...(expenseCats ?? [])])
      map.set(c.id, c.color ?? '#94A3B8')
    return map
  }, [incomeCats, expenseCats])

  // Index events by day.
  const { incByDay, expByDay } = useMemo(() => {
    const inc = new Map<string, Income[]>()
    const exp = new Map<string, Expense[]>()
    for (const i of incomes ?? []) {
      const arr = inc.get(i.date) ?? []
      arr.push(i)
      inc.set(i.date, arr)
    }
    for (const e of expenses ?? []) {
      const arr = exp.get(e.due_date) ?? []
      arr.push(e)
      exp.set(e.due_date, arr)
    }
    return { incByDay: inc, expByDay: exp }
  }, [incomes, expenses])

  const { subByDay, goalByDay } = useMemo(() => {
    const sub = new Map<string, Subscription[]>()
    const goal = new Map<string, Goal[]>()
    for (const s of subscriptions ?? []) {
      if (s.status !== 'ativa') continue
      const arr = sub.get(s.next_due) ?? []
      arr.push(s)
      sub.set(s.next_due, arr)
    }
    for (const g of goals ?? []) {
      if (!g.due_date) continue
      const arr = goal.get(g.due_date) ?? []
      arr.push(g)
      goal.set(g.due_date, arr)
    }
    return { subByDay: sub, goalByDay: goal }
  }, [subscriptions, goals])

  const monthStr = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`

  // Month totals (previsto): incomes by date, expenses by due date.
  const monthTotals = useMemo(() => {
    const receita = (incomes ?? [])
      .filter((i) => monthKey(i.date) === monthStr)
      .reduce((s, i) => s + i.amount_cents, 0)
    const despesa = (expenses ?? [])
      .filter((e) => monthKey(e.due_date) === monthStr)
      .reduce((s, e) => s + e.amount_cents, 0)
    return { receita, despesa }
  }, [incomes, expenses, monthStr])

  // Build the day grid (Sunday-first).
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    const lead = first.getDay()
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const arr: (string | null)[] = []
    for (let i = 0; i < lead; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++)
      arr.push(toISODate(new Date(cursor.y, cursor.m, d)))
    return arr
  }, [cursor])

  function move(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const selInc = incByDay.get(selected) ?? []
  const selExp = expByDay.get(selected) ?? []
  const selSub = subByDay.get(selected) ?? []
  const selGoal = goalByDay.get(selected) ?? []
  const dayReceived = selInc.reduce((s, i) => s + i.amount_cents, 0)
  const dayExpense = selExp.reduce((s, e) => s + e.amount_cents, 0)
  const dayEmpty = selInc.length === 0 && selExp.length === 0 && selSub.length === 0 && selGoal.length === 0

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.9fr_1fr]">
      {/* Calendar */}
      <div className="rounded-2xl border border-rule bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-lg font-bold capitalize">
              {MONTHS[cursor.m]} {cursor.y}
            </div>
            <div className="mt-0.5 flex gap-3 font-mono text-[11px]">
              <span className="text-positive">
                ▲ {formatBRL(monthTotals.receita)}
              </span>
              <span className="text-danger">
                ▼ {formatBRL(monthTotals.despesa)}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => move(-1)}
              className="grid size-8 place-items-center rounded-lg border border-rule hover:bg-surface-2"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => move(1)}
              className="grid size-8 place-items-center rounded-lg border border-rule hover:bg-surface-2"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-faint"
            >
              {w}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (!day) return <div key={`b${idx}`} />
            const inc = incByDay.get(day) ?? []
            const exp = expByDay.get(day) ?? []
            const hasSub = (subByDay.get(day)?.length ?? 0) > 0
            const hasGoal = (goalByDay.get(day)?.length ?? 0) > 0
            const hasOverdue = exp.some(
              (e) => expenseStatusOf(e, today) === 'vencido',
            )
            const hasDue = exp.length > 0
            const isToday = day === today
            const isSel = day === selected
            const dayNum = parseISODate(day).getDate()
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition',
                  isSel && 'bg-brand/15 font-bold text-brand ring-1 ring-brand/40',
                  !isSel && isToday && 'font-bold text-brand ring-1 ring-brand/40',
                  !isSel && !isToday && 'hover:bg-surface-2',
                )}
              >
                {isToday && (
                  <span className="absolute right-1 top-1 size-1 rounded-full bg-brand" aria-hidden />
                )}
                <span>{dayNum}</span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {inc.length > 0 && <span className="size-1.5 rounded-full bg-positive" />}
                  {hasDue && (
                    <span className={cn('size-1.5 rounded-full', hasOverdue ? 'bg-danger' : 'bg-warning')} />
                  )}
                  {hasSub && <span className="size-1.5 rounded-full" style={{ background: '#3B82F6' }} />}
                  {hasGoal && <span className="size-1.5 rounded-full" style={{ background: '#A855F7' }} />}
                </span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-rule pt-3">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="size-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Day detail */}
      <div className="rounded-2xl border border-rule bg-surface p-5">
        <div className="font-display text-base font-bold capitalize">
          {formatDisplayDate(selected)}
        </div>
        <div className="mt-1 flex gap-4 text-sm">
          <span className="text-positive tnum">
            {selInc.length} receita{selInc.length !== 1 ? 's' : ''} · {formatBRL(dayReceived)}
          </span>
          <span className="text-danger tnum">
            {selExp.length} despesa{selExp.length !== 1 ? 's' : ''} · {formatBRL(dayExpense)}
          </span>
        </div>
        <div className="mt-1 text-sm text-muted">
          Saldo do dia:{' '}
          <span className="font-mono tnum text-ink/85">
            {formatBRL(dayReceived - dayExpense, { sign: true })}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {dayEmpty && (
            <p className="py-8 text-center text-sm text-faint">
              Nada previsto para este dia.
            </p>
          )}
          {selInc.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-positive/12 text-positive">
                <ArrowUpRight className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{i.description}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  {i.category_id && (
                    <span className="size-1.5 rounded-full" style={{ background: catColor.get(i.category_id) }} />
                  )}
                  Receita
                </div>
              </div>
              <span className="font-mono text-sm tnum text-positive">
                {formatBRL(i.amount_cents, { sign: true })}
              </span>
            </div>
          ))}
          {selExp.map((e) => {
            const status = expenseStatusOf(e, today)
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-danger/12 text-danger">
                  <ArrowDownRight className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{e.description}</span>
                    {e.installment_count && (
                      <span className="shrink-0 rounded bg-ink/8 px-1 font-mono text-[10px] text-muted">
                        {e.installment_index}/{e.installment_count}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5">
                    <StatusBadge status={status} />
                  </div>
                </div>
                <span className="font-mono text-sm tnum text-ink/80">
                  {formatBRL(e.amount_cents)}
                </span>
              </div>
            )
          })}
          {selSub.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
              <span className="grid size-8 place-items-center rounded-lg" style={{ background: '#3B82F620', color: '#3B82F6' }}>
                <Repeat className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted">Assinatura</div>
              </div>
              <span className="font-mono text-sm tnum text-ink/80">{formatBRL(s.amount_cents)}</span>
            </div>
          ))}
          {selGoal.map((g) => {
            const Icon = goalIcon(g.icon)
            return (
              <div key={g.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="grid size-8 place-items-center rounded-lg" style={{ background: '#A855F720', color: '#A855F7' }}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{g.name}</div>
                  <div className="text-xs text-muted">Meta · data prevista</div>
                </div>
                <Target className="size-4 text-muted" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
