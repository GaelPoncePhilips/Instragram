import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Button, ButtonGroup } from '../../components/ui/Button'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { IconButton } from '../../components/ui/IconButton'
import { ActionMenu, Confirm } from '../../components/ui/Overlay'
import { useAsync } from '../../lib/hooks'
import { etiquetaDia, horaCorta } from '../../lib/time'
import { mensajeDeError } from '../../services/client'
import {
  aceptarConversacion,
  anularMensaje,
  conversaciones,
  enviarMensaje,
  marcarLeido,
  mensajes,
  salirDeConversacion,
  solicitudesDeMensaje,
} from '../../services/dms'
import { perfil } from '../../services/usuarios'
import { useYo } from '../../stores/session'
import { useBadges } from '../../stores/badges'
import { snackbar } from '../../stores/ui'
import type { Conversacion, Mensaje } from '../../types/api'
import { Burbuja } from './Burbuja'
import { esStatus, nombreConversacion, otros } from './util'

const PAGINA = 30

function NoDisponible({ isMobile }: { isMobile: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      {isMobile && (
        <div className="flex h-12 items-center px-1">
          <IconButton icon="arrow_back" label="Volver" onClick={() => navigate('/direct')} />
        </div>
      )}
      <div className="flex flex-1 items-center justify-center">
        <EmptyState icon="chat_bubble" title="Conversación no disponible" text="Puede que haya sido eliminada o que ya no tengas acceso." />
      </div>
    </div>
  )
}

/** Resuelve la conversación (no hay GET por id: se busca en aceptadas + solicitudes). */
export function ChatPane({ convId, isMobile, onActividad }: { convId: number; isMobile: boolean; onActividad: () => void }) {
  const { data, error, loading, reload, setData } = useAsync(async () => {
    const [a, s] = await Promise.all([conversaciones(), solicitudesDeMensaje()])
    return [...a, ...s].find((c) => c.id === convId) ?? null
  }, [convId])
  if (loading && data === undefined) return <CenteredLoader className="pt-24" />
  if (error) return esStatus(error, 404) ? <NoDisponible isMobile={isMobile} /> : <ErrorState error={error} onRetry={reload} />
  if (!data) return <NoDisponible isMobile={isMobile} />
  return <ChatView conv={data} isMobile={isMobile} onActividad={onActividad} onConv={(c) => setData(c)} />
}

type Pendiente = { tipo: 'fondo' } | { tipo: 'mantener'; altoPrevio: number } | null

function ChatView({
  conv,
  isMobile,
  onActividad,
  onConv,
}: {
  conv: Conversacion
  isMobile: boolean
  onActividad: () => void
  onConv: (c: Conversacion) => void
}) {
  const yo = useYo()
  const navigate = useNavigate()
  const [msgs, setMsgs] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fin, setFin] = useState(false)
  const [viejos, setViejos] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)
  const [menuMsg, setMenuMsg] = useState<Mensaje | null>(null)
  const [menuConv, setMenuConv] = useState(false)
  const [confirmSalir, setConfirmSalir] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendiente = useRef<Pendiente>(null)
  const msgsRef = useRef<Mensaje[]>([])
  const cargandoViejos = useRef(false)

  useEffect(() => {
    msgsRef.current = msgs
  }, [msgs])

  const otrosPart = otros(conv, yo.id)
  const nombre = nombreConversacion(conv, yo.id)
  const unoAUno = !conv.es_grupal
  const otro = otrosPart[0]
  const porId = new Map(conv.participantes.map((p) => [p.id, p]))
  const solicitud = conv.estado === 'solicitud'

  const leido = useCallback(() => {
    void marcarLeido(conv.id)
      .then(() => useBadges.getState().refrescar())
      .then(onActividad)
      .catch(() => undefined)
  }, [conv.id, onActividad])

  // Carga inicial
  useEffect(() => {
    let vivo = true
    mensajes(conv.id, undefined, PAGINA)
      .then((page) => {
        if (!vivo) return
        pendiente.current = { tipo: 'fondo' }
        setMsgs([...page].reverse())
        setFin(page.length < PAGINA)
        leido()
      })
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [conv.id, recarga, leido])

  // Bloqueo en 1 a 1: el perfil del otro da 404
  useEffect(() => {
    if (!unoAUno || !otro) return
    let vivo = true
    perfil(otro.username).catch((e: unknown) => {
      if (vivo && esStatus(e, 404)) setBloqueado(true)
    })
    return () => {
      vivo = false
    }
  }, [unoAUno, otro])

  // Polling cada 5 s
  useEffect(() => {
    const t = setInterval(() => {
      mensajes(conv.id, undefined, PAGINA)
        .then((page) => {
          if (!page.length) return
          const prev = msgsRef.current
          const conocidos = new Set(prev.map((m) => m.id))
          const idsPagina = new Set(page.map((m) => m.id))
          const minId = Math.min(...page.map((m) => m.id))
          const nuevos = page.filter((m) => !conocidos.has(m.id))
          const quedan = prev.filter((m) => m.id < minId || idsPagina.has(m.id))
          if (!nuevos.length && quedan.length === prev.length) return
          const el = scrollRef.current
          if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) pendiente.current = { tipo: 'fondo' }
          setMsgs([...quedan, ...nuevos].sort((a, b) => a.id - b.id))
          if (nuevos.some((m) => m.emisor_id !== yo.id)) leido()
        })
        .catch(() => undefined)
    }, 5000)
    return () => clearInterval(t)
  }, [conv.id, yo.id, leido])

  useLayoutEffect(() => {
    const el = scrollRef.current
    const p = pendiente.current
    if (!el || !p) return
    if (p.tipo === 'fondo') el.scrollTop = el.scrollHeight
    else el.scrollTop += el.scrollHeight - p.altoPrevio
    pendiente.current = null
  }, [msgs])

  const cargarViejos = async () => {
    const el = scrollRef.current
    if (cargandoViejos.current || fin || !msgs.length || !el) return
    cargandoViejos.current = true
    setViejos(true)
    try {
      const page = await mensajes(conv.id, msgs[0].id, PAGINA)
      pendiente.current = { tipo: 'mantener', altoPrevio: el.scrollHeight }
      setMsgs((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        return [...[...page].reverse().filter((m) => !ids.has(m.id)), ...prev]
      })
      if (page.length < PAGINA) setFin(true)
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      cargandoViejos.current = false
      setViejos(false)
    }
  }

  const enviar = async () => {
    const t = texto.trim()
    if (!t || enviando || bloqueado) return
    setEnviando(true)
    try {
      const m = await enviarMensaje(conv.id, { texto: t })
      pendiente.current = { tipo: 'fondo' }
      setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      setTexto('')
      onActividad()
    } catch (e) {
      if (esStatus(e, 403, 404)) setBloqueado(true)
      else snackbar(mensajeDeError(e))
    } finally {
      setEnviando(false)
    }
  }

  const anular = async (m: Mensaje) => {
    try {
      await anularMensaje(m.id)
      setMsgs((prev) => prev.filter((x) => x.id !== m.id))
      onActividad()
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  const copiar = async (m: Mensaje) => {
    try {
      await navigator.clipboard.writeText(m.texto ?? '')
      snackbar('Copiado')
    } catch {
      snackbar('No se pudo copiar')
    }
  }

  const aceptar = async () => {
    try {
      const c = await aceptarConversacion(conv.id)
      onConv(c)
      void useBadges.getState().refrescar()
      onActividad()
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  const salir = async (destino: string) => {
    try {
      await salirDeConversacion(conv.id)
      void useBadges.getState().refrescar()
      onActividad()
      navigate(destino)
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  const accionesConv = [
    ...(unoAUno && otro ? [{ label: 'Ver perfil', onClick: () => navigate(`/${otro.username}`) }] : []),
    {
      label: unoAUno ? 'Eliminar chat' : 'Salir de la conversación',
      destructive: true,
      onClick: () => setConfirmSalir(true),
    },
  ]

  const accionesMsg = menuMsg
    ? [
        { label: 'Anular envío', destructive: true, onClick: () => void anular(menuMsg) },
        ...(menuMsg.texto ? [{ label: 'Copiar', onClick: () => void copiar(menuMsg) }] : []),
      ]
    : []

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-outline-variant/60 px-2">
        {isMobile && <IconButton icon="arrow_back" label="Volver" onClick={() => navigate('/direct')} />}
        {conv.es_grupal && otrosPart.length > 1 ? (
          <span className="relative ml-2 block size-10 shrink-0" aria-hidden="true">
            <Avatar username={otrosPart[0].username} size={26} className="absolute top-0 left-0 ring-2 ring-surface" />
            <Avatar username={otrosPart[1].username} size={26} className="absolute right-0 bottom-0 ring-2 ring-surface" />
          </span>
        ) : (
          <Avatar username={otro?.username ?? '?'} size={40} className="ml-2" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="type-title-m emphasized truncate">{nombre}</h2>
          {unoAUno && otro && <p className="type-body-s truncate text-on-surface-variant">{otro.nombre}</p>}
          {!unoAUno && <p className="type-body-s truncate text-on-surface-variant">{conv.participantes.length} participantes</p>}
        </div>
        <IconButton icon="more_horiz" label="Opciones de la conversación" onClick={() => setMenuConv(true)} />
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
        onScroll={(e) => {
          if (e.currentTarget.scrollTop < 80) void cargarViejos()
        }}
      >
        {cargando && <CenteredLoader />}
        {error && <ErrorState error={error} onRetry={() => {
              setError(null)
              setCargando(true)
              setRecarga((r) => r + 1)
            }} />}
        {viejos && <CenteredLoader className="py-2" />}
        {!cargando && !error && msgs.length === 0 && (
          <EmptyState icon="send" title="Todavía no hay mensajes" text="Escribí el primero." />
        )}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1]
          const next = msgs[i + 1]
          const dia = new Date(m.fecha).toDateString()
          const nuevoDia = !prev || new Date(prev.fecha).toDateString() !== dia
          const conPrev = !!prev && !nuevoDia && prev.emisor_id === m.emisor_id
          const conNext = !!next && new Date(next.fecha).toDateString() === dia && next.emisor_id === m.emisor_id
          return (
            <div key={m.id}>
              {nuevoDia && (
                <p className="type-label-m my-3 text-center text-on-surface-variant">
                  {etiquetaDia(m.fecha)}, {horaCorta(m.fecha)}
                </p>
              )}
              <Burbuja
                m={m}
                mio={m.emisor_id === yo.id}
                emisor={porId.get(m.emisor_id)}
                grupal={conv.es_grupal}
                conPrev={conPrev}
                conNext={conNext}
                isMobile={isMobile}
                onMenu={setMenuMsg}
              />
            </div>
          )
        })}
      </div>

      {solicitud ? (
        <div className="shrink-0 border-t border-outline-variant/60 px-4 py-3 text-center">
          <p className="type-body-m mb-3">
            {otro ? `@${otro.username}` : 'Alguien'} quiere enviarte un mensaje
          </p>
          <ButtonGroup className="justify-center">
            <Button variant="filled" onClick={() => void aceptar()}>
              Aceptar
            </Button>
            <Button variant="tonal" onClick={() => void salir('/direct/solicitudes')}>
              Eliminar
            </Button>
          </ButtonGroup>
        </div>
      ) : bloqueado ? (
        <p className="type-body-m shrink-0 border-t border-outline-variant/60 px-4 py-4 text-center text-on-surface-variant">
          No podés responder a esta conversación.
        </p>
      ) : (
        <form
          className="flex shrink-0 items-center gap-2 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault()
            void enviar()
          }}
        >
          <div className="flex min-h-11 flex-1 items-center rounded-full border border-outline-variant pr-2 pl-4">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Mensaje…"
              aria-label="Mensaje"
              maxLength={1000}
              className="type-body-l h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-on-surface-variant"
            />
            {texto.trim() && (
              <button type="submit" disabled={enviando} className="state rounded-full px-3 py-1 type-label-l emphasized text-primary disabled:opacity-50">
                Enviar
              </button>
            )}
          </div>
        </form>
      )}

      <ActionMenu open={menuMsg !== null} onClose={() => setMenuMsg(null)} actions={accionesMsg} />
      <ActionMenu open={menuConv} onClose={() => setMenuConv(false)} actions={accionesConv} />
      <Confirm
        open={confirmSalir}
        title={unoAUno ? '¿Eliminar este chat?' : '¿Salir de la conversación?'}
        text="Dejarás de ver esta conversación en tu bandeja."
        confirmLabel={unoAUno ? 'Eliminar' : 'Salir'}
        destructive
        onConfirm={() => void salir('/direct')}
        onClose={() => setConfirmSalir(false)}
      />
    </div>
  )
}
