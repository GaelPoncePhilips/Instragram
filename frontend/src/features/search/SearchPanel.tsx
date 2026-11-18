/** Contenido de búsqueda para el panel deslizable de escritorio y la página /buscar. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { UserRow } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { SearchBar } from '../../components/ui/Controls'
import { useAsync } from '../../lib/hooks'
import { plural } from '../../lib/time'
import { tendencias } from '../../services/posts'
import { buscarUsuarios } from '../../services/temporal'
import type { UsuarioResumen } from '../../types/api'

const KEY_RECIENTES = 'ronda.busquedas.recientes'

function leerRecientes(): UsuarioResumen[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY_RECIENTES) ?? '[]')
    if (!Array.isArray(v)) return []
    return v.filter(
      (x): x is UsuarioResumen =>
        typeof x === 'object' && x !== null && typeof (x as UsuarioResumen).id === 'number' && typeof (x as UsuarioResumen).username === 'string',
    )
  } catch {
    return []
  }
}

function guardarRecientes(lista: UsuarioResumen[]): void {
  try {
    localStorage.setItem(KEY_RECIENTES, JSON.stringify(lista.slice(0, 8)))
  } catch {
    /* sin almacenamiento */
  }
}

/** Debounce simple de un valor. */
function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}

/** Resultados / recientes / tendencias para un texto de búsqueda dado. */
export function SearchResults({ q, onNavigate }: { q: string; onNavigate?: () => void }) {
  const consulta = useDebounced(q.trim(), 250)
  const [recientes, setRecientes] = useState<UsuarioResumen[]>(leerRecientes)
  const resultados = useAsync(() => (consulta ? buscarUsuarios(consulta) : Promise.resolve([] as UsuarioResumen[])), [consulta])
  const trend = useAsync(() => tendencias(), [])

  const elegir = (u: UsuarioResumen) => {
    const nueva = [u, ...recientes.filter((r) => r.id !== u.id)].slice(0, 8)
    setRecientes(nueva)
    guardarRecientes(nueva)
    onNavigate?.()
  }

  if (q.trim()) {
    if (resultados.loading || consulta !== q.trim()) return <CenteredLoader />
    if (resultados.error) return <ErrorState error={resultados.error} onRetry={resultados.reload} />
    const lista = resultados.data ?? []
    if (lista.length === 0) return <EmptyState icon="search_off" title="Sin resultados" text={`No encontramos a nadie para «${q.trim()}».`} />
    return (
      <ul>
        {lista.map((u) => (
          <li key={u.id}>
            <UserRow usuario={u} onClick={() => elegir(u)} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div>
      {recientes.length > 0 && (
        <section aria-label="Recientes" className="pb-2">
          <div className="flex items-center justify-between px-4 pt-2">
            <h2 className="type-title-m emphasized">Recientes</h2>
            <Button
              variant="text"
              size="xs"
              onClick={() => {
                setRecientes([])
                guardarRecientes([])
              }}
            >
              Borrar todo
            </Button>
          </div>
          <ul>
            {recientes.map((u) => (
              <li key={u.id}>
                <UserRow usuario={u} onClick={() => elegir(u)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label="Tendencias" className="pb-4">
        <h2 className="type-title-m emphasized px-4 pt-2 pb-1">Tendencias</h2>
        {trend.loading ? (
          <CenteredLoader />
        ) : trend.error ? (
          <ErrorState error={trend.error} onRetry={trend.reload} />
        ) : (trend.data ?? []).length === 0 ? (
          <p className="type-body-m px-4 py-3 text-on-surface-variant">Todavía no hay tendencias.</p>
        ) : (
          <ul>
            {(trend.data ?? []).slice(0, 10).map((h) => (
              <li key={h.nombre}>
                <Link to={`/hashtags/${encodeURIComponent(h.nombre)}`} onClick={onNavigate} className="state flex items-center gap-3 px-4 py-2">
                  <span className="flex size-11 items-center justify-center rounded-full bg-surface-container-high">
                    <Icon name="tag" />
                  </span>
                  <span className="type-body-l min-w-0 truncate">
                    <span className="emphasized">#{h.nombre}</span>
                    <span className="text-on-surface-variant"> · {plural(h.cantidad_posts, 'publicación', 'publicaciones')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export function SearchPanelContent({ onNavigate }: { onNavigate?: () => void }) {
  const [q, setQ] = useState('')
  return (
    <div>
      <div className="sticky top-0 z-10 bg-surface px-4 pb-2">
        <SearchBar value={q} onChange={setQ} autoFocus />
      </div>
      <SearchResults q={q} onNavigate={onNavigate} />
    </div>
  )
}
