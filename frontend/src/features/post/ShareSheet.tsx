import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { SearchBar } from '../../components/ui/Controls'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { Sheet } from '../../components/ui/Overlay'
import { cn, useAsync } from '../../lib/hooks'
import { mensajeDeError } from '../../services/client'
import * as dmsApi from '../../services/dms'
import { buscarUsuarios } from '../../services/temporal'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { UsuarioResumen } from '../../types/api'

interface Destino {
  clave: string
  titulo: string
  username: string
  convId: number | null
  usuarioId: number | null
}

/** Compartir un post por DM (envía post_id a una o más conversaciones). */
export function ShareSheet({ postId, open, onClose }: { postId: number; open: boolean; onClose: () => void }) {
  if (!open) return null
  return <ShareSheetAbierto postId={postId} onClose={onClose} />
}

function ShareSheetAbierto({ postId, onClose }: { postId: number; onClose: () => void }) {
  const yo = useYo()
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<UsuarioResumen[]>([])
  const [sel, setSel] = useState<Map<string, Destino>>(new Map())
  const [busy, setBusy] = useState(false)
  const convs = useAsync(() => dmsApi.conversaciones(), [])
  const termino = q.trim()

  useEffect(() => {
    if (!termino) return
    let vivo = true
    const h = setTimeout(() => {
      buscarUsuarios(termino, { limit: 20 })
        .then((r) => {
          if (vivo) setResultados(r.filter((u) => u.id !== yo.id))
        })
        .catch(() => {
          if (vivo) setResultados([])
        })
    }, 250)
    return () => {
      vivo = false
      clearTimeout(h)
    }
  }, [termino, yo.id])

  const destinos: Destino[] = useMemo(() => {
    if (termino) {
      return resultados.map((u) => ({ clave: `u${u.id}`, titulo: u.username, username: u.username, convId: null, usuarioId: u.id }))
    }
    return (convs.data ?? []).map((c) => {
      const otros = c.participantes.filter((p) => p.id !== yo.id)
      const primero = otros[0] ?? c.participantes[0]
      return {
        clave: `c${c.id}`,
        titulo: c.nombre ?? otros.map((o) => o.username).join(', '),
        username: primero?.username ?? '',
        convId: c.id,
        usuarioId: null,
      }
    })
  }, [termino, resultados, convs.data, yo.id])

  const alternar = (d: Destino) =>
    setSel((prev) => {
      const n = new Map(prev)
      if (n.has(d.clave)) n.delete(d.clave)
      else n.set(d.clave, d)
      return n
    })

  const enviar = async () => {
    setBusy(true)
    try {
      for (const d of sel.values()) {
        let convId = d.convId
        if (convId === null && d.usuarioId !== null) {
          const c = await dmsApi.crearConversacion({ participantes: [d.usuarioId] })
          convId = c.id
        }
        if (convId !== null) await dmsApi.enviarMensaje(convId, { post_id: postId })
      }
      snackbar('Enviado')
      onClose()
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Compartir"
      footer={
        <div className="p-3">
          <Button full disabled={sel.size === 0 || busy} onClick={() => void enviar()}>
            {sel.size > 1 ? 'Enviar por separado' : 'Enviar'}
          </Button>
        </div>
      }
    >
      <div className="px-4 py-2">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar" />
      </div>
      {!termino && convs.loading && !convs.data ? (
        <CenteredLoader />
      ) : !termino && convs.error ? (
        <ErrorState error={convs.error} onRetry={convs.reload} />
      ) : destinos.length === 0 ? (
        <EmptyState icon="send" title={termino ? 'No se encontraron cuentas' : 'Buscá a quién enviarlo'} />
      ) : (
        <ul className="py-1">
          {destinos.map((d) => {
            const on = sel.has(d.clave)
            return (
              <li key={d.clave}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => alternar(d)}
                  className="state flex w-full items-center gap-3 px-4 py-2 text-left"
                >
                  <Avatar username={d.username} size={44} />
                  <span className="type-label-l emphasized min-w-0 flex-1 truncate">{d.titulo}</span>
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full border-2',
                      on ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant',
                    )}
                  >
                    {on && <Icon name="check" size={16} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
