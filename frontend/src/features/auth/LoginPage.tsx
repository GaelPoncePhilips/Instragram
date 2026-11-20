import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Controls'
import { ApiError, mensajeDeError } from '../../services/client'
import { cuentasDev } from '../../services/temporal/local'
import { useSession } from '../../stores/session'
import { AuthShell } from './AuthShell'

export function LoginPage() {
  const login = useSession((s) => s.login)
  const estado = useSession((s) => s.estado)
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (estado === 'autenticado') return <Navigate to="/" replace />

  const desde = (location.state as { from?: string } | null)?.from

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate(desde && desde !== '/login' ? desde : '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Email o contraseña incorrectos' : mensajeDeError(err))
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      below={
        <>
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="type-label-l emphasized text-primary">
            Registrate
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-1" noValidate>
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <TextField label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={setPassword} error={error} />
        <Button type="submit" variant="filled" size="md" full disabled={enviando || !email || !password}>
          {enviando ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </form>

      {cuentasDev.length > 0 && (
        <>
          <div className="my-5 flex items-center gap-4 text-on-surface-variant type-label-l">
            <span className="h-px flex-1 bg-outline-variant" />o<span className="h-px flex-1 bg-outline-variant" />
          </div>
          <p className="type-label-m mb-2 text-center text-on-surface-variant">Cuentas de prueba</p>
          <div className="flex flex-wrap justify-center gap-2">
            {cuentasDev.map((c) => (
              <button
                key={c.username}
                type="button"
                onClick={() => {
                  setEmail(c.email)
                  setPassword(c.password)
                  setError(null)
                }}
                className="state inline-flex h-8 items-center rounded-sm border border-outline-variant px-3 type-label-m text-on-surface-variant"
              >
                {c.username}
              </button>
            ))}
          </div>
        </>
      )}
    </AuthShell>
  )
}
