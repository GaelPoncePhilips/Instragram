// TEMPORAL (hueco 4): selector de archivo que genera una URL de objeto, o una imagen/video de muestra.
import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { VIDEOS } from '../../mocks/seed'
import { urlAleatoria, urlDeArchivo } from '../../services/temporal/local'

export type TipoMedia = 'foto' | 'video'

export interface MediaElegida {
  /** URL de la imagen (o portada si es video). */
  url_imagen: string
  /** URL del video si tipo === 'video'. */
  url_video: string | null
  tipo: TipoMedia
  /** Duración en segundos si es video (si se pudo leer). */
  duracion_seg: number | null
}

/** Lee duración y captura un frame como portada. Si falla, devuelve portada aleatoria. */
function analizarVideo(url: string): Promise<{ duracion: number | null; portada: string }> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.muted = true
    v.preload = 'auto'
    v.playsInline = true
    let listo = false
    let timer = 0
    const fin = (duracion: number | null, portada: string) => {
      if (listo) return
      listo = true
      window.clearTimeout(timer)
      v.removeAttribute('src')
      v.load()
      resolve({ duracion, portada })
    }
    timer = window.setTimeout(() => fin(Number.isFinite(v.duration) ? Math.round(v.duration) : null, urlAleatoria(1080, 1920)), 6000)
    v.onerror = () => fin(null, urlAleatoria(1080, 1920))
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(0.5, (v.duration || 1) / 2)
    }
    v.onseeked = () => {
      const dur = Number.isFinite(v.duration) ? Math.round(v.duration) : null
      try {
        const c = document.createElement('canvas')
        c.width = Math.min(v.videoWidth || 540, 720)
        c.height = Math.round(c.width * ((v.videoHeight || 960) / (v.videoWidth || 540)))
        c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height)
        fin(dur, c.toDataURL('image/jpeg', 0.8))
      } catch {
        fin(dur, urlAleatoria(1080, 1920))
      }
    }
    v.src = url
  })
}

/**
 * TEMPORAL (hueco 4): selector de archivo que genera una URL de objeto, o una imagen/video de muestra.
 * accept: 'foto' | 'video' | 'ambos'. aspect: proporción de la vista previa (CSS aspect-ratio).
 */
export function MediaPicker({
  accept,
  value,
  onChange,
  aspect = '1 / 1',
}: {
  accept: 'foto' | 'video' | 'ambos'
  value: MediaElegida | null
  onChange: (m: MediaElegida | null) => void
  aspect?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cargando, setCargando] = useState(false)
  const mime = accept === 'foto' ? 'image/*' : accept === 'video' ? 'video/*' : 'image/*,video/*'

  const elegirArchivo = async (file: File) => {
    const url = urlDeArchivo(file)
    if (file.type.startsWith('video/')) {
      setCargando(true)
      const { duracion, portada } = await analizarVideo(url)
      setCargando(false)
      onChange({ tipo: 'video', url_imagen: portada, url_video: url, duracion_seg: duracion })
    } else {
      onChange({ tipo: 'foto', url_imagen: url, url_video: null, duracion_seg: null })
    }
  }

  const muestra = () => {
    if (accept === 'foto') {
      onChange({ tipo: 'foto', url_imagen: urlAleatoria(1080, 1080), url_video: null, duracion_seg: null })
      return
    }
    const lista = Object.values(VIDEOS)
    onChange({
      tipo: 'video',
      url_imagen: urlAleatoria(1080, 1920),
      url_video: lista[Math.floor(Math.random() * lista.length)],
      duracion_seg: 10,
    })
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-surface-container-high" style={{ aspectRatio: aspect }}>
      {value ? (
        <>
          {value.tipo === 'video' && value.url_video ? (
            <video src={value.url_video} poster={value.url_imagen} muted loop autoPlay playsInline className="size-full object-cover" />
          ) : (
            <img src={value.url_imagen} alt="Vista previa de lo elegido" className="size-full object-cover" />
          )}
          <IconButton
            icon="close"
            label="Quitar"
            variant="filled"
            size={20}
            className="absolute top-2 right-2"
            onClick={() => onChange(null)}
          />
        </>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center">
          <Icon name={accept === 'video' ? 'movie' : 'add_photo_alternate'} size={48} className="text-on-surface-variant" />
          <p className="type-title-m">{accept === 'video' ? 'Elegí un video' : 'Elegí una foto o video'}</p>
          <input
            ref={inputRef}
            type="file"
            accept={mime}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void elegirArchivo(f)
            }}
          />
          <Button icon="upload" disabled={cargando} onClick={() => inputRef.current?.click()}>
            {cargando ? 'Procesando…' : 'Desde tu dispositivo'}
          </Button>
          <Button variant="tonal" disabled={cargando} onClick={muestra}>
            Usar una de muestra
          </Button>
        </div>
      )}
    </div>
  )
}
