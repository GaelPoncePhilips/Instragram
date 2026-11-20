import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { Icon } from '../../components/ui/Icon'
import { Dialog } from '../../components/ui/Overlay'
import { useEscape, useIsMobile } from '../../lib/hooks'
import { useUi } from '../../stores/ui'

const OPCIONES = [
  { id: 'publicacion', label: 'Publicación', icon: 'photo_library', to: '/crear/publicacion', desc: 'Foto con descripción y hashtags' },
  { id: 'reel', label: 'Reel', icon: 'movie', to: '/crear/reel', desc: 'Video vertical' },
  { id: 'story', label: 'Story', icon: 'history_toggle_off', to: '/crear/story', desc: 'Desaparece en 24 h' },
  { id: 'album', label: 'Álbum compartido', icon: 'photo_album', to: '/albumes/nuevo', desc: 'Fotos y videos con amigos' },
] as const

/**
 * Selector "Crear". Móvil: FAB menu M3 Expressive (ítems en píldora que saltan con spring desde abajo,
 * FAB de cierre que muta a círculo). Escritorio: diálogo modal.
 */
export function CreateMenu() {
  const abierto = useUi((s) => s.crearAbierto)
  const setCrear = useUi((s) => s.setCrear)
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const cerrar = () => setCrear(false)
  useEscape(cerrar, abierto && isMobile)
  const ir = (to: string) => {
    cerrar()
    navigate(to)
  }
  if (!abierto) return null

  if (!isMobile) {
    return (
      <Dialog open onClose={cerrar} title="Crear" width={440}>
        <ul className="grid grid-cols-2 gap-3 p-4">
          {OPCIONES.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => ir(o.to)}
                className="state ripple flex h-full w-full flex-col items-start gap-3 rounded-lg bg-surface-container-highest p-4 text-left transition-[border-radius] spring-spatial-fast active:rounded-xl"
              >
                <span className="flex size-12 items-center justify-center rounded-md bg-primary-container text-on-primary-container">
                  <Icon name={o.icon} size={26} />
                </span>
                <span>
                  <span className="type-title-m emphasized block">{o.label}</span>
                  <span className="type-body-s text-on-surface-variant">{o.desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Crear">
      <div className="anim-fade-in absolute inset-0 bg-scrim/45" onClick={cerrar} aria-hidden="true" />
      <div className="absolute right-4 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+16px)] flex flex-col items-end gap-2">
        {OPCIONES.map((o, i) => (
          <button
            key={o.id}
            type="button"
            onClick={() => ir(o.to)}
            className="anim-fab-item state ripple flex h-14 items-center gap-3 rounded-full bg-primary-container pr-6 pl-5 text-on-primary-container shadow-md"
            style={{ animationDelay: `${(OPCIONES.length - i) * 35}ms` }}
          >
            <Icon name={o.icon} />
            <span className="type-title-m">{o.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar menú Crear"
          autoFocus
          className="anim-fab-item mt-1 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg"
        >
          <Icon name="close" size={26} />
        </button>
      </div>
    </div>,
    document.body,
  )
}
