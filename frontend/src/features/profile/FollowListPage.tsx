/** Seguidores / seguidos de un perfil (HU3). */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { FollowButton, ScreenHeader, UserRow } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { SearchBar, Tabs } from '../../components/ui/Controls'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Confirm } from '../../components/ui/Overlay'
import { useAsync, useInfinite } from '../../lib/hooks'
import { ApiError, mensajeDeError } from '../../services/client'
import * as usuariosApi from '../../services/usuarios'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { UsuarioResumen } from '../../types/api'

export function FollowListPage({ tipo }: { tipo: 'seguidores' | 'seguidos' }) {
  const { username = '' } = useParams()
  const navigate = useNavigate()
  const perfil = useAsync(() => usuariosApi.perfil(username), [username])

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <ScreenHeader title={username} onBack={() => navigate(`/${username}`)} />
      <Tabs
        items={[
          { id: 'seguidores', label: 'Seguidores', icon: 'group' },
          { id: 'seguidos', label: 'Seguidos', icon: 'person_check' },
        ]}
        value={tipo}
        onChange={(id) => navigate(`/${username}/${id}`, { replace: true })}
      />
      {perfil.loading ? (
        <CenteredLoader />
      ) : perfil.error ? (
        perfil.error instanceof ApiError && perfil.error.status === 404 ? (
          <EmptyState icon="link_off" title="Perfil no disponible" />
        ) : (
          <ErrorState error={perfil.error} onRetry={perfil.reload} />
        )
      ) : perfil.data ? (
        <Lista key={`${perfil.data.id}-${tipo}`} usuarioId={perfil.data.id} tipo={tipo} />
      ) : null}
    </div>
  )
}

function Lista({ usuarioId, tipo }: { usuarioId: number; tipo: 'seguidores' | 'seguidos' }) {
  const yo = useYo()
  const [q, setQ] = useState('')
  const [quitar, setQuitar] = useState<UsuarioResumen | null>(null)
  const misSeguidos = useAsync(() => usuariosApi.seguidos(yo.id, { limit: 50 }).catch(() => []), [yo.id])
  const { items: listaItems, error: listaError, loading: listaLoading, done: listaDone, reload: listaReload, setItems: listaSetItems, sentinelRef: listaSentinel } = useInfinite(
    (offset, limit) => (tipo === 'seguidores' ? usuariosApi.seguidores(usuarioId, { offset, limit }) : usuariosApi.seguidos(usuarioId, { offset, limit })),
    [usuarioId, tipo],
    30,
  )
  const esMia = usuarioId === yo.id && tipo === 'seguidores'
  const sigo = new Set((misSeguidos.data ?? []).map((u) => u.id))

  if (listaError && listaItems.length === 0) {
    if (listaError instanceof ApiError && listaError.status === 403)
      return <EmptyState icon="lock" title="Esta cuenta es privada" text="Seguila para ver sus fotos y videos." />
    return <ErrorState error={listaError} onRetry={listaReload} />
  }

  const filtrados = listaItems.filter((u) => u.username.toLowerCase().includes(q.trim().toLowerCase()))

  const eliminar = async (u: UsuarioResumen) => {
    try {
      await usuariosApi.quitarSeguidor(yo.id, u.id)
      listaSetItems((p) => p.filter((x) => x.id !== u.id))
      snackbar(`Eliminaste a ${u.username} de tus seguidores`)
    } catch (e) {
      snackbar(mensajeDeError(e))
    }
  }

  return (
    <div>
      <div className="px-4 py-3">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar" />
      </div>
      {listaLoading && listaItems.length === 0 || misSeguidos.loading ? (
        <CenteredLoader />
      ) : listaDone && listaItems.length === 0 ? (
        <EmptyState icon="group" title={tipo === 'seguidores' ? 'Aún no hay seguidores' : 'Aún no sigue a nadie'} />
      ) : (
        <ul>
          {filtrados.map((u) => (
            <li key={u.id}>
              <UserRow
                usuario={u}
                action={
                  u.id === yo.id ? undefined : esMia ? (
                    <Button size="sm" variant="tonal" onClick={() => setQuitar(u)}>
                      Eliminar
                    </Button>
                  ) : (
                    <FollowButton usuarioId={u.id} relacion={sigo.has(u.id) ? 'siguiendo' : 'ninguna'} />
                  )
                }
              />
            </li>
          ))}
          {filtrados.length === 0 && <p className="type-body-m px-4 py-6 text-center text-on-surface-variant">No se encontraron resultados.</p>}
        </ul>
      )}
      {!listaDone && <div ref={listaSentinel} aria-hidden="true" className="h-1" />}
      <Confirm
        open={!!quitar}
        title="¿Eliminar seguidor?"
        text={quitar ? `No le avisaremos a ${quitar.username} que lo eliminaste de tus seguidores.` : undefined}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (quitar) void eliminar(quitar)
        }}
        onClose={() => setQuitar(null)}
      />
    </div>
  )
}
