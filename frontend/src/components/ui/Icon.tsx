import { cn } from '../../lib/hooks'

interface IconProps {
  /** Nombre del ícono de Material Symbols Rounded (p. ej. "home", "favorite"). */
  name: string
  /** Relleno (estado activo). Los inactivos van en trazo. */
  fill?: boolean
  size?: number
  className?: string
}

/** Material Symbols Rounded: mismo grosor en toda la app; solo cambia el eje FILL. */
export function Icon({ name, fill = false, size = 24, className }: IconProps) {
  return (
    <span
      className={cn('icon', className)}
      data-fill={fill}
      style={{ fontSize: size, width: size, height: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
