import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, Lock, User } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/services/supabase'

type Mode = 'signin' | 'signup' | 'reset'

const titles: Record<Mode, string> = {
  signin: 'Entrar na sua conta',
  signup: 'Criar sua conta',
  reset: 'Recuperar senha',
}

export function LoginPage() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (mode === 'signup' && password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        navigate('/')
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUp(name, email, password)
        if (needsConfirmation) {
          setNotice('Conta criada! Confirme o e-mail que enviamos para entrar.')
          setMode('signin')
        } else {
          navigate('/')
        }
      } else {
        await requestPasswordReset(email)
        setNotice('Se este e-mail tiver conta, o link de recuperação chegará em instantes.')
        setMode('signin')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      {/* Decorative brand panel — fixed gradient, so the logo is forced white. */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{
          background:
            'radial-gradient(120% 120% at 15% 10%, #17352e 0%, #0b1f1a 55%, #081613 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full opacity-20 blur-3xl"
          style={{ background: '#f5b841' }}
        />
        <Logo variant="white" className="h-11 w-auto shrink-0 self-start" />
        <div className="relative">
          <p className="max-w-sm font-display text-3xl font-bold leading-tight text-white">
            Suas finanças organizadas como uma coruja sábia faria.
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/60">
            Contas, cartões, metas e assinaturas. Cada real no lugar certo, no
            dia certo.
          </p>
        </div>
        <div className="relative font-mono text-xs uppercase tracking-[0.2em] text-white/40">
          Fynko · Controle Financeiro Pessoal
        </div>
      </div>

      {/* Form panel. */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo className="h-10 w-auto" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {titles[mode]}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === 'signin' && 'Bom te ver de novo.'}
            {mode === 'signup' && 'Leva menos de um minuto.'}
            {mode === 'reset' && 'Enviamos um link para você criar uma nova senha.'}
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-ink/70">
              Modo demonstração: conecte o Supabase para ativar o login de
              verdade.{' '}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="font-semibold text-brand underline"
              >
                Explorar o app
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mode === 'signup' && (
              <TextField
                label="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="size-4" />}
                placeholder="Como devemos te chamar?"
                autoComplete="name"
                required
              />
            )}
            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<AtSign className="size-4" />}
              placeholder="voce@email.com"
              autoComplete="email"
              required
            />
            {mode !== 'reset' && (
              <TextField
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="size-4" />}
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
            )}
            {mode === 'signup' && (
              <TextField
                label="Confirmar senha"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                leftIcon={<Lock className="size-4" />}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            )}

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-positive/10 px-3 py-2 text-sm text-positive">
                {notice}
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-1">
              {mode === 'signin' && 'Entrar'}
              {mode === 'signup' && 'Criar conta'}
              {mode === 'reset' && 'Enviar link'}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm text-muted">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-left hover:text-ink"
                >
                  Esqueci minha senha
                </button>
                <span>
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="font-semibold text-brand hover:underline"
                  >
                    Criar conta
                  </button>
                </span>
              </>
            )}
            {mode !== 'signin' && (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-left hover:text-ink"
              >
                ← Voltar para o login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
