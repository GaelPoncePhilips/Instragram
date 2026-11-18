import { useNavigate, useParams } from 'react-router'
import { useLocation } from 'react-router'
import { GridSkeleton, PostGrid, ScreenHeader } from '../../components/shared'
import { EmptyState, ErrorState, LoadingShape } from '../../components/ui/Feedback'
import { useInfinite, useIsDesktop, useIsMobile } from '../../lib/hooks'
import { plural } from '../../lib/time'
import { postsDeHashtag } from '../../services/posts'

export function HashtagPage() {
  const { nombre = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const mobile = useIsMobile()
  const desktop = useIsDesktop()
  const { items, error, loading, done, reload, sentinelRef } = useInfinite((offset, limit) => postsDeHashtag(nombre, { offset, limit }), [nombre], 24)

  return (
    <div>
      {mobile && <ScreenHeader title={`#${nombre}`} onBack={() => navigate(-1)} />}
      <div className="mx-auto w-full max-w-[935px] md:px-4 md:py-6">
        <header className="flex items-center gap-4 px-4 py-5 md:gap-8 md:px-0">
          <span
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container type-display-s md:size-[120px]"
            aria-hidden="true"
          >
            #
          </span>
          <div className="min-w-0">
            <h1 className="type-headline-m emphasized truncate">#{nombre}</h1>
            <p className="type-body-l text-on-surface-variant">{plural(items.length, 'publicación', 'publicaciones')}{done ? '' : '+'}</p>
          </div>
        </header>
        {error && items.length === 0 ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && items.length === 0 ? (
          <GridSkeleton n={12} />
        ) : done && items.length === 0 ? (
          <EmptyState icon="tag" title="Sin publicaciones" text={`Todavía no hay publicaciones públicas con #${nombre}.`} />
        ) : (
          <>
            <PostGrid posts={items} sentinelRef={sentinelRef} linkState={desktop ? { background: location } : undefined} />
            {loading && (
              <div className="flex justify-center py-6">
                <LoadingShape />
              </div>
            )}
            {error && <ErrorState error={error} onRetry={reload} />}
          </>
        )}
      </div>
    </div>
  )
}
