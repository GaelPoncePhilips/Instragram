/**
 * FAB extendido M3 Expressive del perfil propio, en la esquina inferior. Cambia según la pestaña:
 * Publicaciones → nueva publicación, Reels → nuevo reel, Álbumes → nuevo álbum, Archivo → nueva story.
 * Se contrae a solo ícono al bajar y se expande al subir o al cambiar de pestaña.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/hooks'
import type { ProfileTab } from './ProfilePage'

const ACCION: Record<ProfileTab, { label: string; icon: string; to: string }> = {
  publicaciones: { label: 'Nueva publicación', icon: 'add_photo_alternate', to: '/crear/publicacion' },
  reels: { label: 'Nuevo reel', icon: 'movie', to: '/crear/reel' },
  albumes: { label: 'Nuevo álbum', icon: 'photo_album', to: '/albumes/nuevo' },
  archivo: { label: 'Nueva story', icon: 'history_toggle_off', to: '/crear/story' },
}

export function ProfileFab({ tab }: { tab: ProfileTab }) {
  const navigate = useNavigate()
  const [extendido, setExtendido] = useState(true)
  const a = ACCION[tab]

  // Al cambiar de pestaña vuelve a mostrar la etiqueta.
  useEffect(() => {
    const t = window.setTimeout(() => setExtendido(true))
    return () => window.clearTimeout(t)
  }, [tab])

  useEffect(() => {
    let ultimo = window.scrollY
    const h = () => {
      const y = window.scrollY
      if (Math.abs(y - ultimo) < 8) return
      setExtendido(y < ultimo || y < 80)
      ultimo = y
    }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return createPortal(
    <button
      type="button"
      onClick={() => navigate(a.to)}
      aria-label={a.label}
      className={cn(
        'barra-fija state ripple anim-fab-item fixed right-4 z-20 flex h-14 items-center overflow-hidden rounded-lg bg-primary-container text-on-primary-container shadow-lg',
        'bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+16px)] md:right-8 md:bottom-8',
        'transition-[border-radius,padding,gap] spring-spatial-fast active:rounded-xl',
        extendido ? 'gap-3 pr-5 pl-4' : 'gap-0 px-4',
      )}
    >
      <Icon name={a.icon} size={24} />
      <span
        key={tab}
        className={cn(
          'type-title-s emphasized anim-fade-in overflow-hidden whitespace-nowrap transition-[max-width,opacity] spring-spatial',
          extendido ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0',
        )}
      >
        {a.label}
      </span>
    </button>,
    document.body,
  )
}
