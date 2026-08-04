import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Moon, Sun, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useDashboardPrefs, DASHBOARD_SECTIONS } from '@/hooks/useDashboardPrefs'
import { useBalanceMode, setBalanceMode, type BalanceMode } from '@/hooks/useBalanceMode'
import { exportAll, importAll } from '@/services/backup'
import { cn } from '@/utils/cn'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule bg-surface p-5 shadow-sm">
      <h3 className="font-display text-base font-bold tracking-tight">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-ink/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn('relative h-6 w-10 shrink-0 rounded-full transition', checked ? 'bg-brand-solid' : 'bg-ink/15')}
      >
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white transition-[left]', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

export function ConfiguracoesPage() {
  const { theme, toggleTheme } = useTheme()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const { prefs, toggle } = useDashboardPrefs()
  const balanceMode = useBalanceMode()
  const { toast } = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const dump = await exportAll()
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fynko-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('Backup exportado.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao exportar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File) {
    setBusy(true)
    try {
      const text = await file.text()
      await importAll(JSON.parse(text))
      await qc.invalidateQueries()
      toast('Backup restaurado.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao restaurar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Section title="Aparência">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink/80">Tema {theme === 'dark' ? 'escuro' : 'claro'}</span>
          <Button variant="secondary" size="sm" icon={theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />} onClick={toggleTheme}>
            Trocar
          </Button>
        </div>
        <div className="mt-4">
          <Select
            label="Moeda"
            options={[
              { value: 'BRL', label: 'Real (R$)' },
              { value: 'USD', label: 'Dólar (US$)' },
              { value: 'EUR', label: 'Euro (€)' },
              { value: 'GBP', label: 'Libra (£)' },
            ]}
            value={profile?.currency ?? 'BRL'}
            onChange={(e) => updateProfile.mutate({ currency: e.target.value })}
          />
        </div>
        <div className="mt-4">
          <Select
            label="Saldo exibido no topo"
            options={[
              { value: 'caixa', label: 'Saldo em caixa (acumulado)' },
              { value: 'mensal', label: 'Saldo do mês (mês atual)' },
            ]}
            value={balanceMode}
            onChange={(e) => setBalanceMode(e.target.value as BalanceMode)}
          />
          <p className="mt-1.5 text-xs text-muted">
            "Em caixa" soma tudo até hoje. "Do mês" mostra só o que entrou e foi
            pago no mês atual (pagamentos de meses anteriores não contam).
          </p>
        </div>
      </Section>

      <Section title="Personalização do Dashboard" description="Escolha o que aparece na tela inicial.">
        <div className="flex flex-col divide-y divide-rule">
          {DASHBOARD_SECTIONS.map((s) => (
            <Toggle key={s.key} label={s.label} checked={prefs[s.key]} onChange={() => toggle(s.key)} />
          ))}
        </div>
      </Section>

      <Section title="Backup" description="Exporte ou restaure toda a sua conta em um arquivo.">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={handleExport} loading={busy}>
            Exportar backup
          </Button>
          <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()} disabled={busy}>
            Restaurar backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImport(f)
              e.target.value = ''
            }}
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          Ao restaurar, categorias, contas e cartões com o mesmo nome são
          reaproveitados; os lançamentos são sempre adicionados como novos.
        </p>
      </Section>

      <Section title="Anexos">
        <p className="text-sm text-ink/70">
          Comprovantes e documentos anexados às movimentações são mantidos por
          <strong> 90 dias</strong>. Depois desse prazo, o arquivo é removido
          automaticamente para liberar espaço — o lançamento (valor, data,
          categoria) continua intacto.
        </p>
      </Section>
    </div>
  )
}
