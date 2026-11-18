/** Ajustes estilo M3: privacidad, reels, accesos y tema. */
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { DevSwitcherDialog } from '../../app/layout/DevSwitcher'
import { ScreenHeader } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { FilterChip, Switch } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { Confirm } from '../../components/ui/Overlay'
import { useAsync } from '../../lib/hooks'
import { mensajeDeError } from '../../services/client'
import * as usuariosApi from '../../services/usuarios'
import { useSession, useYo } from '../../stores/session'
import { snackbar, useUi } from '../../stores/ui'
import type { UpdateUsuarioBody } from '../../types/api'
import { esIOS, usePwa } from '../../pwa'

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="py-2">
      <h2 className="type-title-s px-4 pb-1 pt-3 text-primary">{titulo}</h2>
      {children}
    </section>
  )
}

function Fila({ icon, label, to, onClick, extra, destructive }: { icon: string; label: string; to?: string; onClick?: () => void; extra?: ReactNode; destructive?: boolean }) {
  const contenido = (
    <>
      <Icon name={icon} className={destructive ? 'text-error' : 'text-on-surface-variant'} />
      <span className={`type-body-l flex-1 text-left ${destructive ? 'text-error' : ''}`}>{label}</span>
      {extra}
      {to && <Icon name="chevron_right" className="text-on-surface-variant" />}
    </>
  )
  const cls = 'state flex min-h-14 w-full items-center gap-4 px-4'
  return to ? (
    <Link to={to} className={cls}>
      {contenido}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {contenido}
    </button>
  )
}

export function SettingsPage() {
  const yo = useYo()
  const navigate = useNavigate()
  const { tema, setTema } = useUi()
  const [dev, setDev] = useState(false)
  const [confirmarPublica, setConfirmarPublica] = useState(false)
  const [busy, setBusy] = useState(false)
  const pendientes = useAsync(() => usuariosApi.solicitudes(yo.id, { limit: 50 }).catch(() => []), [yo.id])
  const nPend = pendientes.data?.length ?? 0
  const { instalable, instalada, instalar } = usePwa()

  const actualizar = async (body: UpdateUsuarioBody) => {
    setBusy(true)
    try {
      const u = await usuariosApi.actualizarUsuario(yo.id, body)
      useSession.getState().setUsuario(u)
      if (body.es_privada === false) pendientes.reload()
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[600px] pb-10">
      <ScreenHeader title="Configuración" onBack={() => navigate(`/${yo.username}`)} />
      <Link to="/cuenta/editar" className="state mx-4 mt-4 flex items-center gap-4 rounded-lg bg-surface-container p-4">
        <Avatar username={yo.username} size={56} />
        <span className="min-w-0 flex-1">
          <span className="type-title-m emphasized block truncate">{yo.nombre}</span>
          <span className="type-body-m block truncate text-on-surface-variant">@{yo.username}</span>
        </span>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-secondary-container px-4 text-on-secondary-container type-label-l">
          <Icon name="edit" size={18} />
          Editar perfil
        </span>
      </Link>
      <Seccion titulo="Privacidad de la cuenta">
        <div className="px-4">
          <Switch
            checked={yo.es_privada}
            disabled={busy}
            onChange={(v) => {
              if (!v && nPend > 0) setConfirmarPublica(true)
              else void actualizar({ es_privada: v })
            }}
            label="Cuenta privada"
            description="Solo las personas que apruebes podrán ver tus fotos, videos y stories."
          />
        </div>
      </Seccion>
      <Seccion titulo="Reels">
        <div className="px-4">
          <Switch
            checked={yo.reels_desactivados}
            disabled={busy}
            onChange={(v) => void actualizar({ reels_desactivados: v })}
            label="Ocultar reels"
            description="Ocultar reels del feed y desactivar la pestaña."
          />
        </div>
      </Seccion>
      <Seccion titulo="Tu actividad">
        <Fila icon="insights" label="Estadísticas" to="/cuenta/estadisticas" />
        <Fila icon="person_remove" label="No me siguen" to="/cuenta/no-me-siguen" />
        <Fila
          icon="person_add"
          label="Solicitudes de seguimiento"
          to="/cuenta/solicitudes"
          extra={nPend > 0 && <span className="type-label-m emphasized rounded-full bg-primary px-2 py-0.5 text-on-primary">{nPend}</span>}
        />
      </Seccion>
      <Seccion titulo="Quién puede ver tu contenido">
        <Fila icon="crown" label="Mejores amigos" to="/cuenta/mejores-amigos" />
        <Fila icon="block" label="Cuentas bloqueadas" to="/cuenta/bloqueados" />
      </Seccion>
      {!instalada && (
        <Seccion titulo="App">
          {instalable ? (
            <Fila icon="install_mobile" label="Instalar Ronda en este dispositivo" onClick={() => void instalar()} />
          ) : (
            <p className="type-body-m flex items-start gap-4 px-4 py-3 text-on-surface-variant">
              <Icon name="install_mobile" className="shrink-0" />
              {esIOS()
                ? 'Para instalarla: tocá Compartir y elegí "Agregar a inicio".'
                : 'Para instalarla, abrí Ronda por https (o localhost) y usá "Instalar app" en el menú del navegador.'}
            </p>
          )}
        </Seccion>
      )}
      <Seccion titulo="Tema">
        <div className="flex flex-wrap gap-2 px-4 py-2">
          <FilterChip label="Claro" icon="light_mode" selected={tema === 'claro'} onClick={() => setTema('claro')} />
          <FilterChip label="Oscuro" icon="dark_mode" selected={tema === 'oscuro'} onClick={() => setTema('oscuro')} />
          <FilterChip label="Sistema" icon="contrast" selected={tema === 'sistema'} onClick={() => setTema('sistema')} />
        </div>
      </Seccion>
      <Seccion titulo="Inicio de sesión">
        <Fila icon="switch_account" label="Cambiar de cuenta (dev)" onClick={() => setDev(true)} />
        <Fila icon="logout" label="Cerrar sesión" destructive onClick={() => useSession.getState().logout()} />
      </Seccion>
      <DevSwitcherDialog open={dev} onClose={() => setDev(false)} />
      <Confirm
        open={confirmarPublica}
        title="¿Cambiar a cuenta pública?"
        text={`Cualquiera podrá ver tus publicaciones y stories. Se aceptarán las ${nPend} solicitudes pendientes.`}
        confirmLabel="Cambiar a pública"
        onConfirm={() => void actualizar({ es_privada: false })}
        onClose={() => setConfirmarPublica(false)}
      />
    </div>
  )
}
