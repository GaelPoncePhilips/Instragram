import { useState } from 'react'
import { cn } from '../../lib/hooks'
import { avatarUrl } from '../../services/temporal/local'

export type Anillo = 'ninguno' | 'sin-ver' | 'visto' | 'amigos'

interface AvatarProps {
  username: string
  size?: number
  /** Anillo de story: sin-ver = marca (índigo → lima), visto = gris, amigos = verde. */
  anillo?: Anillo
  className?: string
  alt?: string
}

/** Avatar circular. TEMPORAL (hueco 6): la foto se deriva del username; si falla, iniciales. */
export function Avatar({ username, size = 32, anillo = 'ninguno', className, alt }: AvatarProps) {
  const [fallo, setFallo] = useState(false)
  const url = avatarUrl(username)
  const ring = anillo !== 'ninguno'
  const grosor = size >= 56 ? 3 : 2
  const fondo =
    anillo === 'sin-ver'
      ? 'conic-gradient(from 210deg, var(--md-sys-color-primary), var(--md-sys-color-tertiary-container), var(--md-sys-color-primary))'
      : anillo === 'amigos'
        ? 'var(--keepsy-amigos)'
        : anillo === 'visto'
          ? 'var(--md-sys-color-outline-variant)'
          : undefined
  const inner = (
    <span
      className="block overflow-hidden rounded-full bg-surface-container-highest"
      style={{ width: size, height: size }}
    >
      {url && !fallo ? (
        <img
          src={url}
          alt={alt ?? `Foto de perfil de ${username}`}
          width={size}
          height={size}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFallo(true)}
        />
      ) : (
        <span
          className="flex size-full items-center justify-center bg-primary-container font-bold text-on-primary-container"
          style={{ fontSize: size * 0.42 }}
          role="img"
          aria-label={alt ?? username}
        >
          {username.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  )
  if (!ring) return <span className={cn('inline-block shrink-0 rounded-full', className)}>{inner}</span>
  return (
    <span
      className={cn('relative inline-block shrink-0 rounded-full', className)}
      style={{ padding: grosor, background: fondo }}
    >
      <span className="block rounded-full bg-surface" style={{ padding: grosor }}>
        {inner}
      </span>
      {anillo === 'amigos' && size >= 40 && (
        // Mejores amigos: corona sobre el anillo verde.
        <span
          className="absolute -top-1 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full bg-amigos text-white ring-2 ring-surface"
          style={{ width: Math.round(size * 0.32), height: Math.round(size * 0.32) }}
          aria-label="Mejores amigos"
          role="img"
        >
          <span className="icon" data-fill="true" style={{ fontSize: Math.round(size * 0.22) }} aria-hidden="true">
            crown
          </span>
        </span>
      )}
    </span>
  )
}
