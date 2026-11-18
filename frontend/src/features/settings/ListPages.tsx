/** Listas de cuenta: no me siguen, solicitudes (HU3), mejores amigos (HU8) y bloqueados (HU10). */
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { FollowButton, ScreenHeader, UserRow } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { SearchBar } from '../../components/ui/Controls'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { Confirm } from '../../components/ui/Overlay'
import { cn, useAsync, useInfinite } from '../../lib/hooks'
import { mensajeDeError } from '../../services/client'
import { usuarioPorId } from '../../services/temporal'
import * as usuariosApi from '../../services/usuarios'
import { useBadges } from '../../stores/badges'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { UsuarioResumen } from '../../types/api'

function Pantalla({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto w-full max-w-[600px] pb-10">
      <ScreenHeader title={title} onBack={() => navigate('/cuenta/ajustes')} />
      {children}
    </div>
  )
}

export function NotFollowingPage() {
  const yo = useYo()
  const { items: lItems, error: lError, loading: lLoading, done: lDone, reload: lReload, sentinelRef: lSentinel } = useInfinite((offset, limit) => usuariosApi.noMeSiguen(yo.id, { offset, limit }), [yo.id], 30)
  return (
    <Pantalla title="No me siguen">
      <p className="type-body-m px-4 py-3 text-on-surface-variant">Cuentas que seguís y no te siguen.</p>
      {lError && lItems.length === 0 ? (
        <ErrorState error={lError} onRetry={lReload} />
      ) : lLoading && lItems.length === 0 ? (
        <CenteredLoader />
      ) : lDone && lItems.length === 0 ? (
        <EmptyState icon="favorite" title="Todos te siguen" text="Todas las cuentas que seguís también te siguen." />
      ) : (
        <ul>
          {lItems.map((u) => (
            <li key={u.id}>
              <UserRow usuario={u} action={<FollowButton usuarioId={u.id} relacion="siguiendo" />} />
            </li>
          ))}
        </ul>
      )}
      {!lDone && <div ref={lSentinel} aria-hidden="true" className="h-1" />}
    </Pantalla>
  )
}

export function RequestsPage() {
  const yo = useYo()
  const lista = useAsync(async () => {
    const sols = await usuariosApi.solicitudes(yo.id, { limit: 50 })
    return Promise.all(sols.map((s) => usuarioPorId(s.seguidor_id)))
  }, [yo.id])
  const [busy, setBusy] = useState<number | null>(null)

  const responder = async (u: UsuarioResumen, accion: 'aceptar' | 'rechazar') => {
    setBusy(u.id)
    try {
      await usuariosApi.responderSolicitud(yo.id, u.id, accion)
      lista.setData((p) => (p ?? []).filter((x) => x.id !== u.id))
      snackbar(accion === 'aceptar' ? `${u.username} ahora te sigue` : 'Solicitud eliminada')
      void useBadges.getState().refrescar()
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Pantalla title="Solicitudes de seguimiento">
      {lista.loading ? (
        <CenteredLoader />
      ) : lista.error ? (
        <ErrorState error={lista.error} onRetry={lista.reload} />
      ) : (lista.data ?? []).length === 0 ? (
        <EmptyState icon="person_add" title="No hay solicitudes pendientes" />
      ) : (
        <ul className="pt-2">
          {(lista.data ?? []).map((u) => (
            <li key={u.id}>
              <UserRow
                usuario={u}
                action={
                  <span className="flex gap-2">
                    <Button size="sm" disabled={busy === u.id} onClick={() => void responder(u, 'aceptar')}>
                      Confirmar
                    </Button>
                    <Button size="sm" variant="tonal" disabled={busy === u.id} onClick={() => void responder(u, 'rechazar')}>
                      Eliminar
                    </Button>
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Pantalla>
  )
}

export function BestFriendsPage() {
  const yo = useYo()
  const [q, setQ] = useState('')
  const amigos = useAsync(() => usuariosApi.mejoresAmigos(yo.id), [yo.id])
  const { items: segItems, error: segError, loading: segLoading, done: segDone, reload: segReload, sentinelRef: segSentinel } = useInfinite((offset, limit) => usuariosApi.seguidores(yo.id, { offset, limit }), [yo.id], 50)
  const [busy, setBusy] = useState<number | null>(null)
  const ids = new Set((amigos.data ?? []).map((u) => u.id))

  const alternar = async (u: UsuarioResumen) => {
    setBusy(u.id)
    try {
      if (ids.has(u.id)) {
        await usuariosApi.quitarMejorAmigo(yo.id, u.id)
        amigos.setData((p) => (p ?? []).filter((x) => x.id !== u.id))
      } else {
        await usuariosApi.agregarMejorAmigo(yo.id, u.id)
        amigos.setData((p) => [...(p ?? []), u])
      }
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(null)
    }
  }
  const filtrados = segItems.filter((u) => u.username.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <Pantalla title="Mejores amigos">
      <div className="flex items-start gap-3 px-4 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amigos text-white">
          <Icon name="star" fill />
        </span>
        <p className="type-body-m text-on-surface-variant">
          Solo tus mejores amigos verán las stories que compartas con ellos. No le avisamos a nadie cuando lo agregás o lo quitás. Solo podés agregar a personas que te siguen.
        </p>
      </div>
      <div className="px-4 pb-2">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar" />
      </div>
      {(segError && segItems.length === 0) || amigos.error ? (
        <ErrorState
          error={segError ?? amigos.error}
          onRetry={() => {
            segReload()
            amigos.reload()
          }}
        />
      ) : (segLoading && segItems.length === 0) || amigos.loading ? (
        <CenteredLoader />
      ) : segDone && segItems.length === 0 ? (
        <EmptyState icon="group" title="Aún no tenés seguidores" />
      ) : (
        <ul>
          {filtrados.map((u) => {
            const on = ids.has(u.id)
            return (
              <li key={u.id}>
                <UserRow
                  usuario={u}
                  action={
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={on ? `Quitar a ${u.username} de mejores amigos` : `Añadir a ${u.username} a mejores amigos`}
                      disabled={busy === u.id}
                      onClick={() => void alternar(u)}
                      className={cn(
                        'state spring-effects flex size-7 items-center justify-center rounded-full border-2',
                        on ? 'border-amigos bg-amigos text-white' : 'border-outline',
                      )}
                    >
                      {on && <Icon name="check" size={18} />}
                    </button>
                  }
                />
              </li>
            )
          })}
        </ul>
      )}
      {!segDone && <div ref={segSentinel} aria-hidden="true" className="h-1" />}
    </Pantalla>
  )
}

export function BlockedPage() {
  const lista = useAsync(() => usuariosApi.bloqueados(), [])
  const [conf, setConf] = useState<UsuarioResumen | null>(null)

  const desbloquear = async (u: UsuarioResumen) => {
    try {
      await usuariosApi.desbloquear(u.id)
      lista.setData((p) => (p ?? []).filter((x) => x.id !== u.id))
      snackbar(`Desbloqueaste a ${u.username}`)
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  return (
    <Pantalla title="Cuentas bloqueadas">
      {lista.loading ? (
        <CenteredLoader />
      ) : lista.error ? (
        <ErrorState error={lista.error} onRetry={lista.reload} />
      ) : (lista.data ?? []).length === 0 ? (
        <EmptyState icon="block" title="No bloqueaste a nadie" text="Cuando bloquees a alguien, aparecerá acá." />
      ) : (
        <ul className="pt-2">
          {(lista.data ?? []).map((u) => (
            <li key={u.id}>
              <UserRow
                usuario={u}
                action={
                  <Button size="sm" variant="tonal" onClick={() => setConf(u)}>
                    Desbloquear
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <Confirm
        open={!!conf}
        title={conf ? `¿Desbloquear a ${conf.username}?` : ''}
        text="Podrá ver tus publicaciones y seguirte. No le avisaremos que lo desbloqueaste."
        confirmLabel="Desbloquear"
        onConfirm={() => {
          if (conf) void desbloquear(conf)
        }}
        onClose={() => setConf(null)}
      />
    </Pantalla>
  )
}
