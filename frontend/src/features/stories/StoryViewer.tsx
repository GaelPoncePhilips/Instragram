import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { UserRow } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { ActionMenu, Confirm, Sheet } from '../../components/ui/Overlay'
import { cn, useAsync, useIsDesktop } from '../../lib/hooks'
import { tiempoCorto } from '../../lib/time'
import { ApiError, mensajeDeError } from '../../services/client'
import * as storiesApi from '../../services/stories'
import { usuarioPorId } from '../../services/temporal'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Story, UsuarioResumen } from '../../types/api'

const DURACION_MS = 5000

interface Grupo {
  usuario: UsuarioResumen
  stories: Story[]
}

interface Cola {
  grupos: Grupo[]
  inicio: number
}

function primeraNoVista(g: Grupo | undefined): number {
  if (!g) return 0
  const i = g.stories.findIndex((s) => !s.vista)
  return i < 0 ? 0 : i
}

async function cargarCola(modo: 'usuario' | 'destacada', param: number, yo: UsuarioResumen): Promise<Cola> {
  if (modo === 'destacada') {
    const d = await storiesApi.obtenerDestacada(param)
    const usuario = d.usuario_id === yo.id ? yo : await usuarioPorId(d.usuario_id)
    return { grupos: [{ usuario, stories: d.stories.map((s) => ({ ...s, vista: true })) }], inicio: 0 }
  }
  const seguidos = await storiesApi.storiesDeSeguidos(yo.id)
  const grupos: Grupo[] = seguidos.filter((g) => g.stories.length > 0).map((g) => ({ usuario: g.usuario, stories: g.stories }))
  if (param === yo.id) {
    const mias = await storiesApi.storiesPublicadas(yo.id)
    if (mias.length > 0) grupos.unshift({ usuario: yo, stories: mias.map((s) => ({ ...s, vista: true })) })
  }
  const idx = grupos.findIndex((g) => g.usuario.id === param)
  if (idx >= 0) return { grupos, inicio: idx }
  const stories = await storiesApi.storiesPublicadas(param)
  const usuario = await usuarioPorId(param)
  return { grupos: [{ usuario, stories }], inicio: 0 }
}

export function StoryViewerPage({ modo }: { modo: 'usuario' | 'destacada' }) {
  const params = useParams()
  const navigate = useNavigate()
  const yo = useYo()
  const param = Number(modo === 'destacada' ? params.id : params.usuarioId)
  const yoResumen: UsuarioResumen = { id: yo.id, username: yo.username, nombre: yo.nombre }
  const { data, error, loading, reload } = useAsync(() => cargarCola(modo, param, yoResumen), [modo, param, yo.id])
  const cerrar = useCallback(() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }, [navigate])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white" role="dialog" aria-modal="true" aria-label="Stories">
      {loading && !data ? (
        <CenteredLoader />
      ) : error ? (
        <div className="rounded-lg bg-surface p-4 text-on-surface">
          {error instanceof ApiError && error.status === 403 ? (
            <EmptyState icon="lock" title="Esta cuenta es privada" />
          ) : error instanceof ApiError && error.status === 404 ? (
            <EmptyState icon="link_off" title="Esta story no está disponible" />
          ) : (
            <ErrorState error={error} onRetry={reload} />
          )}
          <button type="button" className="type-label-l mt-2 w-full text-primary" onClick={cerrar}>
            Cerrar
          </button>
        </div>
      ) : data && data.grupos.some((g) => g.stories.length > 0) ? (
        <Visor key={`${modo}-${param}`} cola={data} onCerrar={cerrar} />
      ) : (
        <div className="rounded-lg bg-surface p-4 text-on-surface">
          <EmptyState icon="history_toggle_off" title="No hay stories para ver" />
          <button type="button" className="type-label-l mt-2 w-full text-primary" onClick={cerrar}>
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}

function Visor({ cola, onCerrar }: { cola: Cola; onCerrar: () => void }) {
  const yo = useYo()
  const isDesktop = useIsDesktop()
  const [grupos, setGrupos] = useState<Grupo[]>(() => cola.grupos.filter((g) => g.stories.length > 0))
  const inicioGrupo = Math.max(
    0,
    grupos.findIndex((g) => g.usuario.id === cola.grupos[cola.inicio]?.usuario.id),
  )
  const [pos, setPos] = useState(() => ({ g: inicioGrupo, s: primeraNoVista(grupos[inicioGrupo]) }))
  const [pausaPress, setPausaPress] = useState(false)
  const [pausaUi, setPausaUi] = useState(false)
  const [vistasAbiertas, setVistasAbiertas] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const registradas = useRef(new Set<number>())
  const pressTimer = useRef<number | null>(null)
  const fuePausa = useRef(false)

  const grupo = grupos[pos.g]
  const story = grupo?.stories[pos.s]
  const esMia = grupo?.usuario.id === yo.id
  const pausado = pausaPress || pausaUi || vistasAbiertas || menu || confirmar

  const siguiente = useCallback(() => {
    setPos((p) => {
      const g = grupos[p.g]
      if (g && p.s < g.stories.length - 1) return { g: p.g, s: p.s + 1 }
      if (p.g < grupos.length - 1) return { g: p.g + 1, s: primeraNoVista(grupos[p.g + 1]) }
      onCerrar()
      return p
    })
  }, [grupos, onCerrar])

  const anterior = useCallback(() => {
    setPos((p) => {
      if (p.s > 0) return { g: p.g, s: p.s - 1 }
      if (p.g > 0) return { g: p.g - 1, s: 0 }
      return { g: p.g, s: 0 }
    })
  }, [])

  // Registrar vista (una vez por story, solo ajenas)
  useEffect(() => {
    if (!story || esMia || registradas.current.has(story.id)) return
    registradas.current.add(story.id)
    if (!story.vista) storiesApi.registrarVista(story.id).catch(() => undefined)
  }, [story, esMia])

  // Precargar la siguiente imagen
  useEffect(() => {
    if (!grupo) return
    const prox = grupo.stories[pos.s + 1] ?? grupos[pos.g + 1]?.stories[0]
    if (prox) {
      const img = new Image()
      img.src = prox.url_imagen
    }
  }, [grupo, grupos, pos])

  // Teclado
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (vistasAbiertas || menu || confirmar) return
      if (e.key === 'ArrowRight') siguiente()
      else if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'Escape') onCerrar()
      else if (e.key === ' ') {
        e.preventDefault()
        setPausaUi((v) => !v)
      } else return
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [siguiente, anterior, onCerrar, vistasAbiertas, menu, confirmar])

  const onPointerDown = () => {
    fuePausa.current = false
    pressTimer.current = window.setTimeout(() => {
      fuePausa.current = true
      setPausaPress(true)
    }, 200)
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
    if (fuePausa.current) {
      setPausaPress(false)
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    if (e.clientX - r.left < r.width / 3) anterior()
    else siguiente()
  }
  const onPointerCancel = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current)
    setPausaPress(false)
  }

  const borrar = async () => {
    if (!story) return
    try {
      await storiesApi.borrarStory(story.id)
      snackbar('Story eliminada')
      const restantes = grupo.stories.filter((s) => s.id !== story.id)
      if (restantes.length === 0) {
        if (grupos.length === 1) {
          onCerrar()
          return
        }
        const nuevos = grupos.filter((_, i) => i !== pos.g)
        setGrupos(nuevos)
        setPos({ g: Math.min(pos.g, nuevos.length - 1), s: 0 })
      } else {
        setGrupos(grupos.map((g, i) => (i === pos.g ? { ...g, stories: restantes } : g)))
        setPos({ g: pos.g, s: Math.min(pos.s, restantes.length - 1) })
      }
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  if (!grupo || !story) return null

  return (
    <div className="flex h-full w-full items-center justify-center gap-4">
      {isDesktop && (
        <IconButton
          icon="chevron_left"
          label="Anterior"
          variant="tonal"
          disabled={pos.g === 0 && pos.s === 0}
          onClick={anterior}
        />
      )}
      <div
        className={cn(
          'relative overflow-hidden bg-neutral-900',
          isDesktop ? 'aspect-[9/16] h-[92vh] rounded-md' : 'h-full w-full md:aspect-[9/16] md:h-[92vh] md:w-auto md:rounded-md',
        )}
      >
        <img
          key={story.id}
          src={story.url_imagen}
          alt={`Story de ${grupo.usuario.username}`}
          draggable={false}
          className="anim-fade-in absolute inset-0 size-full object-cover select-none"
        />
        {/* Zona de toque */}
        <div
          className="absolute inset-0 touch-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Cabecera */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-3 pt-3 pb-8">
          <div className="flex gap-1">
            {grupo.stories.map((s, i) => (
              <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
                {i < pos.s ? (
                  <div className="h-full w-full bg-white" />
                ) : i === pos.s ? (
                  <div
                    key={`${pos.g}-${pos.s}-${story.id}`}
                    className="h-full w-full origin-left bg-white"
                    style={{
                      animation: `story-progress ${DURACION_MS}ms linear forwards`,
                      animationPlayState: pausado ? 'paused' : 'running',
                    }}
                    onAnimationEnd={siguiente}
                  />
                ) : null}
              </div>
            ))}
          </div>
          <div className="pointer-events-auto mt-3 flex items-center gap-2">
            <Avatar username={grupo.usuario.username} size={32} />
            <span className="type-label-l emphasized">{grupo.usuario.username}</span>
            <span className="type-label-m text-white/75">{tiempoCorto(story.fecha_publicacion)}</span>
            {story.solo_mejores_amigos && (
              <span className="type-label-s flex items-center gap-1 rounded-full bg-amigos px-2 py-0.5 text-white">
                <Icon name="crown" fill size={12} />
                Mejores amigos
              </span>
            )}
            <span className="flex-1" />
            <IconButton
              icon={pausaUi ? 'play_arrow' : 'pause'}
              label={pausaUi ? 'Reanudar' : 'Pausar'}
              className="text-white"
              onClick={() => setPausaUi((v) => !v)}
            />
            {esMia && <IconButton icon="more_horiz" label="Más opciones" className="text-white" onClick={() => setMenu(true)} />}
            <IconButton icon="close" label="Cerrar" className="text-white" onClick={onCerrar} />
          </div>
        </div>
        {esMia && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pt-8 pb-4">
            <button
              type="button"
              className="type-label-l flex items-center gap-1.5 text-white"
              onClick={() => setVistasAbiertas(true)}
            >
              <Icon name="visibility" size={20} />
              <VistoPor storyId={story.id} />
            </button>
          </div>
        )}
      </div>
      {isDesktop && (
        <IconButton
          icon="chevron_right"
          label="Siguiente"
          variant="tonal"
          onClick={siguiente}
        />
      )}
      {esMia && (
        <>
          <VistasSheet storyId={story.id} open={vistasAbiertas} onClose={() => setVistasAbiertas(false)} />
          <ActionMenu
            open={menu}
            onClose={() => setMenu(false)}
            actions={[{ label: 'Eliminar', icon: 'delete', destructive: true, onClick: () => setConfirmar(true) }]}
          />
          <Confirm
            open={confirmar}
            title="¿Eliminar story?"
            text="Esta acción no se puede deshacer."
            confirmLabel="Eliminar"
            destructive
            onConfirm={() => void borrar()}
            onClose={() => setConfirmar(false)}
          />
        </>
      )}
    </div>
  )
}

function VistoPor({ storyId }: { storyId: number }) {
  const { data } = useAsync(() => storiesApi.vistasDeStory(storyId), [storyId])
  return <span>Visto por {data?.length ?? 0}</span>
}

function VistasSheet({ storyId, open, onClose }: { storyId: number; open: boolean; onClose: () => void }) {
  const { data, error, loading, reload } = useAsync(
    () => (open ? storiesApi.vistasDeStory(storyId) : Promise.resolve([])),
    [storyId, open],
  )
  return (
    <Sheet open={open} onClose={onClose} title="Visto por">
      <div className="text-on-surface">
        {loading && !data ? (
          <CenteredLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon="visibility" title="Todavía nadie vio esta story" />
        ) : (
          <div className="py-2">
            {data.map((v) => (
              <UserRow key={v.id} usuario={v} subtitle={`${v.nombre} • ${tiempoCorto(v.fecha)}`} onClick={onClose} />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}
