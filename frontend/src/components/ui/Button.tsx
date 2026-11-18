import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/hooks'
import { Icon } from './Icon'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated'
export type ButtonSize = 'xs' | 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: string
  /** Toggle M3 Expressive: seleccionado = esquinas cuadradas (shape morph). */
  selected?: boolean
  full?: boolean
  children?: ReactNode
}

const variantes: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary disabled:bg-on-surface/10 disabled:text-on-surface/40',
  tonal: 'bg-secondary-container text-on-secondary-container disabled:bg-on-surface/10 disabled:text-on-surface/40',
  outlined: 'border border-outline-variant text-on-surface disabled:text-on-surface/40',
  text: 'text-primary disabled:text-on-surface/40',
  elevated: 'bg-surface-container-low text-primary shadow-sm',
}

const tamanos: Record<ButtonSize, string> = {
  xs: 'h-8 px-3 gap-1 type-label-l',
  sm: 'h-9 px-4 gap-1.5 type-label-l',
  md: 'h-10 px-5 gap-2 type-label-l',
}

/** Botón M3 con morph de forma: redondo en reposo, esquinas de 12px al presionar o seleccionar. */
export function Button({
  variant = 'filled',
  size = 'sm',
  icon,
  selected,
  full,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      data-selected={selected ? 'true' : undefined}
      aria-pressed={selected}
      className={cn(
        'morph state ripple inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none disabled:cursor-not-allowed',
        variantes[variant],
        tamanos[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} fill={selected} />}
      {children}
    </button>
  )
}

/** Button group conectado (M3 Expressive): 2px de separación, esquinas internas de 8px. */
export function ButtonGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('btn-group flex items-stretch gap-[2px]', className)}>{children}</div>
}
