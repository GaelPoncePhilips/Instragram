import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Dialog } from '../../components/ui/Overlay'
import { Icon } from '../../components/ui/Icon'
import { LoadingShape } from '../../components/ui/Feedback'
import { cn } from '../../lib/hooks'
import { mensajeDeError } from '../../services/client'
import { cuentasDev } from '../../services/temporal/local'
import { useBadges } from '../../stores/badges'
import { useSession } from '../../stores/session'
import { snackbar, useUi } from '../../stores/ui'

/** Cambia de cuenta de desarrollo sin recargar la página (login real con la cuenta de prueba). */
export function useCambiarCuenta() {
  const login = useSession((s) => s.login)
  const navigate = useNavigate()
  const [cambiando, setCambiando] = useState<string | null>(null)
  const cambiar = async (email: string, password: string, username: string) => {
    setCambiando(username)
    try {
      useUi.getState().setPanel(null)
      if (useUi.getState().panel) useUi.getState().setPanel(null)
      useBadges.getState().reset()
      await login(email, password)
      void useBadges.getState().refrescar()
      navigate('/')
      snackbar(`Ahora sos @${username}`)
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setCambiando(null)
    }
  }
  return { cambiar, cambiando }
}

export function DevSwitcherList({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const yo = useSession((s) => s.usuario)
  const { cambiar, cambiando } = useCambiarCuenta()
  if (!cuentasDev.length) return <p className="px-4 py-3 type-body-m text-on-surface-variant">Switcher desactivado (VITE_TEMPORAL_DEV_CUENTAS=false).</p>
  return (
    <ul className={cn('flex flex-col', compact && 'max-h-72 overflow-y-auto')}>
      {cuentasDev.map((c) => {
        const actual = c.username === yo?.username
        return (
          <li key={c.username}>
            <button
              type="button"
              disabled={actual || cambiando !== null}
              onClick={() => void cambiar(c.email, c.password, c.username).then(() => onDone?.())}
              className="state flex w-full items-center gap-3 px-4 py-2 text-left disabled:cursor-default"
            >
              <Avatar username={c.username} size={36} />
              <span className="min-w-0 flex-1">
                <span className="type-label-l emphasized flex items-center gap-1 truncate">
                  {c.username}
                  {c.privada && <Icon name="lock" size={14} className="text-on-surface-variant" />}
                </span>
                <span className="type-body-s block truncate text-on-surface-variant">{c.nombre}</span>
              </span>
              {cambiando === c.username ? (
                <LoadingShape size={22} />
              ) : actual ? (
                <Icon name="check_circle" fill className="text-primary" />
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function DevSwitcherDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cambiar de cuenta (desarrollo)" width={420}>
      <p className="px-4 pt-3 pb-1 type-body-s text-on-surface-variant">Contraseña de todas las cuentas de prueba: ronda123</p>
      <DevSwitcherList onDone={onClose} />
    </Dialog>
  )
}
