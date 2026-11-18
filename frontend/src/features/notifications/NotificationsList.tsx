import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Button, ButtonGroup } from '../../components/ui/Button'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { useAsync } from '../../lib/hooks'
import { tiempoCorto } from '../../lib/time'
import { aceptarInvitacion, quitarMiembro } from '../../services/albums'
import { mensajeDeError } from '../../services/client'
import { marcarTodasLeidas, notificaciones } from '../../services/temporal'
import { responderSolicitud, solicitudes } from '../../services/usuarios'
import { useBadges } from '../../stores/badges'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Notificacion } from '../../types/temporal'

const DIA = 24 * 60 * 60 * 1000
const GRUPOS = ['Hoy', 'Esta semana', 'Este mes', 'Anteriores'] as const
type Grupo = (typeof GRUPOS)[number]

function grupoDe(iso: string, ahora: number): Grupo {
  const d = ahora - new Date(iso).getTime()
  if (d < DIA) return 'Hoy'
  if (d < 7 * DIA) return 'Esta semana'
  if (d < 30 * DIA) return 'Este mes'
  return 'Anteriores'
}

function Miniatura({ to, url, onNavigate }: { to: string; url: string | null; onNavigate?: () => void }) {
  return (
    <Link to={to} onClick={onNavigate} aria-label="Ver contenido" className="block size-11 shrink-0 overflow-hidden rounded-xs bg-surface-container-highest">
      {url && <img src={url} alt="" className="size-full object-cover" loading="lazy" />}
    </Link>
  )
}

function Fila({
  n,
  onNavigate,
  onQuitar,
}: {
  n: Notificacion
  onNavigate?: () => void
  onQuitar: (id: number) => void
}) {
  const yo = useYo()
  const navigate = useNavigate()
  const [aceptada, setAceptada] = useState(false)
  const [busy, setBusy] = useState(false)
  const albumTo = n.album_id !== null ? `/albumes/${n.album_id}` : '/'
  const postTo = n.post_id !== null ? `/p/${n.post_id}` : '/'
  const album = `«${n.texto ?? 'álbum'}»`

  let accion: string
  let derecha: ReactNode = null
  switch (n.tipo) {
    case 'seguidor_nuevo':
      accion = 'empezó a seguirte.'
      derecha = (
        <Link to={`/${n.actor.username}`} onClick={onNavigate}>
          <Button variant="tonal" size="xs" tabIndex={-1}>
            Ver perfil
          </Button>
        </Link>
      )
      break
    case 'solicitud_seguimiento':
      accion = aceptada ? 'empezó a seguirte.' : 'quiere seguirte.'
      derecha = aceptada ? null : (
        <ButtonGroup>
          <Button size="xs" disabled={busy} onClick={() => void responder('aceptar')}>
            Confirmar
          </Button>
          <Button size="xs" variant="tonal" disabled={busy} onClick={() => void responder('rechazar')}>
            Eliminar
          </Button>
        </ButtonGroup>
      )
      break
    case 'like':
      accion = 'le gustó tu publicación.'
      derecha = <Miniatura to={postTo} url={n.url_miniatura} onNavigate={onNavigate} />
      break
    case 'comentario':
      accion = `comentó: ${n.texto ?? ''}`
      derecha = <Miniatura to={postTo} url={n.url_miniatura} onNavigate={onNavigate} />
      break
    case 'invitacion_album':
      accion = `te invitó al álbum ${album}.`
      derecha = (
        <ButtonGroup>
          <Button size="xs" disabled={busy} onClick={() => void invitacion(true)}>
            Aceptar
          </Button>
          <Button size="xs" variant="tonal" disabled={busy} onClick={() => void invitacion(false)}>
            Rechazar
          </Button>
        </ButtonGroup>
      )
      break
    case 'invitacion_aceptada':
      accion = `aceptó tu invitación a ${album}.`
      derecha = n.url_miniatura ? <Miniatura to={albumTo} url={n.url_miniatura} onNavigate={onNavigate} /> : null
      break
    case 'album_contenido':
      accion = `agregó fotos o videos a ${album}.`
      derecha = <Miniatura to={albumTo} url={n.url_miniatura} onNavigate={onNavigate} />
      break
    case 'album_participante':
      accion = `se unió a ${album}.`
      derecha = n.url_miniatura ? <Miniatura to={albumTo} url={n.url_miniatura} onNavigate={onNavigate} /> : null
      break
  }

  async function responder(a: 'aceptar' | 'rechazar') {
    setBusy(true)
    try {
      await responderSolicitud(yo.id, n.actor.id, a)
      if (a === 'aceptar') setAceptada(true)
      else onQuitar(n.id)
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }

  async function invitacion(ok: boolean) {
    if (n.album_id === null) return
    setBusy(true)
    try {
      if (ok) {
        await aceptarInvitacion(n.album_id)
        onNavigate?.()
        navigate(`/albumes/${n.album_id}`)
      } else {
        await quitarMiembro(n.album_id, yo.id)
        onQuitar(n.id)
      }
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center gap-3 py-2 pr-4 pl-2">
      <span className="flex w-2 shrink-0 justify-center">
        {!n.leida && <span className="size-2 rounded-full bg-primary" role="img" aria-label="No leída" />}
      </span>
      <Link to={`/${n.actor.username}`} onClick={onNavigate} aria-label={`Perfil de ${n.actor.username}`}>
        <Avatar username={n.actor.username} size={44} />
      </Link>
      <p className="type-body-m min-w-0 flex-1 break-words">
        <Link to={`/${n.actor.username}`} onClick={onNavigate} className="emphasized">
          {n.actor.username}
        </Link>{' '}
        {accion} <span className="text-on-surface-variant">{tiempoCorto(n.fecha)}</span>
      </p>
      {derecha}
    </li>
  )
}

export function NotificationsList({ onNavigate }: { onNavigate?: () => void }) {
  const yo = useYo()
  const { data, error, loading, reload, setData } = useAsync(() => notificaciones({ limit: 50 }), [])
  const pendientes = useAsync(() => solicitudes(yo.id, { limit: 50 }), [yo.id])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void marcarTodasLeidas()
        .then(() => useBadges.getState().setNotificaciones(0))
        .catch(() => undefined)
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])

  const [ahora] = useState(() => Date.now())
  const quitar = (id: number) => setData((prev) => (prev ?? []).filter((n) => n.id !== id))

  if (loading && !data) return <CenteredLoader />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />

  const lista = data ?? []
  const porGrupo = new Map<Grupo, Notificacion[]>()
  for (const n of lista) {
    const g = grupoDe(n.fecha, ahora)
    porGrupo.set(g, [...(porGrupo.get(g) ?? []), n])
  }
  const cantSolicitudes = pendientes.data?.length ?? 0

  return (
    <div>
      {cantSolicitudes > 0 && (
        <Link to="/cuenta/solicitudes" onClick={onNavigate} className="state flex items-center gap-3 px-4 py-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <Icon name="person_add" />
          </span>
          <span className="type-label-l emphasized flex-1">Solicitudes de seguimiento</span>
          <span className="type-label-m flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-on-primary">{cantSolicitudes}</span>
          <Icon name="chevron_right" className="text-on-surface-variant" />
        </Link>
      )}
      {lista.length === 0 ? (
        <EmptyState icon="notifications" title="Sin notificaciones" text="Cuando alguien interactúe con vos, lo vas a ver acá." />
      ) : (
        GRUPOS.filter((g) => porGrupo.has(g)).map((g) => (
          <section key={g} aria-label={g}>
            <h2 className="type-title-m emphasized px-4 pt-3 pb-1">{g}</h2>
            <ul>
              {(porGrupo.get(g) ?? []).map((n) => (
                <Fila key={n.id} n={n} onNavigate={onNavigate} onQuitar={quitar} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
