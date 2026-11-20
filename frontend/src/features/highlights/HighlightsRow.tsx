/**
 * Fila de destacadas del perfil (EXTRA): círculos de 77px con título debajo.
 * Perfil propio: mantener presionada una destacada (~400 ms) la "levanta" y se arrastra para reordenar;
 * al soltar se guarda el orden (PUT /usuarios/{id}/destacadas/orden). Funciona con dedo y con mouse.
 */
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { ActionMenu, Confirm } from '../../components/ui/Overlay'
import { cn, useAsync } from '../../lib/hooks'
import { mensajeDeError } from '../../services/client'
import * as storiesApi from '../../services/stories'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Destacada } from '../../types/api'
import { HighlightEditor } from './HighlightEditor'

const LONG_PRESS_MS = 400
const TOLERANCIA_PX = 8

interface Gesto {
  id: number
  x: number
  y: number
  pointerId: number
  el: HTMLElement
  tipo: string
  timer: number | undefined
  arrastrando: boolean
  movido: boolean
}

export function HighlightsRow({ usuarioId, esPropio }: { usuarioId: number; esPropio: boolean }) {
  const yo = useYo()
  const navigate = useNavigate()
  const { data, setData, reload } = useAsync(() => storiesApi.destacadasDe(usuarioId), [usuarioId])
  const [creando, setCreando] = useState(false)
  const [menu, setMenu] = useState<Destacada | null>(null)
  const [editando, setEditando] = useState<Destacada | null>(null)
  const [borrando, setBorrando] = useState<Destacada | null>(null)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const [pista, setPista] = useState(false)
  const gesto = useRef<Gesto | null>(null)
  const ulRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef(new Map<number, HTMLLIElement>())
  const ordenInicial = useRef<number[]>([])

  const lista = [...(data ?? [])].sort((a, b) => a.orden - b.orden)

  // Mientras se arrastra con el dedo, el scroll horizontal de la fila no debe moverse.
  useEffect(() => {
    const ul = ulRef.current
    if (!ul) return
    const h = (e: TouchEvent) => {
      if (gesto.current?.arrastrando) e.preventDefault()
    }
    ul.addEventListener('touchmove', h, { passive: false })
    return () => ul.removeEventListener('touchmove', h)
  }, [data])

  if (!esPropio && lista.length === 0) return null

  const borrar = async (d: Destacada) => {
    try {
      await storiesApi.borrarDestacada(d.id)
      setData((p) => (p ?? []).filter((x) => x.id !== d.id))
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  const guardarOrden = async (ids: number[]) => {
    if (ids.join(',') === ordenInicial.current.join(',')) return
    try {
      await storiesApi.ordenarDestacadas(yo.id, ids)
      snackbar('Orden guardado')
    } catch (e) {
      snackbar(mensajeDeError(e))
      reload()
    }
  }

  const terminar = (soltar: boolean) => {
    const g = gesto.current
    if (!g) return
    window.clearTimeout(g.timer)
    if (g.arrastrando) {
      try {
        g.el.releasePointerCapture(g.pointerId)
      } catch {
        /* ya liberado */
      }
      setArrastrando(null)
      if (soltar) void guardarOrden(lista.map((d) => d.id))
    }
    if (!g.arrastrando && !g.movido && soltar) navigate(`/destacadas/${g.id}`)
    gesto.current = null
  }

  const onPointerDown = (e: RPointerEvent<HTMLElement>, d: Destacada) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    const g: Gesto = {
      id: d.id,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      el,
      tipo: e.pointerType,
      timer: undefined,
      arrastrando: false,
      movido: false,
    }
    if (esPropio && lista.length > 1) {
      g.timer = window.setTimeout(() => {
        g.arrastrando = true
        ordenInicial.current = lista.map((x) => x.id)
        try {
          el.setPointerCapture(g.pointerId)
        } catch {
          /* puntero ya soltado */
        }
        navigator.vibrate?.(15)
        setArrastrando(d.id)
        setPista(false)
      }, LONG_PRESS_MS)
    }
    gesto.current = g
  }

  const onPointerMove = (e: RPointerEvent<HTMLElement>) => {
    const g = gesto.current
    if (!g) return
    if (!g.arrastrando) {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > TOLERANCIA_PX) {
        g.movido = true
        window.clearTimeout(g.timer)
      }
      return
    }
    // Destino: el ítem cuyo centro está más cerca del puntero.
    let destino = -1
    let mejor = Infinity
    lista.forEach((d, i) => {
      const r = itemRefs.current.get(d.id)?.getBoundingClientRect()
      if (!r) return
      const dist = Math.abs(e.clientX - (r.left + r.width / 2))
      if (dist < mejor) {
        mejor = dist
        destino = i
      }
    })
    const actual = lista.findIndex((d) => d.id === g.id)
    if (destino < 0 || destino === actual) return
    const n = [...lista]
    const [mov] = n.splice(actual, 1)
    n.splice(destino, 0, mov)
    setData(n.map((d, k) => ({ ...d, orden: k })))
    // Si el ítem queda cerca del borde, desplazamos la fila.
    const ul = ulRef.current
    if (ul) {
      const r = ul.getBoundingClientRect()
      if (e.clientX < r.left + 40) ul.scrollBy({ left: -90, behavior: 'smooth' })
      else if (e.clientX > r.right - 40) ul.scrollBy({ left: 90, behavior: 'smooth' })
    }
  }

  return (
    <section aria-label="Destacadas" className="py-3">
      {esPropio && (pista || arrastrando !== null) && (
        <p className="type-label-m anim-fade-in px-4 pb-2 text-on-surface-variant" role="status">
          {arrastrando !== null ? 'Arrastrá y soltá para cambiar el orden' : 'Mantené presionada una destacada y arrastrala'}
        </p>
      )}
      <ul ref={ulRef} className={cn('no-scrollbar flex gap-4 overflow-x-auto px-4 pb-1', arrastrando !== null && 'overflow-x-hidden')}>
        {lista.map((d) => {
          const portada = d.portada_url ?? d.stories[0]?.url_imagen
          const levantada = arrastrando === d.id
          return (
            <li
              key={d.id}
              ref={(el) => {
                if (el) itemRefs.current.set(d.id, el)
                else itemRefs.current.delete(d.id)
              }}
              className={cn(
                'flex w-[83px] shrink-0 flex-col items-center gap-1 transition-transform spring-spatial-fast',
                levantada && 'z-10 scale-110',
                arrastrando !== null && !levantada && 'opacity-70',
              )}
            >
              <button
                type="button"
                draggable={false}
                onPointerDown={(e) => onPointerDown(e, d)}
                onPointerMove={onPointerMove}
                onPointerUp={() => terminar(true)}
                onPointerCancel={() => terminar(false)}
                onClick={(e) => {
                  // detail === 0: activación por teclado o lector de pantalla (el puntero navega en pointerup).
                  if (e.detail === 0) navigate(`/destacadas/${d.id}`)
                }}
                onContextMenu={(e) => {
                  // En táctil el mantener presionado es para arrastrar; con mouse, clic derecho abre el menú.
                  e.preventDefault()
                  if (esPropio && gesto.current?.tipo !== 'touch' && !gesto.current?.arrastrando) setMenu(d)
                }}
                className={cn(
                  'block touch-manipulation rounded-full border border-outline-variant p-[2px] select-none [-webkit-touch-callout:none]',
                  levantada && 'border-primary shadow-xl',
                )}
                aria-label={`Destacada ${d.titulo}`}
              >
                <span className="block size-[77px] overflow-hidden rounded-full bg-surface-container-highest">
                  {portada && <img src={portada} alt="" draggable={false} className="pointer-events-none size-full object-cover" />}
                </span>
              </button>
              <span className="type-label-m w-full truncate text-center">{d.titulo}</span>
              {esPropio && arrastrando === null && (
                <IconButton icon="more_horiz" label={`Opciones de ${d.titulo}`} size={18} onClick={() => setMenu(d)} />
              )}
            </li>
          )
        })}
        {esPropio && arrastrando === null && (
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
          ...(lista.length > 1 ? [{ label: 'Cambiar orden', icon: 'swap_horiz', onClick: () => setPista(true) }] : []),
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
