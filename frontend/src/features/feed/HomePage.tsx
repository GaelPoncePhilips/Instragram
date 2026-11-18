import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { DevSwitcherDialog, DevSwitcherList } from '../../app/layout/DevSwitcher'
import { FollowButton, UserRow } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { useAsync, useInfinite, useIsMobile, useMediaQuery } from '../../lib/hooks'
import * as postsApi from '../../services/posts'
import * as usuariosApi from '../../services/usuarios'
import { useYo } from '../../stores/session'
import type { Sugerencia } from '../../types/api'
import { PostCard } from '../post/PostCard'
import { StoriesTray } from './StoriesTray'

function subtituloSugerencia(s: Sugerencia): string {
  if (s.te_sigue) return 'Te sigue'
  if (s.en_comun > 0) return `${s.en_comun} en común`
  return 'Sugerencia para ti'
}

function useSugerencias(limit: number) {
  const yo = useYo()
  return useAsync(() => usuariosApi.sugerencias(yo.id, { limit }), [yo.id, limit])
}

/** Lista vertical de sugerencias (columna derecha / final del feed). */
function ListaSugerencias({ limit = 5, compacta }: { limit?: number; compacta?: boolean }) {
  const { data, error, loading, reload } = useSugerencias(limit)
  if (loading && !data) return <CenteredLoader />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data || data.length === 0) return null
  return (
    <div className={compacta ? '-mx-4' : ''}>
      {data.map((s) => (
        <UserRow
          key={s.id}
          usuario={s}
          size={compacta ? 44 : 44}
          subtitle={subtituloSugerencia(s)}
          action={<FollowButton usuarioId={s.id} relacion="ninguna" size="xs" />}
        />
      ))}
    </div>
  )
}

/** Carrusel horizontal "Sugerencias para ti" (móvil, tras el 4.º post). */
function CarruselSugerencias() {
  const { data } = useSugerencias(10)
  if (!data || data.length === 0) return null
  return (
    <section className="border-b border-outline-variant py-3" aria-label="Sugerencias para ti">
      <h2 className="type-title-s emphasized px-3 pb-2">Sugerencias para ti</h2>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3">
        {data.map((s) => (
          <div key={s.id} className="flex w-[156px] shrink-0 flex-col items-center gap-1 rounded-sm border border-outline-variant p-3">
            <Link to={`/${s.username}`} className="flex flex-col items-center gap-1">
              <Avatar username={s.username} size={80} />
              <span className="type-label-l emphasized w-[130px] truncate text-center">{s.username}</span>
            </Link>
            <span className="type-body-s w-full truncate text-center text-on-surface-variant">{subtituloSugerencia(s)}</span>
            <div className="mt-1">
              <FollowButton usuarioId={s.id} relacion="ninguna" size="xs" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Columna derecha (≥1280px): mini perfil, cambio de cuenta y sugerencias. */
function ColumnaDerecha() {
  const yo = useYo()
  const [cambiar, setCambiar] = useState(false)
  return (
    <aside className="sticky top-8 hidden w-[320px] shrink-0 self-start pt-8 xl:block">
      <div className="flex items-center gap-3">
        <Link to={`/${yo.username}`}>
          <Avatar username={yo.username} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/${yo.username}`} className="type-label-l emphasized block truncate font-semibold">
            {yo.username}
          </Link>
          <span className="type-body-m block truncate text-on-surface-variant">{yo.nombre}</span>
        </div>
        <button type="button" className="type-label-m emphasized text-primary" onClick={() => setCambiar(true)}>
          Cambiar
        </button>
      </div>
      <div className="mt-4">
        <DevSwitcherList compact />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <h2 className="type-title-s emphasized text-on-surface-variant">Sugerencias para ti</h2>
        <Link to="/explorar" className="type-label-m emphasized">
          Ver todo
        </Link>
      </div>
      <div className="mt-2">
        <ListaSugerencias limit={5} compacta />
      </div>
      <DevSwitcherDialog open={cambiar} onClose={() => setCambiar(false)} />
    </aside>
  )
}

export function HomePage() {
  const yo = useYo()
  const isMobile = useIsMobile()
  const xl = useMediaQuery('(min-width: 1280px)')
  const { items, error, loading, done, reload, setItems, sentinelRef } = useInfinite(
    (offset, limit) => postsApi.feed(yo.id, { limit, offset }),
    [yo.id],
    10,
  )
  const quitar = (id: number, usuarioId: number) =>
    setItems((prev) => prev.filter((p) => p.id !== id && (p.usuario_id !== usuarioId || p.usuario_id === yo.id)))

  return (
    <div className="flex justify-center gap-16">
      <main className="w-full max-w-[470px] md:pt-4">
        <StoriesTray />
        {items.length === 0 && loading ? (
          <CenteredLoader />
        ) : items.length === 0 && error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : items.length === 0 && done ? (
          <div className="pb-8">
            <EmptyState
              icon="group_add"
              title="Te damos la bienvenida a Ronda"
              text="Seguí a personas para ver sus fotos y videos en tu inicio."
            />
            <h2 className="type-title-s emphasized px-4 pt-2 pb-1">Sugerencias para ti</h2>
            <ListaSugerencias limit={10} />
          </div>
        ) : (
          <>
            {items.map((p, i) => (
              <Fragment key={p.id}>
                <PostCard post={p} onDeleted={() => quitar(p.id, p.usuario_id)} />
                {isMobile && i === 3 && <CarruselSugerencias />}
              </Fragment>
            ))}
            {!done && <div ref={sentinelRef} aria-hidden="true" className="h-1" />}
            {loading && <CenteredLoader />}
            {error && <ErrorState error={error} onRetry={reload} />}
            {done && (
              <div className="pb-10">
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                    <Icon name="check" size={36} />
                  </span>
                  <p className="type-title-m emphasized">Ya viste todo</p>
                  <p className="type-body-m text-on-surface-variant">Viste todas las publicaciones nuevas de los últimos días.</p>
                </div>
                {!xl && (
                  <>
                    <h2 className="type-title-s emphasized px-4 pb-1">Sugerencias para ti</h2>
                    <ListaSugerencias limit={5} />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
      {xl && <ColumnaDerecha />}
    </div>
  )
}
