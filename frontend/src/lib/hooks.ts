import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ApiError } from '../services/client'

/** Une clases condicionales. */
export function cn(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ')
}

export interface AsyncState<T> {
  data: T | undefined
  error: ApiError | Error | null
  loading: boolean
  reload: () => void
  setData: (updater: T | ((prev: T | undefined) => T)) => void
}

/** Carga datos con estados de carga/error. `deps` vuelve a ejecutar la carga. */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined)
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    let vivo = true
    setLoading(true)
    setError(null)
    fnRef
      .current()
      .then((d) => {
        if (vivo) setDataState(d)
      })
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (vivo) setLoading(false)
      })
    return () => {
      vivo = false
    }
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback((u: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof u === 'function' ? (u as (p: T | undefined) => T)(prev) : u))
  }, [])
  return { data, error, loading, reload, setData }
}

export interface InfiniteState<T> {
  items: T[]
  error: ApiError | Error | null
  loading: boolean
  done: boolean
  loadMore: () => void
  reload: () => void
  setItems: (updater: (prev: T[]) => T[]) => void
  /** Ref para el elemento centinela: al verse, carga la siguiente página. */
  sentinelRef: (el: HTMLElement | null) => void
}

/** Scroll infinito por limit/offset (limit máx. 50). Termina cuando una página trae menos de `limit`. */
export function useInfinite<T>(
  fetchPage: (offset: number, limit: number) => Promise<T[]>,
  deps: readonly unknown[],
  limit = 12,
): InfiniteState<T> {
  const [items, setItemsState] = useState<T[]>([])
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [gen, setGen] = useState(0)
  const fetchRef = useRef(fetchPage)
  useEffect(() => {
    fetchRef.current = fetchPage
  })
  const state = useRef({ offset: 0, loading: false, done: false, gen: 0 })
  const observer = useRef<IntersectionObserver | null>(null)

  const loadMore = useCallback(() => {
    const s = state.current
    if (s.loading || s.done) return
    s.loading = true
    setLoading(true)
    const myGen = s.gen
    fetchRef
      .current(s.offset, limit)
      .then((page) => {
        if (myGen !== state.current.gen) return
        s.offset += page.length
        if (page.length < limit) {
          s.done = true
          setDone(true)
        }
        setItemsState((prev) => [...prev, ...page])
        setError(null)
      })
      .catch((e: unknown) => {
        if (myGen === state.current.gen) setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (myGen === state.current.gen) {
          s.loading = false
          setLoading(false)
        }
      })
  }, [limit])

  useEffect(() => {
    state.current = { offset: 0, loading: false, done: false, gen: state.current.gen + 1 }
    setItemsState([])
    setDone(false)
    setError(null)
    loadMore()
  }, [...deps, gen])

  const sentinelRef = useCallback(
    (el: HTMLElement | null) => {
      observer.current?.disconnect()
      if (!el) return
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) loadMore()
        },
        { rootMargin: '600px' },
      )
      observer.current.observe(el)
    },
    [loadMore],
  )

  return {
    items,
    error,
    loading,
    done,
    loadMore,
    reload: () => setGen((g) => g + 1),
    setItems: (u) => setItemsState(u),
    sentinelRef,
  }
}

function subscribeMq(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
  }
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribeMq(query), () => window.matchMedia(query).matches)
}

/** Breakpoints: móvil < 768, tablet 768–1023, escritorio ≥ 1024. */
export const useIsMobile = () => !useMediaQuery('(min-width: 768px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')

/** Escape cierra (modales, sheets, visores). */
export function useEscape(onEscape: () => void, active = true): void {
  const ref = useRef(onEscape)
  useEffect(() => {
    ref.current = onEscape
  })
  useEffect(() => {
    if (!active) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active])
}
