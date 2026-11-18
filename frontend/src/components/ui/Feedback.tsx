import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/hooks'
import { ApiError, mensajeDeError } from '../../services/client'
import { useUi } from '../../stores/ui'
import { Button } from './Button'
import { Icon } from './Icon'

/**
 * Indicador de carga M3 Expressive: un polígono redondeado que muta entre 6 formas
 * (círculo, cookie 4, cookie 8, pentágono suave, trébol, píldora) mientras rota.
 */
const N = 48
function forma(i: number): (t: number) => number {
  // Radio en función del ángulo para cada forma (todas con N puntos → interpolables).
  const fs: ((a: number) => number)[] = [
    () => 1,
    (a) => 0.86 + 0.14 * Math.cos(4 * a),
    (a) => 0.9 + 0.1 * Math.cos(8 * a),
    (a) => 0.88 + 0.12 * Math.cos(5 * a),
    (a) => 0.78 + 0.22 * Math.abs(Math.cos(2 * a)),
    (a) => 0.82 + 0.18 * Math.cos(2 * a),
  ]
  return fs[((i % fs.length) + fs.length) % fs.length]
}
function path(i: number, mezcla: number, size: number): string {
  const a = forma(i)
  const b = forma(i + 1)
  const c = size / 2
  const pts: string[] = []
  for (let k = 0; k < N; k++) {
    const ang = (k / N) * Math.PI * 2
    const r = (a(ang) * (1 - mezcla) + b(ang) * mezcla) * c * 0.92
    pts.push(`${(c + r * Math.cos(ang)).toFixed(2)},${(c + r * Math.sin(ang)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

export function LoadingShape({ size = 40, className, label = 'Cargando' }: { size?: number; className?: string; label?: string }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      setT(Math.max(0, (now - start) / 1000))
      raf = requestAnimationFrame(loop)
    }
    if (!reduce) raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  const ciclo = t / 0.65
  const i = Math.floor(ciclo)
  const f = ciclo - i
  // Easing tipo spring: llega rápido y se asienta.
  const m = f < 0.5 ? 0 : 1 - Math.pow(1 - (f - 0.5) / 0.5, 3)
  return (
    <span role="progressbar" aria-label={label} className={cn('inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: `rotate(${t * 140}deg)` }} aria-hidden="true">
        <path d={path(i, m, size)} fill="var(--md-sys-color-primary)" />
      </svg>
    </span>
  )
}

export function CenteredLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center py-10', className)}>
      <LoadingShape />
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex size-[72px] items-center justify-center rounded-full border-2 border-on-surface">
        <Icon name={icon} size={36} />
      </span>
      <h3 className="type-headline-s emphasized">{title}</h3>
      {text && <p className="type-body-m mt-2 max-w-sm text-on-surface-variant">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Error genérico con reintento. Para 403/404 cada pantalla muestra su propio estado. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = error instanceof ApiError ? error.status : 0
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" role="alert">
      <span className="mb-3 flex size-14 items-center justify-center rounded-lg bg-error-container text-on-error-container">
        <Icon name={status === 0 ? 'wifi_off' : 'error'} size={28} />
      </span>
      <p className="type-title-m">{status === 0 ? 'Sin conexión' : 'No se pudo cargar'}</p>
      <p className="type-body-m mt-1 max-w-sm text-on-surface-variant">{mensajeDeError(error)}</p>
      {onRetry && (
        <Button variant="tonal" className="mt-4" icon="refresh" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

/** Snackbars M3 (inverse surface), apilados abajo; sobre la barra inferior en móvil. */
export function Snackbars() {
  const snacks = useUi((s) => s.snacks)
  const cerrar = useUi((s) => s.cerrarSnack)
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+12px)] md:bottom-6"
      aria-live="polite"
    >
      {snacks.map((s) => (
        <div
          key={s.id}
          className="anim-slide-up pointer-events-auto flex min-h-12 w-full max-w-[560px] items-center gap-2 rounded-xs bg-inverse-surface py-1 pr-2 pl-4 text-inverse-on-surface shadow-lg"
        >
          <span className="type-body-m flex-1 py-2">{s.texto}</span>
          {s.accion && (
            <button
              type="button"
              className="state h-9 rounded-full px-3 type-label-l text-inverse-primary"
              onClick={() => {
                s.accion?.onClick()
                cerrar(s.id)
              }}
            >
              {s.accion.label}
            </button>
          )}
          <button type="button" aria-label="Cerrar" className="state flex size-9 items-center justify-center rounded-full" onClick={() => cerrar(s.id)}>
            <Icon name="close" size={20} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}

/** Ripple: un listener global agrega la onda a cualquier elemento con la clase .ripple. */
export function instalarRipple(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  document.addEventListener('pointerdown', (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('.ripple')
    if (!target || (target as HTMLButtonElement).disabled) return
    const rect = target.getBoundingClientRect()
    const d = Math.max(rect.width, rect.height) * 2.2
    const ink = document.createElement('span')
    ink.className = 'ripple-ink'
    ink.style.width = ink.style.height = `${d}px`
    ink.style.left = `${e.clientX - rect.left - d / 2}px`
    ink.style.top = `${e.clientY - rect.top - d / 2}px`
    target.appendChild(ink)
    ink.addEventListener('animationend', () => ink.remove())
  })
}
