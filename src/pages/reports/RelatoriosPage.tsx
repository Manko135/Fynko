import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Upload,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { FilterBar, type FilterValue } from '@/components/ui/FilterBar'
import { ImportModal } from './ImportModal'
import { useToast } from '@/contexts/ToastContext'
import { useReportData, type Period } from '@/hooks/useReportData'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/contexts/AuthContext'
import { exportCSV, exportExcel, exportPDF } from '@/services/export'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate } from '@/lib/dates'
import { cn } from '@/utils/cn'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
type Tab = 'geral' | 'categoria' | 'conta' | 'cartao' | 'status'
const TABS: { key: Tab; label: string }[] = [
  { key: 'geral', label: 'Visão geral' },
  { key: 'categoria', label: 'Por categoria' },
  { key: 'conta', label: 'Por conta' },
  { key: 'cartao', label: 'Por cartão' },
  { key: 'status', label: 'Por status' },
]

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
          <span className="size-2 rounded-full" style={{ background: p.color ?? p.fill ?? p.stroke }} />
          {p.name}: <span className="font-mono tnum">{reais(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Tile({ label, value, sub, tone = 'text-ink' }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={`mt-1 truncate text-lg font-semibold tnum ${tone}`}>{value}</div>
      {sub && <div className="truncate text-[11px] text-muted">{sub}</div>}
    </div>
  )
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-5">
      <h3 className="mb-4 font-display text-sm font-bold tracking-tight text-ink/80">{title}</h3>
      {children}
    </div>
  )
}
const AXIS = { fill: 'var(--chart-axis)', fontSize: 11 }
const STATUS_COLOR: Record<string, string> = {
  Pago: 'var(--color-positive)',
  Vencido: 'var(--color-danger)',
  'A vencer': 'var(--color-warning)',
  'Em aberto': '#94A3B8',
}

export function RelatoriosPage() {
  const { toast } = useToast()
  const now = new Date()
  const [period, setPeriod] = useState<Period>({ type: 'mes', year: now.getFullYear(), month: now.getMonth() })
  const [filters, setFilters] = useState<FilterValue>({})
  const [tab, setTab] = useState<Tab>('geral')
  const [importOpen, setImportOpen] = useState(false)
  const data = useReportData(period, filters)

  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const { data: profile } = useProfile()
  const { user } = useAuth()

  const filterGroups = useMemo(() => [
    { key: 'category', label: 'Categoria', options: (categories ?? []).map((c) => ({ value: c.id, label: c.name, color: c.color ?? undefined })) },
    { key: 'account', label: 'Conta', options: (accounts ?? []).map((a) => ({ value: a.id, label: a.name })) },
    { key: 'card', label: 'Cartão', options: (cards ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { key: 'status', label: 'Status', options: [
      { value: 'pago', label: 'Pago' }, { value: 'vencido', label: 'Vencido' },
      { value: 'a_vencer', label: 'A vencer' }, { value: 'em_aberto', label: 'Em aberto' },
    ] },
  ], [categories, accounts, cards])

  const label = period.type === 'ano' ? String(period.year) : `${MONTHS[period.month]} ${period.year}`
  const fileName = `fynko-relatorio-${period.type === 'ano' ? period.year : `${period.year}-${String(period.month + 1).padStart(2, '0')}`}`

  function move(delta: number) {
    setPeriod((p) => {
      if (p.type === 'ano') return { ...p, year: p.year + delta }
      const d = new Date(p.year, p.month + delta, 1)
      return { ...p, year: d.getFullYear(), month: d.getMonth() }
    })
  }
  async function doExport(kind: 'csv' | 'xlsx' | 'pdf') {
    if (data.rows.length === 0) return toast('Nada para exportar neste período.', 'error')
    try {
      if (kind === 'csv') exportCSV(data.rows, fileName)
      else if (kind === 'xlsx') await exportExcel(data.rows, fileName)
      else
        await exportPDF({
          rows: data.rows,
          fileName,
          periodLabel: label,
          userName: profile?.full_name ?? user?.email ?? 'Usuário',
          indicators: [
            { label: 'Total recebido', value: formatBRL(data.totalReceitas), tone: 'pos' },
            { label: 'Total gasto', value: formatBRL(data.totalDespesas), tone: 'neg' },
            { label: 'Saldo líquido', value: formatBRL(data.saldo), tone: data.saldo >= 0 ? 'pos' : 'neg' },
            { label: 'Previsão', value: formatBRL(data.previsao), tone: data.previsao >= 0 ? 'pos' : 'neg' },
          ],
          categories: data.byCategory.map((c) => ({ name: c.name, despesa: c.despesa, color: c.color })),
        })
      toast('Exportado.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao exportar.', 'error')
    }
  }

  const catPie = data.byCategory.filter((c) => c.despesa > 0).map((c) => ({ name: c.name, value: c.despesa / 100, color: c.color }))
  const recPie = data.byCategory.filter((c) => c.receita > 0).map((c) => ({ name: c.name, value: c.receita / 100, color: c.color }))
  const statusPie = data.byStatus.map((s) => ({ name: s.status, value: s.total / 100, color: STATUS_COLOR[s.status] ?? '#94A3B8' }))
  const contaBars = data.byAccount.map((a) => ({ name: a.name, entradas: a.entradas / 100, saidas: a.saidas / 100 }))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      {/* Period + exports */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-rule bg-surface-2 p-1">
            {(['mes', 'ano'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setPeriod((p) => ({ ...p, type: t }))}
                className={cn('rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition', period.type === t ? 'bg-brand-solid text-on-brand' : 'text-ink/65')}>
                {t === 'mes' ? 'Mensal' : 'Anual'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Anterior" onClick={() => move(-1)} className="grid size-8 place-items-center rounded-lg border border-rule hover:bg-surface-2"><ChevronLeft className="size-4" /></button>
            <span className="min-w-28 text-center font-display font-bold capitalize">{label}</span>
            <button type="button" aria-label="Próximo" onClick={() => move(1)} className="grid size-8 place-items-center rounded-lg border border-rule hover:bg-surface-2"><ChevronRight className="size-4" /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="size-4" />} onClick={() => doExport('csv')}>CSV</Button>
          <Button variant="secondary" size="sm" icon={<FileSpreadsheet className="size-4" />} onClick={() => doExport('xlsx')}>Excel</Button>
          <Button variant="secondary" size="sm" icon={<FileText className="size-4" />} onClick={() => doExport('pdf')}>PDF</Button>
          <Button variant="secondary" size="sm" icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>Importar</Button>
        </div>
      </div>

      <FilterBar groups={filterGroups} value={filters} onChange={setFilters} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Indicators */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total recebido" value={formatBRL(data.totalReceitas)} tone="text-positive" />
        <Tile label="Total gasto" value={formatBRL(data.totalDespesas)} tone="text-danger" />
        <Tile label="Saldo líquido" value={formatBRL(data.saldo)} tone={data.saldo >= 0 ? 'text-positive' : 'text-danger'} />
        <Tile label="Economia do mês" value={formatBRL(data.economia)} tone={data.economia >= 0 ? 'text-positive' : 'text-danger'} />
        <Tile label="Maior receita" value={data.maiorReceita ? formatBRL(data.maiorReceita.amountCents) : '—'} sub={data.maiorReceita?.description} tone="text-positive" />
        <Tile label="Maior despesa" value={data.maiorDespesa ? formatBRL(data.maiorDespesa.amountCents) : '—'} sub={data.maiorDespesa?.description} tone="text-danger" />
        <Tile label="Categoria + gasto" value={data.categoriaMaiorGasto ? formatBRL(data.categoriaMaiorGasto.despesa) : '—'} sub={data.categoriaMaiorGasto?.name} />
        <Tile label="Previsão fechamento" value={formatBRL(data.previsao)} tone={data.previsao >= 0 ? 'text-positive' : 'text-danger'} />
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Receitas × Despesas (por mês)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.monthly} barGap={4}>
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
              <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={<ChartTooltip />} />
              <Bar name="Receita" dataKey="receita" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
              <Bar name="Despesa" dataKey="despesa" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Evolução do saldo">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.evolucao}>
              <defs>
                <linearGradient id="rpSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ChartTooltip />} />
              <Area name="Saldo" dataKey="saldo" stroke="var(--color-brand)" strokeWidth={2} fill="url(#rpSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Gastos por categoria">
          {catPie.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Sem despesas no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={catPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {catPie.map((c) => <Cell key={c.name} fill={c.color} stroke="var(--color-surface)" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Gastos por cartão">
          {data.byCard.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Sem gastos no cartão neste período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byCard.map((c) => ({ name: c.name, total: c.total / 100, color: c.color }))} layout="vertical">
                <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={90} />
                <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={<ChartTooltip />} />
                <Bar name="Gasto" dataKey="total" radius={[0, 4, 4, 0]}>
                  {data.byCard.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Fluxo de caixa">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data.monthly}>
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
              <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={<ChartTooltip />} />
              <Bar name="Entradas" dataKey="receita" fill="var(--color-positive)" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar name="Saídas" dataKey="despesa" fill="var(--color-danger)" radius={[4, 4, 0, 0]} barSize={12} />
              <Line name="Saldo" type="monotone" dataKey="saldo" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Comparativo por status">
          {statusPie.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Sem despesas no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {statusPie.map((s) => <Cell key={s.name} fill={s.color} stroke="var(--color-surface)" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Receitas por categoria">
          {recPie.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Sem receitas no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={recPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {recPie.map((c) => <Cell key={c.name} fill={c.color} stroke="var(--color-surface)" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Entradas × Saídas por conta">
          {contaBars.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Sem movimentação em contas no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={contaBars}>
                <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={<ChartTooltip />} />
                <Bar name="Entradas" dataKey="entradas" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
                <Bar name="Saídas" dataKey="saidas" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Detail tables */}
      <div className="flex gap-1 overflow-x-auto border-b border-rule">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={cn('whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition', tab === t.key ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink')}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-rule bg-surface p-2 sm:p-4">
        {tab === 'geral' && (
          <div className="divide-y divide-rule">
            {data.rows.length === 0 && <p className="py-10 text-center text-sm text-muted">Sem lançamentos neste período.</p>}
            {data.rows.slice(0, 100).map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.description}</div>
                  <div className="font-mono text-[11px] text-muted">{r.category} · {formatDisplayDate(r.date)} · {r.status}</div>
                </div>
                <span className={`font-mono text-sm tnum ${r.kind === 'Receita' ? 'text-positive' : 'text-ink/80'}`}>
                  {r.kind === 'Receita' ? '+ ' : '− '}{formatBRL(r.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
        {tab === 'categoria' && (
          <div className="divide-y divide-rule">
            {data.byCategory.map((c) => (
              <div key={c.name} className="flex items-center gap-3 px-2 py-2.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                {c.receita > 0 && <span className="font-mono text-xs tnum text-positive">+{formatBRL(c.receita)}</span>}
                <span className="font-mono text-sm tnum text-ink/80">{formatBRL(c.despesa)}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'conta' && (
          <div className="divide-y divide-rule">
            {data.byAccount.map((a) => (
              <div key={a.name} className="flex items-center gap-3 px-2 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
                <span className="font-mono text-xs tnum text-positive">+{formatBRL(a.entradas)}</span>
                <span className="font-mono text-xs tnum text-danger">−{formatBRL(a.saidas)}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'cartao' && (
          <div className="divide-y divide-rule">
            {data.byCard.length === 0 && <p className="py-8 text-center text-sm text-muted">Sem gastos no cartão.</p>}
            {data.byCard.map((c) => (
              <div key={c.name} className="flex items-center gap-3 px-2 py-2.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                <span className="font-mono text-sm tnum text-ink/80">{formatBRL(c.total)}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'status' && (
          <div className="divide-y divide-rule">
            {data.byStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between px-2 py-2.5">
                <span className="text-sm font-medium">{s.status}</span>
                <span className="font-mono text-sm tnum text-ink/80">{formatBRL(s.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
