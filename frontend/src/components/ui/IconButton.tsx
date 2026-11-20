import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/hooks'
import { Icon } from './Icon'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: string
  /** Obligatorio: los botones de ícono necesitan nombre accesible. */
  label: string
  /** Toggle: relleno cuando está activo. */
  active?: boolean
  size?: number
  /** standard = sin fondo (acciones de post, como Instagram); tonal/filled = contenedor M3. */
  variant?: 'standard' | 'tonal' | 'filled'
  activeClassName?: string
  badge?: number | boolean
}

/** Icon button M3 con toggle (FILL) y morph círculo → 16px al presionar. */
export function IconButton({
  icon,
  label,
  active = false,
  size = 24,
  variant = 'standard',
  className,
  activeClassName,
  badge,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const box = size + 16
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={rest['aria-pressed']}
      className={cn(
        'morph-icon state ripple relative inline-flex shrink-0 items-center justify-center disabled:opacity-40',
        variant === 'tonal' && 'bg-secondary-container text-on-secondary-container',
        variant === 'filled' && 'bg-primary text-on-primary',
        active && activeClassName,
        className,
      )}
      style={{ width: Math.max(box, 40), height: Math.max(box, 40) }}
      {...rest}
    >
      <Icon name={icon} fill={active} size={size} />
      {badge !== undefined && badge !== false && badge !== 0 && (
        <span
          className={cn(
            'absolute bg-error text-on-error type-label-s flex items-center justify-center rounded-full',
            typeof badge === 'number' ? 'top-1 right-0.5 min-w-[18px] h-[18px] px-1' : 'top-2 right-2 size-2',
          )}
        >
          {typeof badge === 'number' ? (badge > 9 ? '9+' : badge) : null}
        </span>
      )}
    </button>
  )
}
