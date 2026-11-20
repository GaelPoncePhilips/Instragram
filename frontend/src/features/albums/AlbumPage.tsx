import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ScreenHeader } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { Button, ButtonGroup } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Controls'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { ActionMenu, Confirm, Dialog, Sheet, type MenuAction } from '../../components/ui/Overlay'
import { useAsync, useIsMobile } from '../../lib/hooks'
import { fechaLarga, tiempoLargo } from '../../lib/time'
import * as albumsApi from '../../services/albums'
import { ApiError, mensajeDeError } from '../../services/client'
import { useBadges } from '../../stores/badges'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Album, AlbumItem, AlbumMiembro, UsuarioResumen } from '../../types/api'
import { MediaPicker, type MediaElegida } from '../create/MediaPicker'
import { AvatarStack, contarMedia, miembrosAceptados, miRol, useAutor } from './common'
import { FriendPicker } from './FriendPicker'

/**
 * Pantalla del álbum compartido: portada, título, descripción, fecha, participantes, acciones según rol
 * y contenido en grilla de 3 columnas con el autor de cada ítem.
 */
export function AlbumPage() {
  const { id } = useParams()
  const albumId = Number(id)
  const yo = useYo()
  const navigate = useNavigate()
  const album = useAsync(() => albumsApi.obtenerAlbum(albumId), [albumId])
  const items = useAsync(() => albumsApi.itemsDeAlbum(albumId), [albumId])
  const [subir, setSubir] = useState(false)
  const [invitar, setInvitar] = useState(false)
  const [participantes, setParticipantes] = useState(false)
  const [editar, setEditar] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState<'borrar' | 'salir' | null>(null)
  const [visor, setVisor] = useState<AlbumItem | null>(null)

  if (album.error) {
    const st = album.error instanceof ApiError ? album.error.status : 0
    return (
      <div className="mx-auto max-w-[935px]">
        <ScreenHeader title="Álbum" onBack={() => navigate(-1)} />
        {st === 403 ? (
          <EmptyState icon="lock" title="No tenés acceso a este álbum" text="Lo ven sus participantes y quienes siguen a alguno de ellos." />
        ) : st === 404 ? (
          <EmptyState icon="photo_album" title="Álbum no disponible" text="Puede que lo hayan eliminado o que no tengas permiso para verlo." />
        ) : (
          <ErrorState error={album.error} onRetry={album.reload} />
        )}
      </div>
    )
  }
  if (!album.data) return <CenteredLoader />

  const a = album.data
  const lista = items.data ?? []
  const { esMiembro, esAdmin, pendiente } = miRol(a, yo.id)
  const aceptados = miembrosAceptados(a)
  const creador = a.miembros.find((m) => m.id === a.creador_id)
  const portada = a.portada_url ?? lista[0]?.url_imagen ?? null
  const autores = new Set(lista.map((i) => i.usuario_id))

  const setAlbum = (x: Album) => album.setData(x)

  const responder = async (aceptar: boolean) => {
    try {
      if (aceptar) {
        setAlbum(await albumsApi.aceptarInvitacion(a.id))
        snackbar(`Te uniste a «${a.titulo}»`)
      } else {
        await albumsApi.quitarMiembro(a.id, yo.id)
        snackbar('Invitación rechazada')
        navigate(`/${yo.username}/albumes`, { replace: true })
      }
      void useBadges.getState().refrescar()
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  const acciones: MenuAction[] = [
    ...(esAdmin
      ? [
          { label: 'Editar álbum', onClick: () => setEditar(true) },
          { label: 'Eliminar álbum', destructive: true, onClick: () => setConfirm('borrar') },
        ]
      : []),
    ...(esMiembro ? [{ label: 'Salir del álbum', destructive: true, onClick: () => setConfirm('salir') }] : []),
    {
      label: 'Copiar enlace',
      onClick: () => {
        void navigator.clipboard?.writeText(window.location.href)
        snackbar('Enlace copiado')
      },
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[935px] pb-10">
      <ScreenHeader
        title={a.titulo}
        onBack={() => navigate(-1)}
        action={<IconButton icon="more_horiz" label="Opciones del álbum" onClick={() => setMenu(true)} />}
      />

      {/* Encabezado */}
      <section className="flex flex-col gap-5 px-4 pt-5 md:flex-row md:items-start md:gap-10 md:px-8 md:pt-8">
        <div className="mx-auto aspect-square w-full max-w-[260px] shrink-0 overflow-hidden rounded-xs bg-tertiary-container text-on-tertiary-container md:mx-0 md:w-[220px]">
          {portada ? (
            <img src={portada} alt={`Portada de ${a.titulo}`} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center">
              <Icon name="photo_album" size={64} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="type-label-m flex items-center gap-1 text-primary uppercase">
            <Icon name="group" size={16} fill /> Álbum compartido
          </p>
          <h1 className="type-headline-l emphasized mt-1 break-words">{a.titulo}</h1>
          {a.descripcion && <p className="type-body-l mt-2 whitespace-pre-line">{a.descripcion}</p>}
          <p className="type-body-m mt-2 text-on-surface-variant">
            Creado el {fechaLarga(a.fecha_creacion)}
            {creador && (
              <>
                {' '}
                por{' '}
                <Link to={`/${creador.username}`} className="font-semibold text-on-surface">
                  @{creador.username}
                </Link>
              </>
            )}
          </p>
          <button type="button" onClick={() => setParticipantes(true)} className="state mt-3 -ml-2 flex items-center gap-3 rounded-full py-1 pr-3 pl-2">
            <AvatarStack usuarios={aceptados} max={4} size={28} />
            <span className="type-label-l">
              {aceptados.length === 1 ? 'Solo vos' : `${aceptados.length} participantes`}
              {a.miembros.length > aceptados.length && (
                <span className="text-on-surface-variant"> · {a.miembros.length - aceptados.length} invitados</span>
              )}
            </span>
          </button>
          <p className="type-body-s mt-1 text-on-surface-variant">{contarMedia(lista)}</p>

          {pendiente ? (
            <div className="mt-4 rounded-lg bg-primary-container p-4 text-on-primary-container">
              <p className="type-title-s emphasized">{creador ? `@${creador.username} te invitó a este álbum` : 'Te invitaron a este álbum'}</p>
              <p className="type-body-m mt-1">Si aceptás, vas a poder ver y subir fotos y videos.</p>
              <ButtonGroup className="mt-3">
                <Button onClick={() => void responder(true)}>Aceptar</Button>
                <Button variant="tonal" onClick={() => void responder(false)}>
                  Rechazar
                </Button>
              </ButtonGroup>
            </div>
          ) : (
            (esMiembro || esAdmin) && (
              <ButtonGroup className="mt-4">
                <Button icon="add_photo_alternate" onClick={() => setSubir(true)}>
                  Agregar fotos o videos
                </Button>
                {esAdmin && (
                  <Button variant="tonal" icon="person_add" onClick={() => setInvitar(true)}>
                    Invitar
                  </Button>
                )}
              </ButtonGroup>
            )
          )}
        </div>
      </section>

      {/* Contenido */}
      <section className="mt-8 border-t border-outline-variant/60 pt-1 md:mx-8" aria-label="Contenido del álbum">
        <div className="flex items-center justify-between px-4 py-3 md:px-0">
          <h2 className="type-title-m emphasized">Fotos y videos</h2>
          {autores.size > 1 && <span className="type-body-s text-on-surface-variant">De {autores.size} personas</span>}
        </div>
        {items.error ? (
          <ErrorState error={items.error} onRetry={items.reload} />
        ) : items.loading && !items.data ? (
          <CenteredLoader />
        ) : lista.length === 0 ? (
          <EmptyState
            icon="add_photo_alternate"
            title="Todavía no hay fotos"
            text={esMiembro ? 'Sé el primero en subir algo. Todos los participantes van a verlo.' : 'Cuando los participantes suban algo, aparece acá.'}
            action={
              esMiembro ? (
                <Button icon="add" onClick={() => setSubir(true)}>
                  Agregar fotos o videos
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-3" style={{ gap: 'var(--grid-gap)' }}>
            {lista.map((it) => (
              <ItemTile key={it.id} item={it} miembros={a.miembros} onOpen={() => setVisor(it)} />
            ))}
          </div>
        )}
      </section>

      <ActionMenu open={menu} onClose={() => setMenu(false)} actions={acciones} />
      <Confirm
        open={confirm === 'borrar'}
        title="¿Eliminar el álbum?"
        text="Se borran el álbum y todo su contenido para todos los participantes. No se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          void albumsApi
            .borrarAlbum(a.id)
            .then(() => {
              snackbar('Álbum eliminado')
              navigate(`/${yo.username}/albumes`, { replace: true })
            })
            .catch((e: unknown) => snackbar(mensajeDeError(e)))
        }
      />
      <Confirm
        open={confirm === 'salir'}
        title="¿Salir del álbum?"
        text="Lo que subiste se queda en el álbum. Vas a necesitar una nueva invitación para volver."
        confirmLabel="Salir"
        destructive
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          void albumsApi
            .quitarMiembro(a.id, yo.id)
            .then(() => {
              snackbar('Saliste del álbum')
              navigate(`/${yo.username}/albumes`, { replace: true })
            })
            .catch((e: unknown) => snackbar(mensajeDeError(e)))
        }
      />
      <ParticipantsSheet
        open={participantes}
        onClose={() => setParticipantes(false)}
        album={a}
        esAdmin={esAdmin}
        onChange={() => album.reload()}
        onInvite={() => {
          setParticipantes(false)
          setInvitar(true)
        }}
      />
      {invitar && <InviteDialog album={a} onClose={() => setInvitar(false)} onDone={setAlbum} />}
      {subir && <UploadDialog albumId={a.id} onClose={() => setSubir(false)} onUploaded={(it) => items.setData((p) => [it, ...(p ?? [])])} />}
      {editar && <EditDialog album={a} items={lista} onClose={() => setEditar(false)} onSaved={setAlbum} />}
      {visor && (
        <ItemViewer
          item={visor}
          miembros={a.miembros}
          puedeBorrar={visor.usuario_id === yo.id || esAdmin}
          onClose={() => setVisor(null)}
          onDeleted={() => {
            items.setData((p) => (p ?? []).filter((x) => x.id !== visor.id))
            setVisor(null)
          }}
        />
      )}
    </div>
  )
}

function ItemTile({ item, miembros, onOpen }: { item: AlbumItem; miembros: UsuarioResumen[]; onOpen: () => void }) {
  const autor = useAutor(item.usuario_id, miembros)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block aspect-square overflow-hidden rounded-xs bg-surface-container-highest"
      aria-label={`${item.tipo === 'video' ? 'Video' : 'Foto'} de ${autor?.username ?? 'un participante'}`}
    >
      <img src={item.url_imagen} alt={item.descripcion ?? ''} loading="lazy" className="size-full object-cover" />
      {item.tipo === 'video' && (
        <span className="absolute top-2 right-2 text-white drop-shadow">
          <Icon name="play_arrow" fill size={22} />
        </span>
      )}
      {autor && (
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/45 py-0.5 pr-2 pl-0.5 text-white type-label-s">
          <Avatar username={autor.username} size={18} alt="" />
          <span className="max-w-[80px] truncate">{autor.username}</span>
        </span>
      )}
    </button>
  )
}

function ItemViewer({
  item,
  miembros,
  puedeBorrar,
  onClose,
  onDeleted,
}: {
  item: AlbumItem
  miembros: UsuarioResumen[]
  puedeBorrar: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const autor = useAutor(item.usuario_id, miembros)
  const [confirm, setConfirm] = useState(false)
  return (
    <Dialog open onClose={onClose} title={item.tipo === 'video' ? 'Video' : 'Foto'} width={720} fullscreenMobile>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3">
          {autor && <Avatar username={autor.username} size={32} />}
          <div className="min-w-0 flex-1">
            {autor && (
              <Link to={`/${autor.username}`} className="type-label-l emphasized">
                {autor.username}
              </Link>
            )}
            <p className="type-body-s text-on-surface-variant">{tiempoLargo(item.fecha)}</p>
          </div>
          {puedeBorrar && <IconButton icon="delete" label="Quitar del álbum" onClick={() => setConfirm(true)} />}
        </div>
        <div className="flex items-center justify-center bg-black">
          {item.tipo === 'video' && item.url_video ? (
            <video src={item.url_video} poster={item.url_imagen} controls playsInline className="max-h-[70dvh] w-full" />
          ) : (
            <img src={item.url_imagen} alt={item.descripcion ?? `Foto de ${autor?.username ?? 'un participante'}`} className="max-h-[70dvh] w-full object-contain" />
          )}
        </div>
        {item.descripcion && <p className="type-body-m px-4 py-3">{item.descripcion}</p>}
      </div>
      <Confirm
        open={confirm}
        title="¿Quitar del álbum?"
        text="Se borra para todos los participantes."
        confirmLabel="Quitar"
        destructive
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          void albumsApi
            .borrarItem(item.album_id, item.id)
            .then(() => {
              snackbar('Quitado del álbum')
              onDeleted()
            })
            .catch((e: unknown) => snackbar(mensajeDeError(e)))
        }
      />
    </Dialog>
  )
}

function ParticipantsSheet({
  open,
  onClose,
  album,
  esAdmin,
  onChange,
  onInvite,
}: {
  open: boolean
  onClose: () => void
  album: Album
  esAdmin: boolean
  onChange: () => void
  onInvite: () => void
}) {
  const yo = useYo()
  const [quitar, setQuitar] = useState<AlbumMiembro | null>(null)
  const orden = [...album.miembros].sort((x, y) => Number(x.estado === 'pendiente') - Number(y.estado === 'pendiente') || Number(y.rol === 'admin') - Number(x.rol === 'admin'))
  return (
    <Sheet open={open} onClose={onClose} title="Participantes">
      <ul className="py-2">
        {esAdmin && (
          <li>
            <button type="button" onClick={onInvite} className="state flex w-full items-center gap-3 px-4 py-2 text-left">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <Icon name="person_add" />
              </span>
              <span className="type-label-l">Invitar amigos</span>
            </button>
          </li>
        )}
        {orden.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-2">
            <Link to={`/${m.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar username={m.username} size={44} />
              <span className="min-w-0">
                <span className="type-label-l emphasized block truncate">
                  {m.username}
                  {m.id === yo.id && <span className="font-normal text-on-surface-variant"> (vos)</span>}
                </span>
                <span className="type-body-s block text-on-surface-variant">
                  {m.estado === 'pendiente' ? 'Invitación pendiente' : m.rol === 'admin' ? 'Admin' : 'Miembro'}
                </span>
              </span>
            </Link>
            {m.rol === 'admin' && m.estado === 'aceptado' && (
              <span className="inline-flex h-6 items-center rounded-sm bg-tertiary-container px-2 text-on-tertiary-container type-label-s">Admin</span>
            )}
            {esAdmin && m.id !== yo.id && (
              <Button size="xs" variant="outlined" onClick={() => setQuitar(m)}>
                {m.estado === 'pendiente' ? 'Cancelar' : 'Quitar'}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Confirm
        open={quitar !== null}
        title={quitar?.estado === 'pendiente' ? `¿Cancelar la invitación a ${quitar.username}?` : `¿Quitar a ${quitar?.username ?? ''}?`}
        text="Su contenido se queda en el álbum."
        confirmLabel={quitar?.estado === 'pendiente' ? 'Cancelar invitación' : 'Quitar'}
        destructive
        onClose={() => setQuitar(null)}
        onConfirm={() => {
          if (!quitar) return
          void albumsApi
            .quitarMiembro(album.id, quitar.id)
            .then(() => {
              snackbar('Listo')
              onChange()
            })
            .catch((e: unknown) => snackbar(mensajeDeError(e)))
        }}
      />
    </Sheet>
  )
}

function InviteDialog({ album, onClose, onDone }: { album: Album; onClose: () => void; onDone: (a: Album) => void }) {
  const [elegidos, setElegidos] = useState<UsuarioResumen[]>([])
  const [enviando, setEnviando] = useState(false)
  const enviar = async () => {
    setEnviando(true)
    let ultimo: Album | null = null
    const errores: string[] = []
    for (const u of elegidos) {
      try {
        ultimo = await albumsApi.invitar(album.id, u.id)
      } catch (e) {
        errores.push(`${u.username}: ${mensajeDeError(e)}`)
      }
    }
    if (ultimo) onDone(ultimo)
    snackbar(errores.length ? errores.join(' · ') : elegidos.length === 1 ? 'Invitación enviada' : 'Invitaciones enviadas')
    onClose()
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Invitar al álbum"
      width={480}
      fullscreenMobile
      actions={
        <Button disabled={!elegidos.length || enviando} onClick={() => void enviar()}>
          Invitar{elegidos.length ? ` (${elegidos.length})` : ''}
        </Button>
      }
    >
      <div className="p-4">
        <FriendPicker value={elegidos} onChange={setElegidos} excluir={album.miembros.map((m) => m.id)} />
      </div>
    </Dialog>
  )
}

function UploadDialog({ albumId, onClose, onUploaded }: { albumId: number; onClose: () => void; onUploaded: (it: AlbumItem) => void }) {
  const [media, setMedia] = useState<MediaElegida | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [subidos, setSubidos] = useState(0)
  const isMobile = useIsMobile()
  const subir = async (seguir: boolean) => {
    if (!media) return
    setSubiendo(true)
    try {
      const it = await albumsApi.subirItem(albumId, {
        url_imagen: media.url_imagen,
        descripcion: descripcion.trim() || null,
        tipo: media.tipo,
        url_video: media.url_video,
      })
      onUploaded(it)
      setSubidos((n) => n + 1)
      setMedia(null)
      setDescripcion('')
      if (!seguir) {
        snackbar('Agregado al álbum')
        onClose()
      }
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setSubiendo(false)
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Agregar fotos o videos"
      width={520}
      fullscreenMobile
      actions={
        <>
          <Button variant="text" disabled={!media || subiendo} onClick={() => void subir(true)}>
            Subir y agregar otro
          </Button>
          <Button disabled={!media || subiendo} onClick={() => void subir(false)}>
            Subir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        {subidos > 0 && (
          <p className="type-body-m flex items-center gap-2 text-primary">
            <Icon name="check_circle" fill size={18} /> {subidos} {subidos === 1 ? 'subido' : 'subidos'}
          </p>
        )}
        <div className={isMobile ? '' : 'mx-auto w-full max-w-[360px]'}>
          <MediaPicker accept="ambos" value={media} onChange={setMedia} aspect="1 / 1" />
        </div>
        <TextField label="Descripción (opcional)" value={descripcion} onChange={setDescripcion} maxLength={300} />
      </div>
    </Dialog>
  )
}

function EditDialog({ album, items, onClose, onSaved }: { album: Album; items: AlbumItem[]; onClose: () => void; onSaved: (a: Album) => void }) {
  const [titulo, setTitulo] = useState(album.titulo)
  const [descripcion, setDescripcion] = useState(album.descripcion ?? '')
  const [portada, setPortada] = useState<string | null>(album.portada_url)
  const [guardando, setGuardando] = useState(false)
  const guardar = async () => {
    setGuardando(true)
    try {
      onSaved(await albumsApi.editarAlbum(album.id, { titulo: titulo.trim(), descripcion: descripcion.trim() || null, portada_url: portada }))
      snackbar('Álbum actualizado')
      onClose()
    } catch (e) {
      snackbar(mensajeDeError(e))
      setGuardando(false)
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Editar álbum"
      width={520}
      fullscreenMobile
      actions={
        <Button disabled={!titulo.trim() || guardando} onClick={() => void guardar()}>
          Guardar
        </Button>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <TextField label="Nombre del álbum" value={titulo} onChange={setTitulo} maxLength={60} />
        <TextField label="Descripción" value={descripcion} onChange={setDescripcion} maxLength={500} multiline />
        <div>
          <p className="type-label-l mb-2">Portada</p>
          {items.length === 0 ? (
            <p className="type-body-m text-on-surface-variant">Subí fotos para elegir una portada.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              {items
                .filter((i) => i.tipo !== 'video')
                .slice(0, 12)
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    aria-pressed={portada === i.url_imagen}
                    aria-label="Usar como portada"
                    onClick={() => setPortada(i.url_imagen)}
                    className="relative aspect-square overflow-hidden rounded-xs"
                  >
                    <img src={i.url_imagen} alt="" className="size-full object-cover" />
                    {portada === i.url_imagen && (
                      <span className="absolute inset-0 flex items-center justify-center bg-primary/40 text-on-primary">
                        <Icon name="check_circle" fill size={28} />
                      </span>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
