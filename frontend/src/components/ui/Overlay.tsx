import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn, useEscape, useIsMobile } from '../../lib/hooks'
import { IconButton } from './IconButton'

function useBloquearScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [activo])
}

/** Lleva el foco al contenedor al abrir y lo devuelve al cerrar. */
function useFoco(activo: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!activo) return
    const previo = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => previo?.focus?.()
  }, [activo])
  return ref
}

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Ancho máximo en px (escritorio). */
  width?: number
  className?: string
  /** Pantalla completa en móvil (p. ej. detalle de post, creación). */
  fullscreenMobile?: boolean
  hideHeader?: boolean
  actions?: ReactNode
}

/** Diálogo M3: esquinas de 28px, scrim, entrada con spring, Escape cierra. */
export function Dialog({ open, onClose, title, children, width = 400, className, fullscreenMobile, hideHeader, actions }: DialogProps) {
  const id = useId()
  const isMobile = useIsMobile()
  useEscape(onClose, open)
  useBloquearScroll(open)
  const ref = useFoco(open)
  if (!open) return null
  const full = fullscreenMobile && isMobile
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      <div className="anim-fade-in absolute inset-0 bg-scrim/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? id : undefined}
        aria-label={title ? undefined : 'Diálogo'}
        className={cn(
          'relative flex max-h-full flex-col overflow-hidden bg-surface-container-high text-on-surface outline-none',
          full ? 'anim-slide-up size-full' : 'anim-scale-in mx-4 max-h-[90dvh] w-full rounded-xl',
          className,
        )}
        style={full ? undefined : { maxWidth: width }}
      >
        {!hideHeader && (title || full) && (
          <div className="flex min-h-14 items-center gap-2 border-b border-outline-variant/60 px-2">
            <IconButton icon={full ? 'arrow_back' : 'close'} label="Cerrar" onClick={onClose} />
            <h2 id={id} className="type-title-m flex-1 truncate text-center pr-12">
              {title}
            </h2>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {actions && <div className="flex justify-end gap-2 px-6 pt-2 pb-5">{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  text?: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Diálogo de confirmación al estilo Instagram (acciones apiladas). */
export function Confirm({ open, title, text, confirmLabel, destructive, onConfirm, onClose }: ConfirmProps) {
  return (
    <Dialog open={open} onClose={onClose} hideHeader width={400}>
      <div className="px-6 pt-7 pb-4 text-center">
        <h2 className="type-title-l emphasized">{title}</h2>
        {text && <p className="type-body-m mt-2 text-on-surface-variant">{text}</p>}
      </div>
      <div className="flex flex-col border-t border-outline-variant/60">
        <button
          type="button"
          className={cn('state h-12 type-label-l emphasized', destructive ? 'text-error' : 'text-primary')}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="state h-12 border-t border-outline-variant/60 type-label-l" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Dialog>
  )
}

export interface MenuAction {
  label: string
  onClick: () => void
  destructive?: boolean
  icon?: string
}

/** Menú de acciones (⋯) al estilo Instagram: lista centrada en escritorio, bottom sheet en móvil. */
export function ActionMenu({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: MenuAction[] }) {
  const isMobile = useIsMobile()
  const lista = (
    <div className="flex flex-col">
      {actions.map((a, i) => (
        <button
          key={a.label}
          type="button"
          className={cn(
            'state h-12 type-label-l',
            i > 0 && 'border-t border-outline-variant/60',
            a.destructive ? 'text-error emphasized' : '',
          )}
          onClick={() => {
            onClose()
            a.onClick()
          }}
        >
          {a.label}
        </button>
      ))}
      <button type="button" className="state h-12 border-t border-outline-variant/60 type-label-l" onClick={onClose}>
        Cancelar
      </button>
    </div>
  )
  if (isMobile)
    return (
      <Sheet open={open} onClose={onClose} title="Opciones" hideTitle>
        {lista}
      </Sheet>
    )
  return (
    <Dialog open={open} onClose={onClose} hideHeader width={400}>
      {lista}
    </Dialog>
  )
}

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** En escritorio se muestra como side sheet a la derecha (M3). */
  side?: 'auto' | 'bottom'
  hideTitle?: boolean
  footer?: ReactNode
}

/** Bottom sheet en móvil (con handle) y side sheet en escritorio. */
export function Sheet({ open, onClose, title, children, side = 'auto', hideTitle, footer }: SheetProps) {
  const id = useId()
  const isMobile = useIsMobile()
  useEscape(onClose, open)
  useBloquearScroll(open)
  const ref = useFoco(open)
  if (!open) return null
  const bottom = isMobile || side === 'bottom'
  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="anim-fade-in absolute inset-0 bg-scrim/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={cn(
          'absolute flex flex-col bg-surface-container-low text-on-surface outline-none',
          bottom
            ? 'anim-slide-up inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl pb-[env(safe-area-inset-bottom)]'
            : 'anim-slide-right inset-y-0 right-0 w-[400px] max-w-full rounded-l-xl',
        )}
      >
        {bottom && <div className="mx-auto mt-3 mb-1 h-1 w-8 rounded-full bg-on-surface-variant/40" aria-hidden="true" />}
        <div className={cn('flex items-center gap-2 px-4', hideTitle ? 'sr-only' : 'min-h-12 border-b border-outline-variant/60')}>
          <h2 id={id} className="type-title-m flex-1 text-center">
            {title}
          </h2>
          {!bottom && <IconButton icon="close" label="Cerrar" onClick={onClose} className="absolute right-2" />}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer}
      </div>
    </div>,
    document.body,
  )
}
