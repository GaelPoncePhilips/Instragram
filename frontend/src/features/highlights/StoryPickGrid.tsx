/** Grilla 9:16 de stories del archivo (fecha encima), seleccionable con check numerado. */
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/hooks'
import type { Story } from '../../types/api'

export function fechaStory(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function StoryPickGrid({
  stories,
  seleccion,
  onClick,
  seleccionable = true,
}: {
  stories: Story[]
  seleccion: number[]
  onClick: (s: Story) => void
  seleccionable?: boolean
}) {
  return (
    <div className="grid grid-cols-3" style={{ gap: 'var(--grid-gap)' }}>
      {stories.map((s) => {
        const idx = seleccion.indexOf(s.id)
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onClick(s)}
            aria-pressed={seleccionable ? idx >= 0 : undefined}
            aria-label={`Story del ${fechaStory(s.fecha_publicacion)}`}
            className="state relative block overflow-hidden rounded-xs bg-surface-container-highest"
            style={{ aspectRatio: '9 / 16' }}
          >
            <img src={s.url_imagen} alt="" loading="lazy" className={cn('size-full object-cover', idx >= 0 && 'opacity-70')} />
            <span className="absolute top-1.5 left-1.5 rounded-xs bg-surface/90 px-1.5 py-0.5 type-label-s emphasized text-on-surface">
              {new Date(s.fecha_publicacion).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
            </span>
            {s.solo_mejores_amigos && (
              <span className="absolute bottom-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-amigos text-white">
                <Icon name="crown" fill size={14} />
              </span>
            )}
            {seleccionable && (
              <span
                className={cn(
                  'absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full border-2 border-white type-label-m emphasized',
                  idx >= 0 ? 'bg-primary text-on-primary' : 'bg-black/20',
                )}
              >
                {idx >= 0 ? idx + 1 : ''}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
