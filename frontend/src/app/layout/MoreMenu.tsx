import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/hooks'
import { useSession } from '../../stores/session'
import { useUi } from '../../stores/ui'
import { usePwa } from '../../pwa'

/** Menú "Más" de la barra lateral: cambiar usuario de desarrollo, ajustes, tema, cerrar sesión. */
export function MoreMenu({ onClose, onSwitch }: { onClose: () => void; onSwitch: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const logout = useSession((s) => s.logout)
  const { tema, setTema } = useUi()
  const { instalable, instalar } = usePwa()
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const t = window.setTimeout(() => document.addEventListener('mousedown', h))
    document.addEventListener('keydown', k)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [onClose])
  const item = (icon: string, label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onClick()
        onClose()
      }}
      className={cn('state flex h-12 w-full items-center gap-3 rounded-md px-4 text-left type-body-l', danger && 'text-error')}
    >
      <Icon name={icon} />
      {label}
    </button>
  )
  return (
    <div
      ref={ref}
      role="menu"
      className="anim-scale-in absolute bottom-14 left-0 z-50 w-[266px] origin-bottom-left rounded-lg bg-surface-container-high p-2 shadow-xl"
    >
      {item('switch_account', 'Cambiar usuario (dev)', onSwitch)}
      {item('settings', 'Ajustes', () => navigate('/cuenta/ajustes'))}
      {item('insights', 'Estadísticas', () => navigate('/cuenta/estadisticas'))}
      {item('bookmark', 'Archivo de stories', () => navigate('/cuenta/archivo'))}
      {item(
        tema === 'oscuro' ? 'light_mode' : 'dark_mode',
        tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro',
        () => setTema(tema === 'oscuro' ? 'claro' : 'oscuro'),
      )}
      {instalable && item('install_desktop', 'Instalar app', () => void instalar())}
      <div className="my-1 h-px bg-outline-variant/60" />
      {item('logout', 'Cerrar sesión', () => {
        logout()
        navigate('/login')
      })}
    </div>
  )
}
