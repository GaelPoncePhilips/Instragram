/** Fila de destacadas del perfil (EXTRA): círculos de 77px con título debajo. */
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { ActionMenu, Confirm } from '../../components/ui/Overlay'
import { useAsync } from '../../lib/hooks'
import { mensajeDeError } from '../../services/client'
import * as storiesApi from '../../services/stories'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Destacada } from '../../types/api'
import { HighlightEditor } from './HighlightEditor'

export function HighlightsRow({ usuarioId, esPropio }: { usuarioId: number; esPropio: boolean }) {
  const yo = useYo()
  const { data, setData, reload } = useAsync(() => storiesApi.destacadasDe(usuarioId), [usuarioId])
  const [creando, setCreando] = useState(false)
  const [menu, setMenu] = useState<Destacada | null>(null)
  const [editando, setEditando] = useState<Destacada | null>(null)
  const [borrando, setBorrando] = useState<Destacada | null>(null)
  const [reordenando, setReordenando] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const largo = useRef(false)

  const lista = [...(data ?? [])].sort((a, b) => a.orden - b.orden)
  if (!esPropio && lista.length === 0) return null

  const mover = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= lista.length) return
    const n = [...lista]
    const tmp = n[i]
    n[i] = n[j]
    n[j] = tmp
    setData(n.map((d, k) => ({ ...d, orden: k })))
  }
  const listo = async () => {
    try {
      await storiesApi.ordenarDestacadas(
        yo.id,
        lista.map((d) => d.id),
      )
      setReordenando(false)
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }
  const borrar = async (d: Destacada) => {
    try {
      await storiesApi.borrarDestacada(d.id)
      setData((p) => (p ?? []).filter((x) => x.id !== d.id))
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }
  const cancelarTimer = () => window.clearTimeout(timer.current)

  return (
    <section aria-label="Destacadas" className="py-3">
      {esPropio && reordenando && (
        <div className="mb-2 flex items-center justify-between gap-2 px-4">
          <span className="type-label-l text-on-surface-variant">Mové las destacadas con las flechas</span>
          <Button size="xs" onClick={() => void listo()}>
            Listo
          </Button>
        </div>
      )}
      <ul className="flex gap-4 overflow-x-auto px-4 pb-1">
        {lista.map((d, i) => {
          const portada = d.portada_url ?? d.stories[0]?.url_imagen
          return (
            <li key={d.id} className="flex w-[83px] shrink-0 flex-col items-center gap-1">
              <Link
                to={`/destacadas/${d.id}`}
                onClick={(e) => {
                  if (largo.current || reordenando) e.preventDefault()
                  largo.current = false
                }}
                onPointerDown={() => {
                  if (!esPropio) return
                  timer.current = window.setTimeout(() => {
                    largo.current = true
                    setMenu(d)
                  }, 500)
                }}
                onPointerUp={cancelarTimer}
                onPointerLeave={cancelarTimer}
                onContextMenu={(e) => {
                  if (esPropio) {
                    e.preventDefault()
                    setMenu(d)
                  }
                }}
                className="block rounded-full border border-outline-variant p-[2px]"
                aria-label={`Destacada ${d.titulo}`}
              >
                <span className="block size-[77px] overflow-hidden rounded-full bg-surface-container-highest">
                  {portada && <img src={portada} alt="" className="size-full object-cover" />}
                </span>
              </Link>
              <span className="type-label-m w-full truncate text-center">{d.titulo}</span>
              {esPropio && reordenando ? (
                <span className="flex">
                  <IconButton icon="chevron_left" label="Mover a la izquierda" size={20} disabled={i === 0} onClick={() => mover(i, -1)} />
                  <IconButton icon="chevron_right" label="Mover a la derecha" size={20} disabled={i === lista.length - 1} onClick={() => mover(i, 1)} />
                </span>
              ) : (
                esPropio && <IconButton icon="more_horiz" label={`Opciones de ${d.titulo}`} size={18} onClick={() => setMenu(d)} />
              )}
            </li>
          )
        })}
        {esPropio && !reordenando && (
          <li className="flex w-[83px] shrink-0 flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setCreando(true)}
              aria-label="Nueva destacada"
              className="state flex size-[83px] items-center justify-center rounded-full border border-outline-variant"
            >
              <Icon name="add" size={36} />
            </button>
            <span className="type-label-m">Nuevo</span>
          </li>
        )}
      </ul>

      <HighlightEditor open={creando} onClose={() => setCreando(false)} onSaved={reload} />
      <HighlightEditor open={!!editando} destacada={editando ?? undefined} onClose={() => setEditando(null)} onSaved={reload} />
      <ActionMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        actions={[
          { label: 'Editar', icon: 'edit', onClick: () => setEditando(menu) },
          { label: 'Reordenar destacadas', icon: 'swap_horiz', onClick: () => setReordenando(true) },
          { label: 'Eliminar', icon: 'delete', destructive: true, onClick: () => setBorrando(menu) },
        ]}
      />
      <Confirm
        open={!!borrando}
        title="¿Eliminar destacada?"
        text="Las stories siguen en tu archivo."
        confirmLabel="Eliminar"
        destructive
        onClose={() => setBorrando(null)}
        onConfirm={() => {
          if (borrando) void borrar(borrando)
        }}
      />
    </section>
  )
}
