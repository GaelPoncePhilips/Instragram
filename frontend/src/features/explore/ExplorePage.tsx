import { useLocation, useNavigate } from 'react-router'
import { GridSkeleton, PostGrid } from '../../components/shared'
import { SearchBar } from '../../components/ui/Controls'
import { EmptyState, ErrorState, LoadingShape } from '../../components/ui/Feedback'
import { useInfinite, useIsDesktop, useIsMobile } from '../../lib/hooks'
import { explorar } from '../../services/posts'
import { useYo } from '../../stores/session'

/** Grilla de posts recomendados (reutilizada por la búsqueda en escritorio). */
export function ExploreGrid() {
  const yo = useYo()
  const location = useLocation()
  const desktop = useIsDesktop()
  const { items, error, loading, done, reload, sentinelRef } = useInfinite((offset, limit) => explorar(yo.id, { offset, limit }), [yo.id], 24)

  if (error && items.length === 0) return <ErrorState error={error} onRetry={reload} />
  if (loading && items.length === 0) return <GridSkeleton n={12} />
  if (done && items.length === 0) return <EmptyState icon="explore" title="Nada para explorar todavía" text="Seguí a más gente para ver publicaciones recomendadas." />
  return (
    <>
      <PostGrid posts={items} sentinelRef={sentinelRef} linkState={desktop ? { background: location } : undefined} />
      {loading && (
        <div className="flex justify-center py-6">
          <LoadingShape />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}
    </>
  )
}

export function ExplorePage() {
  const mobile = useIsMobile()
  const navigate = useNavigate()
  return (
    <div className="mx-auto w-full max-w-[935px] px-0 md:px-4 md:py-6">
      {mobile && (
        <div className="sticky top-0 z-20 bg-surface px-3 py-2">
          <SearchBar value="" onChange={() => undefined} onFocus={() => navigate('/buscar')} placeholder="Buscar" />
        </div>
      )}
      <ExploreGrid />
    </div>
  )
}
