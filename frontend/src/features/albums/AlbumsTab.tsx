import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ButtonGroup } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { cn, useAsync } from '../../lib/hooks'
import * as albumsApi from '../../services/albums'
import { mensajeDeError } from '../../services/client'
import { useBadges } from '../../stores/badges'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Album, AlbumItem } from '../../types/api'
import { AvatarStack, contarMedia, miembrosAceptados } from './common'

interface AlbumConItems {
  album: Album
  items: AlbumItem[]
  pendiente: boolean
}

async function cargar(usuarioId: number, esPropio: boolean): Promise<AlbumConItems[]> {
  const [albums, invitaciones] = await Promise.all([
    albumsApi.albumsDeUsuario(usuarioId),
    esPropio ? albumsApi.invitacionesAlbum(usuarioId) : Promise.resolve<Album[]>([]),
  ])
  const todos = [...invitaciones.map((a) => ({ a, pendiente: true })), ...albums.map((a) => ({ a, pendiente: false }))]
  return Promise.all(
    todos.map(async ({ a, pendiente }) => ({
      album: a,
      pendiente,
      items: await albumsApi.itemsDeAlbum(a.id).catch(() => [] as AlbumItem[]),
    })),
  )
}

/** Pestaña Álbumes del perfil: portadas cuadradas, 2 columnas en móvil y 3 en escritorio. */
export function AlbumsTab({ usuarioId, esPropio }: { usuarioId: number; esPropio: boolean }) {
  const { data, error, loading, reload, setData } = useAsync(() => cargar(usuarioId, esPropio), [usuarioId, esPropio])
  const navigate = useNavigate()

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading && !data)
    return (
      <div className="grid grid-cols-2 gap-3 pt-3 md:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-xs bg-surface-container-high" />
        ))}
      </div>
    )
  const lista = data ?? []

  return (
    <div className="pt-3">
      {lista.length === 0 ? (
        <EmptyState
          icon="photo_album"
          title={esPropio ? 'Álbumes compartidos' : 'Sin álbumes'}
          text={
            esPropio
              ? 'Creá un álbum e invitá a tus amigos: todos suben fotos y videos al mismo lugar.'
              : 'Cuando participe en álbumes compartidos, vas a verlos acá.'
          }
          action={
            esPropio ? (
              <Button icon="add" onClick={() => navigate('/albumes/nuevo')}>
                Nuevo álbum
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3">
          {lista.map((x) => (
            <li key={x.album.id}>
              <AlbumCard
                {...x}
                onRespondida={(aceptada) =>
                  setData((prev) =>
                    (prev ?? [])
                      .map((y) => (y.album.id === x.album.id ? { ...y, pendiente: false } : y))
                      .filter((y) => y.album.id !== x.album.id || aceptada),
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AlbumCard({ album, items, pendiente, onRespondida }: AlbumConItems & { onRespondida: (aceptada: boolean) => void }) {
  const yo = useYo()
  const [busy, setBusy] = useState(false)
  const miembros = miembrosAceptados(album)
  const portada = album.portada_url ?? items[0]?.url_imagen ?? null

  const responder = async (aceptar: boolean) => {
    setBusy(true)
    try {
      if (aceptar) await albumsApi.aceptarInvitacion(album.id)
      else await albumsApi.quitarMiembro(album.id, yo.id)
      snackbar(aceptar ? `Te uniste a «${album.titulo}»` : 'Invitación rechazada')
      onRespondida(aceptar)
      void useBadges.getState().refrescar()
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Link
        to={`/albumes/${album.id}`}
        className={cn('group relative block aspect-square overflow-hidden rounded-xs bg-surface-container-high', pendiente && 'ring-2 ring-primary ring-offset-2 ring-offset-surface')}
        aria-label={`Álbum ${album.titulo}`}
      >
        {portada ? (
          <img src={portada} alt="" loading="lazy" className="size-full object-cover transition-transform spring-spatial group-hover:scale-[1.03]" />
        ) : (
          <span className="flex size-full items-center justify-center bg-tertiary-container text-on-tertiary-container">
            <Icon name="photo_album" size={48} />
          </span>
        )}
        {pendiente && (
          <span className="absolute top-2 left-2 inline-flex h-7 items-center gap-1 rounded-sm bg-primary px-2 text-on-primary type-label-m">
            <Icon name="mail" size={16} fill />
            Invitación
          </span>
        )}
        {items.some((i) => i.tipo === 'video') && (
          <span className="absolute top-2 right-2 text-white drop-shadow">
            <Icon name="movie" fill size={20} />
          </span>
        )}
      </Link>
      <div className="mt-2 px-0.5">
        <Link to={`/albumes/${album.id}`} className="type-title-s emphasized block truncate">
          {album.titulo}
        </Link>
        <p className="type-body-s text-on-surface-variant">
          {miembros.length} {miembros.length === 1 ? 'miembro' : 'miembros'} · {contarMedia(items)}
        </p>
        <div className="mt-1.5">
          <AvatarStack usuarios={miembros} max={3} size={22} />
        </div>
        {pendiente && (
          <ButtonGroup className="mt-2">
            <Button size="xs" disabled={busy} onClick={() => void responder(true)} className="flex-1">
              Aceptar
            </Button>
            <Button size="xs" variant="tonal" disabled={busy} onClick={() => void responder(false)} className="flex-1">
              Rechazar
            </Button>
          </ButtonGroup>
        )}
      </div>
    </div>
  )
}
