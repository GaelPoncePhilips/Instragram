import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ScreenHeader } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/hooks'
import * as albumsApi from '../../services/albums'
import { mensajeDeError } from '../../services/client'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { UsuarioResumen } from '../../types/api'
import { MediaPicker, type MediaElegida } from '../create/MediaPicker'
import { AvatarStack } from './common'
import { FriendPicker } from './FriendPicker'

const PASOS = [
  { titulo: 'Poné un nombre', sub: 'Así lo van a ver todos los participantes.' },
  { titulo: 'Elegí una portada', sub: 'Opcional: si no elegís, se usa la primera foto que suban.' },
  { titulo: 'Invitá a tus amigos', sub: 'Van a recibir una invitación para unirse.' },
  { titulo: 'Todo listo', sub: 'Revisá y creá el álbum.' },
] as const

/** Crear álbum en 4 pasos: nombre y descripción → portada → amigos → resumen "Crear e invitar". */
export function CreateAlbumPage() {
  const yo = useYo()
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [portada, setPortada] = useState<MediaElegida | null>(null)
  const [amigos, setAmigos] = useState<UsuarioResumen[]>([])
  const [creando, setCreando] = useState(false)

  const puedeSeguir = paso !== 0 || titulo.trim().length > 0
  const atras = () => (paso === 0 ? navigate(-1) : setPaso(paso - 1))

  const crear = async () => {
    setCreando(true)
    try {
      const album = await albumsApi.crearAlbum({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        portada_url: portada?.url_imagen ?? null,
      })
      const res = await Promise.allSettled(amigos.map((a) => albumsApi.invitar(album.id, a.id)))
      const fallidas = res.filter((r) => r.status === 'rejected').length
      snackbar(
        fallidas
          ? `Álbum creado. ${fallidas} ${fallidas === 1 ? 'invitación no se pudo enviar' : 'invitaciones no se pudieron enviar'}`
          : amigos.length
            ? `Álbum creado e ${amigos.length === 1 ? 'invitación enviada' : 'invitaciones enviadas'}`
            : 'Álbum creado',
      )
      navigate(`/albumes/${album.id}`, { replace: true })
    } catch (e) {
      snackbar(mensajeDeError(e))
      setCreando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--nav-h))] w-full max-w-[560px] flex-col md:min-h-dvh md:py-6">
      <ScreenHeader title="Nuevo álbum compartido" onBack={atras} />
      {/* Progreso segmentado (sin números de paso) */}
      <div className="flex gap-1.5 px-4 pt-4" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={paso + 1} aria-label="Progreso">
        {PASOS.map((p, i) => (
          <span key={p.titulo} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
            <span className={cn('block h-full rounded-full bg-primary transition-all spring-spatial', i <= paso ? 'w-full' : 'w-0')} />
          </span>
        ))}
      </div>
      <div key={paso} className="anim-fade-in flex-1 px-4 pt-6 pb-4">
        <h2 className="type-headline-m emphasized">{PASOS[paso].titulo}</h2>
        <p className="type-body-m mt-1 mb-6 text-on-surface-variant">{PASOS[paso].sub}</p>

        {paso === 0 && (
          <div className="flex flex-col gap-4">
            <TextField label="Nombre del álbum" value={titulo} onChange={setTitulo} maxLength={60} autoFocus />
            <TextField label="Descripción (opcional)" value={descripcion} onChange={setDescripcion} maxLength={500} multiline />
          </div>
        )}

        {paso === 1 && (
          <div className="mx-auto max-w-[360px]">
            <MediaPicker accept="foto" value={portada} onChange={setPortada} aspect="1 / 1" />
          </div>
        )}

        {paso === 2 && <FriendPicker value={amigos} onChange={setAmigos} />}

        {paso === 3 && (
          <div className="flex flex-col gap-5">
            <div className="flex gap-4">
              <div className="size-28 shrink-0 overflow-hidden rounded-xs bg-tertiary-container text-on-tertiary-container">
                {portada ? (
                  <img src={portada.url_imagen} alt="Portada elegida" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    <Icon name="photo_album" size={40} />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="type-title-l emphasized break-words">{titulo}</p>
                {descripcion && <p className="type-body-m mt-1 text-on-surface-variant">{descripcion}</p>}
                <p className="type-body-s mt-2 text-on-surface-variant">Vos vas a ser admin del álbum.</p>
              </div>
            </div>
            <div className="rounded-lg bg-surface-container p-4">
              <p className="type-label-l mb-3">
                {amigos.length ? `Vas a invitar a ${amigos.length} ${amigos.length === 1 ? 'persona' : 'personas'}` : 'Sin invitados por ahora'}
              </p>
              {amigos.length > 0 ? (
                <div className="flex items-center gap-3">
                  <AvatarStack usuarios={[yo, ...amigos]} max={6} size={32} />
                  <span className="type-body-m min-w-0 truncate text-on-surface-variant">{amigos.map((a) => a.username).join(', ')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar username={yo.username} size={32} />
                  <span className="type-body-m text-on-surface-variant">Podés invitar más tarde desde el álbum.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="sticky bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] flex gap-3 border-t border-outline-variant/60 bg-surface px-4 py-3 md:bottom-0">
        {paso === 1 && !portada && (
          <Button variant="text" onClick={() => setPaso(2)}>
            Omitir
          </Button>
        )}
        <span className="flex-1" />
        {paso < 3 ? (
          <Button size="md" disabled={!puedeSeguir} onClick={() => setPaso(paso + 1)}>
            Siguiente
          </Button>
        ) : (
          <Button size="md" icon="group_add" disabled={creando} onClick={() => void crear()}>
            {amigos.length ? 'Crear e invitar' : 'Crear álbum'}
          </Button>
        )}
      </div>
    </div>
  )
}
