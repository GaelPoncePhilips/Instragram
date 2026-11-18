/** Crear / editar una destacada (EXTRA). */
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Controls'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { IconButton } from '../../components/ui/IconButton'
import { Dialog } from '../../components/ui/Overlay'
import { cn, useAsync } from '../../lib/hooks'
import { mensajeDeError } from '../../services/client'
import * as storiesApi from '../../services/stories'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Destacada, Story } from '../../types/api'
import { fechaStory, StoryPickGrid } from './StoryPickGrid'

export function HighlightEditor({
  open,
  onClose,
  destacada,
  seleccionInicial = [],
  onSaved,
}: {
  open: boolean
  onClose: () => void
  /** Si viene, modo edición. */
  destacada?: Destacada
  seleccionInicial?: number[]
  onSaved: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title={destacada ? 'Editar destacada' : 'Nueva destacada'} width={560} fullscreenMobile>
      {open &&
        (destacada ? (
          <Editar d={destacada} onSaved={onSaved} onClose={onClose} />
        ) : (
          <Crear inicial={seleccionInicial} onSaved={onSaved} onClose={onClose} />
        ))}
    </Dialog>
  )
}

function Portadas({ stories, portada, onPick }: { stories: Story[]; portada: string | null; onPick: (u: string) => void }) {
  if (stories.length === 0) return null
  return (
    <div>
      <p className="type-label-l mb-2">Portada</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {stories.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.url_imagen)}
            aria-pressed={portada === s.url_imagen}
            aria-label="Usar como portada"
            className={cn('size-16 shrink-0 overflow-hidden rounded-full border-2', portada === s.url_imagen ? 'border-primary' : 'border-transparent')}
          >
            <img src={s.url_imagen} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}

function Crear({ inicial, onSaved, onClose }: { inicial: number[]; onSaved: () => void; onClose: () => void }) {
  const yo = useYo()
  const archivo = useAsync(() => storiesApi.archivoStories(yo.id), [yo.id])
  const [sel, setSel] = useState<number[]>(inicial)
  const [titulo, setTitulo] = useState('Destacadas')
  const [portada, setPortada] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const elegidas = sel.map((id) => archivo.data?.find((s) => s.id === id)).filter((s): s is Story => !!s)
  const portadaEf = portada && elegidas.some((s) => s.url_imagen === portada) ? portada : (elegidas[0]?.url_imagen ?? null)

  const guardar = async () => {
    setBusy(true)
    try {
      await storiesApi.crearDestacada({ titulo: titulo.trim(), portada_url: portadaEf, story_ids: sel })
      snackbar('Destacada creada')
      onSaved()
      onClose()
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }

  const stories = archivo.data ?? []
  return (
    <div className="flex flex-col gap-4 p-4">
      <TextField label="Título" value={titulo} onChange={setTitulo} maxLength={30} />
      <Portadas stories={elegidas} portada={portadaEf} onPick={setPortada} />
      <div className="flex items-center justify-between">
        <p className="type-label-l">Elegí stories ({sel.length})</p>
        <Button disabled={busy || sel.length === 0 || !titulo.trim()} onClick={() => void guardar()}>
          Crear
        </Button>
      </div>
      {archivo.loading ? (
        <CenteredLoader />
      ) : archivo.error ? (
        <ErrorState error={archivo.error} onRetry={archivo.reload} />
      ) : stories.length === 0 ? (
        <EmptyState icon="history" title="Tu archivo está vacío" text="Las stories que publiques se guardan acá." />
      ) : (
        <StoryPickGrid
          stories={stories}
          seleccion={sel}
          onClick={(s) => setSel((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))}
        />
      )}
    </div>
  )
}

function Editar({ d, onSaved, onClose }: { d: Destacada; onSaved: () => void; onClose: () => void }) {
  const yo = useYo()
  const [stories, setStories] = useState<Story[]>(d.stories)
  const [titulo, setTitulo] = useState(d.titulo)
  const [portada, setPortada] = useState<string | null>(d.portada_url)
  const [agregando, setAgregando] = useState(false)
  const [busy, setBusy] = useState(false)
  const archivo = useAsync(() => (agregando ? storiesApi.archivoStories(yo.id) : Promise.resolve<Story[]>([])), [agregando, yo.id])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      onSaved()
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }

  const mover = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= stories.length) return
    const nuevas = [...stories]
    const tmp = nuevas[i]
    nuevas[i] = nuevas[j]
    nuevas[j] = tmp
    void run(async () => {
      await storiesApi.ordenarStoriesDeDestacada(
        d.id,
        nuevas.map((s) => s.id),
      )
      setStories(nuevas)
    })
  }
  const quitar = (s: Story) => {
    if (stories.length <= 1) {
      snackbar('Una destacada necesita al menos una story')
      return
    }
    void run(async () => {
      await storiesApi.quitarStoryDeDestacada(d.id, s.id)
      setStories((p) => p.filter((x) => x.id !== s.id))
    })
  }
  const agregar = (s: Story) => {
    void run(async () => {
      await storiesApi.agregarStoryADestacada(d.id, s.id)
      setStories((p) => [...p, s])
    })
  }
  const guardar = () => {
    void run(async () => {
      await storiesApi.editarDestacada(d.id, { titulo: titulo.trim(), portada_url: portada })
      snackbar('Destacada actualizada')
      onClose()
    })
  }

  const disponibles = (archivo.data ?? []).filter((s) => !stories.some((x) => x.id === s.id))

  return (
    <div className="flex flex-col gap-4 p-4">
      <TextField label="Título" value={titulo} onChange={setTitulo} maxLength={30} />
      <Portadas stories={stories} portada={portada} onPick={setPortada} />
      <div className="flex justify-end">
        <Button disabled={busy || !titulo.trim()} onClick={guardar}>
          Guardar
        </Button>
      </div>
      <p className="type-label-l">Stories ({stories.length})</p>
      <ul className="flex flex-col gap-2">
        {stories.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <img src={s.url_imagen} alt="" className="h-16 w-9 rounded-xs object-cover" />
            <span className="type-body-m flex-1 text-on-surface-variant">{fechaStory(s.fecha_publicacion)}</span>
            <IconButton icon="arrow_upward" label="Subir" disabled={busy || i === 0} onClick={() => mover(i, -1)} />
            <IconButton icon="arrow_downward" label="Bajar" disabled={busy || i === stories.length - 1} onClick={() => mover(i, 1)} />
            <IconButton icon="remove_circle" label="Quitar de la destacada" disabled={busy} onClick={() => quitar(s)} />
          </li>
        ))}
      </ul>
      {!agregando ? (
        <Button variant="tonal" icon="add" onClick={() => setAgregando(true)}>
          Agregar del archivo
        </Button>
      ) : archivo.loading ? (
        <CenteredLoader />
      ) : archivo.error ? (
        <ErrorState error={archivo.error} onRetry={archivo.reload} />
      ) : disponibles.length === 0 ? (
        <p className="type-body-m text-on-surface-variant">No hay más stories en tu archivo.</p>
      ) : (
        <>
          <p className="type-label-l">Tocá una story para agregarla</p>
          <StoryPickGrid
            stories={disponibles}
            seleccion={[]}
            seleccionable={false}
            onClick={(s) => {
              if (!busy) agregar(s)
            }}
          />
        </>
      )}
    </div>
  )
}
