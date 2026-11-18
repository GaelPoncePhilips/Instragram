/** Perfil (HU1, HU3, HU4) con destacadas, pestañas y archivo de stories. */
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FollowButton } from '../../components/shared'
import { Avatar, type Anillo } from '../../components/ui/Avatar'
import { Button, ButtonGroup } from '../../components/ui/Button'
import { Tabs, type TabItem } from '../../components/ui/Controls'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { ActionMenu, Confirm, type MenuAction } from '../../components/ui/Overlay'
import { cn, useAsync, useIsMobile } from '../../lib/hooks'
import { numeroCorto } from '../../lib/time'
import { ApiError, mensajeDeError } from '../../services/client'
import { crearConversacion } from '../../services/dms'
import * as storiesApi from '../../services/stories'
import * as usuariosApi from '../../services/usuarios'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Perfil, Relacion } from '../../types/api'
import { AlbumsTab } from '../albums/AlbumsTab'
import { HighlightsRow } from '../highlights/HighlightsRow'
import { ArchivoTab, PostsTab, ReelsTab } from './ProfileTabs'

export type ProfileTab = 'publicaciones' | 'reels' | 'albumes' | 'archivo'

const RUTA: Record<ProfileTab, string> = { publicaciones: '', reels: '/reels', albumes: '/albumes', archivo: '/archivo' }

export function ProfilePage({ tab }: { tab: ProfileTab }) {
  const { username = '' } = useParams()
  const yo = useYo()
  const navigate = useNavigate()
  const perfil = useAsync(() => usuariosApi.perfil(username), [username])
  const [bloqueado, setBloqueado] = useState<string | null>(null)
  const [destKey, setDestKey] = useState(0)

  if (bloqueado === username) return <NoDisponible />
  if (perfil.loading && !perfil.data) return <CenteredLoader className="py-24" />
  if (perfil.error) {
    if (perfil.error instanceof ApiError && perfil.error.status === 404) return <NoDisponible />
    if (perfil.error instanceof ApiError && perfil.error.status === 403) return <Privada />
    return <ErrorState error={perfil.error} onRetry={perfil.reload} />
  }
  const p = perfil.data
  if (!p) return null
  const esPropio = p.id === yo.id
  const sinPermiso = !esPropio && p.es_privada && p.relacion !== 'siguiendo'

  const items: TabItem[] = [
    { id: 'publicaciones', label: 'Publicaciones', icon: 'grid_on' },
    { id: 'reels', label: 'Reels', icon: 'movie' },
    { id: 'albumes', label: 'Álbumes', icon: 'photo_album' },
    ...(esPropio ? [{ id: 'archivo', label: 'Archivo', icon: 'history' }] : []),
  ]
  const tabActual: ProfileTab = tab === 'archivo' && !esPropio ? 'publicaciones' : tab

  return (
    <div className="mx-auto w-full max-w-[935px] pb-8">
      <Encabezado
        key={p.id}
        p={p}
        esPropio={esPropio}
        sinPermiso={sinPermiso}
        onRelacion={(r, prev) => {
          const delta = r === 'siguiendo' && prev !== 'siguiendo' ? 1 : prev === 'siguiendo' && r !== 'siguiendo' ? -1 : 0
          perfil.setData((old) => (old ? { ...old, relacion: r, cantidad_seguidores: old.cantidad_seguidores + delta } : p))
          if (p.es_privada && (r === 'siguiendo' || prev === 'siguiendo')) perfil.reload()
        }}
        onBloqueado={() => setBloqueado(username)}
      />
      {!sinPermiso && <HighlightsRow key={`${p.id}-${destKey}`} usuarioId={p.id} esPropio={esPropio} />}
      {sinPermiso ? (
        <div className="border-t border-outline-variant/60">
          <EmptyState icon="lock" title="Esta cuenta es privada" text="Seguila para ver sus fotos y videos." />
        </div>
      ) : (
        <>
          <div className="border-t border-outline-variant/60">
            <Tabs items={items} value={tabActual} onChange={(id) => navigate(`/${p.username}${RUTA[id as ProfileTab]}`)} iconOnlyMobile />
          </div>
          <div className="pt-[2px]">
            {tabActual === 'publicaciones' && <PostsTab usuarioId={p.id} esPropio={esPropio} />}
            {tabActual === 'reels' && <ReelsTab usuarioId={p.id} esPropio={esPropio} />}
            {tabActual === 'albumes' && <AlbumsTab usuarioId={p.id} esPropio={esPropio} />}
            {tabActual === 'archivo' && <ArchivoTab usuarioId={p.id} onDestacada={() => setDestKey((k) => k + 1)} />}
          </div>
        </>
      )}
    </div>
  )
}

function NoDisponible() {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon="link_off"
      title="Perfil no disponible"
      text="Es posible que el enlace no funcione o que se haya eliminado el perfil."
      action={<Button onClick={() => navigate('/')}>Volver al inicio</Button>}
    />
  )
}

function Privada() {
  return <EmptyState icon="lock" title="Esta cuenta es privada" text="Seguila para ver sus fotos y videos." />
}

function Contador({ n, label, to }: { n: number; label: string; to?: string }) {
  const contenido = (
    <>
      <span className="emphasized">{numeroCorto(n)}</span> <span className="max-md:block max-md:text-on-surface-variant">{label}</span>
    </>
  )
  const cls = 'type-body-l max-md:text-center max-md:type-body-m'
  return to ? (
    <Link to={to} className={cn(cls, 'hover:opacity-80')}>
      {contenido}
    </Link>
  ) : (
    <span className={cls}>{contenido}</span>
  )
}

function Encabezado({
  p,
  esPropio,
  sinPermiso,
  onRelacion,
  onBloqueado,
}: {
  p: Perfil
  esPropio: boolean
  sinPermiso: boolean
  onRelacion: (r: Relacion, prev: Relacion) => void
  onBloqueado: () => void
}) {
  const yo = useYo()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [menu, setMenu] = useState(false)
  const [confirmarBloqueo, setConfirmarBloqueo] = useState(false)
  const [rel, setRel] = useState<Relacion>(p.relacion)
  const stories = useAsync(() => storiesApi.storiesPublicadas(p.id).catch(() => []), [p.id])
  const amigos = useAsync(() => (esPropio ? Promise.resolve([]) : usuariosApi.mejoresAmigos(yo.id).catch(() => [])), [yo.id, esPropio])
  const esAmigo = (amigos.data ?? []).some((u) => u.id === p.id)

  const vigentes = stories.data ?? []
  const anillo: Anillo = vigentes.length === 0 ? 'ninguno' : vigentes.some((s) => !s.vista) ? 'sin-ver' : 'visto'

  const mensaje = async () => {
    try {
      const c = await crearConversacion({ participantes: [p.id] })
      navigate(`/direct/${c.id}`)
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }
  const alternarAmigo = async () => {
    try {
      if (esAmigo) {
        await usuariosApi.quitarMejorAmigo(yo.id, p.id)
        amigos.setData((l) => (l ?? []).filter((u) => u.id !== p.id))
        snackbar('Quitado de mejores amigos')
      } else {
        await usuariosApi.agregarMejorAmigo(yo.id, p.id)
        amigos.setData((l) => [...(l ?? []), { id: p.id, username: p.username, nombre: p.nombre }])
        snackbar('Añadido a mejores amigos')
      }
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }
  const bloquear = async () => {
    try {
      await usuariosApi.bloquear(p.id)
      snackbar(`Bloqueaste a ${p.username}`)
      onBloqueado()
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  const acciones: MenuAction[] = [
    { label: 'Bloquear', destructive: true, onClick: () => setConfirmarBloqueo(true) },
    { label: esAmigo ? 'Quitar de mejores amigos' : 'Añadir a mejores amigos', onClick: () => void alternarAmigo() },
    {
      label: 'Copiar enlace',
      onClick: () => {
        void navigator.clipboard
          .writeText(`${window.location.origin}/${p.username}`)
          .then(() => snackbar('Enlace copiado'))
          .catch(() => snackbar('No se pudo copiar el enlace'))
      },
    },
  ]

  const avatar = (
    <button
      type="button"
      disabled={vigentes.length === 0}
      onClick={() => navigate(`/stories/${p.id}`)}
      aria-label={vigentes.length ? `Ver stories de ${p.username}` : `Foto de perfil de ${p.username}`}
      className="shrink-0 rounded-full disabled:cursor-default"
    >
      <Avatar username={p.username} size={isMobile ? 86 : 150} anillo={anillo} />
    </button>
  )

  const botones: ReactNode = esPropio ? (
    <div className="flex items-center gap-2 max-md:w-full">
      <ButtonGroup className="max-md:flex-1">
        <Button variant="tonal" className="max-md:flex-1" onClick={() => navigate('/cuenta/editar')}>
          Editar perfil
        </Button>
        <Button variant="tonal" className="max-md:flex-1" onClick={() => navigate('/crear/publicacion')}>
          Nueva publicación
        </Button>
      </ButtonGroup>
      {!isMobile && <IconButton icon="settings" label="Configuración" onClick={() => navigate('/cuenta/ajustes')} />}
    </div>
  ) : (
    <div className="flex items-center gap-2 max-md:w-full">
      <ButtonGroup className="max-md:flex-1">
        <span className="contents max-md:[&>button]:flex-1">
          <FollowButton
            usuarioId={p.id}
            relacion={rel}
            esPrivada={p.es_privada}
            onChange={(r) => {
              const prev = rel
              setRel(r)
              onRelacion(r, prev)
            }}
          />
        </span>
        <Button variant="tonal" className="max-md:flex-1" onClick={() => void mensaje()}>
          Mensaje
        </Button>
      </ButtonGroup>
      {!isMobile && <IconButton icon="more_horiz" label="Opciones" onClick={() => setMenu(true)} />}
    </div>
  )

  const contadores = (
    <>
      <Contador n={p.cantidad_posts} label="publicaciones" />
      <Contador n={p.cantidad_seguidores} label="seguidores" to={sinPermiso ? undefined : `/${p.username}/seguidores`} />
      <Contador n={p.cantidad_seguidos} label="seguidos" to={sinPermiso ? undefined : `/${p.username}/seguidos`} />
    </>
  )
  const bio = (
    <div>
      <p className="type-label-l emphasized">{p.nombre}</p>
      {p.bio && <p className="type-body-m whitespace-pre-line">{p.bio}</p>}
    </div>
  )

  return (
    <>
      {isMobile ? (
        <>
          <header className="sticky top-0 z-20 flex h-12 items-center gap-1 border-b border-outline-variant/60 bg-surface px-3">
            {p.es_privada && <Icon name="lock" size={18} />}
            <h1 className="type-title-m emphasized min-w-0 flex-1 truncate">{p.username}</h1>
            {esPropio ? (
              <IconButton icon="menu" label="Configuración" onClick={() => navigate('/cuenta/ajustes')} />
            ) : (
              <IconButton icon="more_horiz" label="Opciones" onClick={() => setMenu(true)} />
            )}
          </header>
          <div className="flex flex-col gap-3 px-4 pt-4">
            <div className="flex items-center gap-6">
              {avatar}
              <div className="grid flex-1 grid-cols-3 gap-1">{contadores}</div>
            </div>
            {bio}
            {botones}
          </div>
        </>
      ) : (
        <div className="flex items-start gap-8 px-4 pt-8 pb-4 lg:gap-24 lg:px-12">
          <div className="flex w-[150px] justify-center lg:w-[230px]">{avatar}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="type-title-l min-w-0 truncate">{p.username}</h1>
              {botones}
            </div>
            <div className="flex gap-10">{contadores}</div>
            {bio}
          </div>
        </div>
      )}
      <ActionMenu open={menu} onClose={() => setMenu(false)} actions={acciones} />
      <Confirm
        open={confirmarBloqueo}
        title={`¿Bloquear a ${p.username}?`}
        text="No podrá ver tu perfil, tus publicaciones ni tus stories. No le avisaremos que lo bloqueaste."
        confirmLabel="Bloquear"
        destructive
        onConfirm={() => void bloquear()}
        onClose={() => setConfirmarBloqueo(false)}
      />
    </>
  )
}
