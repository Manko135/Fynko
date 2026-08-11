import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Hash,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useDashboardPrefs } from '@/hooks/useDashboardPrefs'
import { formatBRL } from '@/lib/money'

function reais(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-rule bg-surface px-3 py-2 text-xs shadow-lg">
      {label && <div className="mb-1 font-semibold text-ink/80">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-ink/70">
          <span className="size-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          {p.name}: <span className="font-mono tnum">{reais(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Tile({
  label,
  value,
  icon: Icon,
  tone = 'text-ink',
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: string
}) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <div className={`mt-1.5 text-xl font-semibold tnum ${tone}`}>{value}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-5">
      <h3 className="mb-4 font-display text-sm font-bold tracking-tight text-ink/80">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function DashboardPage() {
  const s = useDashboardStats()
  const { prefs } = useDashboardPrefs()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      {/* Forecast hero */}
      {prefs.forecast && (
      <div
        className="relative overflow-hidden rounded-2xl border border-ink/10 p-6"
        style={{
          background:
            'linear-gradient(150deg, color-mix(in oklab, var(--color-gold) 14%, var(--color-surface)) 0%, var(--color-surface) 60%)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full opacity-25 blur-3xl"
          style={{ background: 'var(--color-gold)' }}
          aria-hidden
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              <Sparkles className="size-3.5 text-gold" />
              Previsão para o fim do mês
            </div>
            <div className="mt-1 font-display text-4xl font-bold tnum">
              {formatBRL(s.saldoPrevistoFimMes)}
            </div>
            <div className="mt-1 text-sm text-muted">
              Economia prevista:{' '}
              <span className={s.economiaPrevista >= 0 ? 'text-positive' : 'text-danger'}>
                {formatBRL(s.economiaPrevista, { sign: true })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
              Saldo atual
            </div>
            <div className="font-display text-2xl font-bold tnum">
              {formatBRL(s.saldoAtualCents)}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Indicators */}
      {prefs.indicators && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Tile label="Receita do mês" value={formatBRL(s.receitaMes)} icon={TrendingUp} tone="text-positive" />
        <Tile label="Despesa do mês" value={formatBRL(s.despesaMes)} icon={TrendingDown} tone="text-danger" />
        <Tile label="Saldo previsto" value={formatBRL(s.saldoPrevistoCents)} icon={Wallet} />
        <Tile label="Total pago" value={formatBRL(s.pago)} icon={CheckCircle2} tone="text-positive" />
        <Tile label="A vencer" value={formatBRL(s.aVencer)} icon={CalendarClock} tone="text-warning" />
        <Tile label="Vencido" value={formatBRL(s.vencido)} icon={AlertTriangle} tone="text-danger" />
        <Tile label="Em aberto" value={formatBRL(s.emAberto)} icon={Clock} />
        <Tile label="Cartão" value={formatBRL(s.cartao)} icon={CreditCard} tone="text-brand" />
        <Tile label="Lançamentos" value={String(s.qtdLancamentos)} icon={Hash} />
      </div>
      )}

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        {prefs.chartRevDesp && (
        <Panel title="Receitas x Despesas (6 meses)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={s.months} barGap={4}>
              <XAxis dataKey="label" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={<ChartTooltip />} />
              <Bar name="Receita" dataKey="receita" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
              <Bar name="Despesa" dataKey="despesa" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        )}

        {prefs.chartSaldo && (
        <Panel title="Evolução do saldo">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={s.saldoSeries}>
              <defs>
                <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ChartTooltip />} />
              <Area name="Saldo" dataKey="saldo" stroke="var(--color-brand)" strokeWidth={2} fill="url(#saldoFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        )}

        {prefs.chartCategoria && (
        <Panel title="Gastos por categoria (mês)">
          {s.categoriesSlices.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              Sem despesas pagas neste mês ainda.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={s.categoriesSlices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {s.categoriesSlices.map((c) => (
                    <Cell key={c.name} fill={c.color} stroke="var(--color-surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
        )}

        {prefs.chartSaldoMes && (
        <Panel title="Saldo por mês">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={s.months}>
              <XAxis dataKey="label" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={<ChartTooltip />} />
              <Bar name="Saldo" dataKey="saldo" radius={[4, 4, 0, 0]}>
                {s.months.map((m) => (
                  <Cell key={m.key} fill={m.saldo >= 0 ? 'var(--color-positive)' : 'var(--color-danger)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        )}
      </div>
    </div>
  )
}
