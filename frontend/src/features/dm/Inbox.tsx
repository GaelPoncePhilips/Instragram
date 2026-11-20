import { useEffect } from 'react'
import { albumDeInvitacion } from '../../services/temporal/invitacionDm'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { IconButton } from '../../components/ui/IconButton'
import { cn, useAsync } from '../../lib/hooks'
import { tiempoCorto } from '../../lib/time'
import { conversaciones, solicitudesDeMensaje } from '../../services/dms'
import { useYo } from '../../stores/session'
import type { Conversacion } from '../../types/api'
import { nombreConversacion, otros } from './util'

function FilaAvatar({ c, yoId }: { c: Conversacion; yoId: number }) {
  const o = otros(c, yoId)
  if (c.es_grupal && o.length > 1) {
    return (
      <span className="relative block size-14 shrink-0" aria-hidden="true">
        <Avatar username={o[0].username} size={36} className="absolute top-0 left-0 ring-2 ring-surface" />
        <Avatar username={o[1].username} size={36} className="absolute right-0 bottom-0 ring-2 ring-surface" />
      </span>
    )
  }
  return <Avatar username={o[0]?.username ?? '?'} size={56} />
}

function Fila({ c, yoId, activa }: { c: Conversacion; yoId: number; activa: boolean }) {
  const um = c.ultimo_mensaje
  const sinLeer = c.no_leidos > 0
  let linea = 'Sin mensajes'
  if (um) {
    const base = albumDeInvitacion(um.texto) !== null ? 'Invitación a un álbum compartido 📸' : (um.texto ?? 'Compartió una publicación')
    linea = um.emisor_id === yoId ? `Vos: ${base}` : base
  }
  return (
    <Link
      to={`/direct/${c.id}`}
      aria-current={activa ? 'page' : undefined}
      className={cn('state flex items-center gap-3 px-4 py-2', activa && 'bg-surface-container-high')}
    >
      <FilaAvatar c={c} yoId={yoId} />
      <span className="min-w-0 flex-1">
        <span className={cn('type-body-l block truncate', sinLeer && 'emphasized')}>{nombreConversacion(c, yoId)}</span>
        <span className={cn('type-body-m flex gap-1 text-on-surface-variant', sinLeer && 'emphasized text-on-surface')}>
          <span className="truncate">{linea}</span>
          {um && <span className="shrink-0">· {tiempoCorto(um.fecha)}</span>}
        </span>
      </span>
      {sinLeer && <span className="size-2.5 shrink-0 rounded-full bg-primary" role="img" aria-label={`${c.no_leidos} sin leer`} />}
    </Link>
  )
}

export function Inbox({
  activeId,
  tab,
  refreshKey,
  onNuevo,
}: {
  activeId: number | null
  tab: 'mensajes' | 'solicitudes'
  refreshKey: number
  onNuevo: () => void
}) {
  const yo = useYo()
  const { data, error, loading, reload } = useAsync(async () => {
    const [convs, sols] = await Promise.all([conversaciones(), solicitudesDeMensaje()])
    return { convs, sols }
  }, [refreshKey])

  useEffect(() => {
    const t = setInterval(reload, 15000)
    return () => clearInterval(t)
  }, [reload])

  const lista = tab === 'mensajes' ? data?.convs : data?.sols
  const tabCls = (on: boolean) =>
    cn('state rounded-full px-4 py-1.5 type-label-l', on ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between pr-2 pl-5">
        <h1 className="type-title-l emphasized truncate">{yo.username}</h1>
        <IconButton icon="edit_square" label="Mensaje nuevo" onClick={onNuevo} />
      </header>
      <div role="tablist" className="flex shrink-0 gap-1 px-4 pb-2">
        <Link role="tab" aria-selected={tab === 'mensajes'} to="/direct" className={tabCls(tab === 'mensajes')}>
          Mensajes
        </Link>
        <Link role="tab" aria-selected={tab === 'solicitudes'} to="/direct/solicitudes" className={tabCls(tab === 'solicitudes')}>
          Solicitudes{data ? ` (${data.sols.length})` : ''}
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!data && loading && <CenteredLoader />}
        {!data && error && <ErrorState error={error} onRetry={reload} />}
        {lista && lista.length === 0 && (
          <EmptyState
            icon={tab === 'mensajes' ? 'chat_bubble' : 'inbox'}
            title={tab === 'mensajes' ? 'Todavía no tenés mensajes' : 'No hay solicitudes'}
            text={tab === 'mensajes' ? 'Escribile a alguien para empezar una conversación.' : 'Acá aparecen los mensajes de gente que no seguís.'}
          />
        )}
        {lista?.map((c) => <Fila key={c.id} c={c} yoId={yo.id} activa={c.id === activeId} />)}
      </div>
    </div>
  )
}
