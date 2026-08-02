import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/hooks/useProfile'
import { changeEmail, changePassword } from '@/services/profile'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule bg-surface p-5 shadow-sm">
      <h3 className="mb-4 font-display text-base font-bold tracking-tight">{title}</h3>
      {children}
    </section>
  )
}

export function PerfilPage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const avatarRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function onAvatarPick(file: File) {
    try {
      await uploadAvatar.mutateAsync(file)
      toast('Foto atualizada.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao enviar a foto.', 'error')
    }
  }

  const [name, setName] = useState('')
  useEffect(() => {
    if (profile) setName(profile.full_name ?? '')
  }, [profile])

  const [email, setEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const initial = (profile?.full_name ?? user?.email ?? 'F').trim().charAt(0).toUpperCase()

  async function saveName() {
    if (!name.trim()) return toast('O nome não pode ficar vazio.', 'error')
    try {
      await updateProfile.mutateAsync({ full_name: name.trim() })
      toast('Nome atualizado.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao salvar.', 'error')
    }
  }

  async function saveEmail() {
    if (!email.trim()) return toast('Informe o novo e-mail.', 'error')
    setEmailBusy(true)
    try {
      await changeEmail(email.trim())
      toast('Enviamos um link de confirmação para o novo e-mail.')
      setEmail('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao trocar e-mail.', 'error')
    } finally {
      setEmailBusy(false)
    }
  }

  async function savePassword() {
    if (next.length < 6) return toast('A nova senha deve ter ao menos 6 caracteres.', 'error')
    if (next !== confirm) return toast('As senhas não coincidem.', 'error')
    setPwBusy(true)
    try {
      await changePassword(current, next)
      toast('Senha alterada.')
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao trocar senha.', 'error')
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => avatarRef.current?.click()}
          className="group relative size-16 shrink-0 overflow-hidden rounded-full bg-brand/15"
          aria-label="Trocar foto de perfil"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center font-display text-2xl font-bold text-brand">
              {initial}
            </span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
            {uploadAvatar.isPending ? '…' : <Camera className="size-5" />}
          </span>
        </button>
        <input
          ref={avatarRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onAvatarPick(f)
            e.target.value = ''
          }}
        />
        <div>
          <div className="font-display text-lg font-bold">{profile?.full_name ?? 'Sua conta'}</div>
          <div className="text-sm text-muted">{user?.email}</div>
        </div>
      </div>

      <Card title="Nome">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextField label="Como você quer ser chamado" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={saveName} loading={updateProfile.isPending}>Salvar</Button>
        </div>
      </Card>

      <Card title="E-mail">
        <p className="mb-3 text-sm text-muted">
          Seu e-mail atual é <strong className="text-ink/80">{user?.email}</strong>. Ao
          trocar, você recebe um link de confirmação no novo endereço.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextField label="Novo e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="novo@email.com" />
          </div>
          <Button variant="secondary" onClick={saveEmail} loading={emailBusy}>Trocar</Button>
        </div>
      </Card>

      <Card title="Senha">
        <div className="flex flex-col gap-3">
          <TextField label="Senha atual" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Nova senha" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            <TextField label="Confirmar" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <Button onClick={savePassword} loading={pwBusy}>Alterar senha</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
