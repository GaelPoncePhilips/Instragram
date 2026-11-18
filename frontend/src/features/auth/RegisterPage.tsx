import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { ApiError, mensajeDeError } from '../../services/client'
import { registrar } from '../../services/usuarios'
import { useSession } from '../../stores/session'
import { AuthShell } from './AuthShell'

const USERNAME_OK = /^[a-z0-9._]+$/

export function RegisterPage() {
  const login = useSession((s) => s.login)
  const estado = useSession((s) => s.estado)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [bio, setBio] = useState('')
  const [errores, setErrores] = useState<{ email?: string; username?: string; general?: string }>({})
  const [enviando, setEnviando] = useState(false)

  if (estado === 'autenticado') return <Navigate to="/" replace />

  const userValido = username.length > 0 && USERNAME_OK.test(username)
  const userError = username.length > 0 && !userValido ? 'Solo minúsculas, números, punto y guion bajo' : (errores.username ?? null)
  const passError = password.length > 0 && password.length < 6 ? 'Mínimo 6 caracteres' : null
  const completo = email.trim() && nombre.trim() && userValido && password.length >= 6

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!completo || enviando) return
    setEnviando(true)
    setErrores({})
    try {
      await registrar({ email: email.trim(), nombre: nombre.trim(), username, password, bio: bio.trim() || null })
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = mensajeDeError(err)
      if (err instanceof ApiError && err.status === 409) {
        const m = msg.toLowerCase()
        if (m.includes('email')) setErrores({ email: msg })
        else if (m.includes('username') || m.includes('usuario')) setErrores({ username: msg })
        else setErrores({ general: msg })
      } else {
        setErrores({ general: msg })
      }
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      below={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="type-label-l emphasized text-primary">
            Iniciá sesión
          </Link>
        </>
      }
    >
      <p className="type-title-m mb-4 text-center text-on-surface-variant">Registrate para ver fotos y videos de tus amigos.</p>
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-1" noValidate>
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(v) => { setEmail(v); setErrores((s) => ({ ...s, email: undefined })) }} error={errores.email} />
        <TextField label="Nombre" autoComplete="name" value={nombre} onChange={setNombre} />
        <div className="relative">
          <TextField
            label="Nombre de usuario"
            autoComplete="username"
            value={username}
            onChange={(v) => { setUsername(v); setErrores((s) => ({ ...s, username: undefined })) }}
            error={userError}
          />
          {userValido && !userError && (
            <span className="absolute top-4 right-3 text-green-600" role="img" aria-label="Nombre de usuario válido">
              <Icon name="check_circle" fill size={22} />
            </span>
          )}
        </div>
        <TextField label="Contraseña" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={passError} />
        <TextField label="Bio (opcional)" value={bio} onChange={setBio} maxLength={150} multiline />
        {errores.general && (
          <p role="alert" className="mb-2 text-center type-body-s text-error">
            {errores.general}
          </p>
        )}
        <Button type="submit" variant="filled" size="md" full disabled={!completo || enviando}>
          {enviando ? 'Creando cuenta…' : 'Registrarte'}
        </Button>
      </form>
    </AuthShell>
  )
}
