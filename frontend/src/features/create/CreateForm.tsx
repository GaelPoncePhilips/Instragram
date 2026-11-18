import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ScreenHeader } from '../../components/shared'
import { TextField } from '../../components/ui/Controls'
import { useIsMobile } from '../../lib/hooks'
import { mensajeDeError } from '../../services/client'
import { crearPost } from '../../services/posts'
import { snackbar } from '../../stores/ui'
import { MediaPicker, type MediaElegida } from './MediaPicker'

/** Formulario común de "Nueva publicación" y "Nuevo reel". */
export function CreateForm({
  tipo,
  titulo,
  destino,
  mensaje,
}: {
  tipo: 'foto' | 'reel'
  titulo: string
  destino: string
  mensaje: string
}) {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const [media, setMedia] = useState<MediaElegida | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const compartir = async () => {
    if (!media || enviando) return
    setEnviando(true)
    try {
      const descripcion = texto.trim() || null
      await crearPost(
        tipo === 'foto'
          ? { tipo: 'foto', url_imagen: media.url_imagen, descripcion }
          : {
              tipo: 'reel',
              url_imagen: media.url_imagen,
              url_video: media.url_video,
              duracion_seg: media.duracion_seg,
              descripcion,
            },
      )
      snackbar(mensaje)
      navigate(destino)
    } catch (e) {
      snackbar(mensajeDeError(e))
      setEnviando(false)
    }
  }

  const puede = !!media && !enviando
  return (
    <div>
      <ScreenHeader
        title={titulo}
        onBack={mobile ? () => navigate(-1) : undefined}
        action={
          <button
            type="button"
            disabled={!puede}
            onClick={() => void compartir()}
            className="state h-10 rounded-full px-3 type-label-l emphasized text-primary disabled:text-on-surface/40"
          >
            {enviando ? 'Enviando…' : 'Compartir'}
          </button>
        }
      />
      <div className="mx-auto grid max-w-[900px] gap-4 p-4 lg:grid-cols-2 lg:gap-8 lg:py-8">
        <div className={tipo === 'reel' ? 'mx-auto w-full max-w-[360px] lg:max-w-none' : undefined}>
          <MediaPicker accept={tipo === 'foto' ? 'foto' : 'video'} aspect={tipo === 'foto' ? '1 / 1' : '9 / 16'} value={media} onChange={setMedia} />
        </div>
        <div>
          <TextField label="Escribí una descripción…" value={texto} onChange={setTexto} multiline maxLength={2200} hint="Los #hashtags se detectan solos" />
        </div>
      </div>
    </div>
  )
}
