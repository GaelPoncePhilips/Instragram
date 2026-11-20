import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useIsMobile } from '../../lib/hooks'
import { ChatPane } from './Chat'
import { Inbox } from './Inbox'
import { NuevoMensaje } from './NuevoMensaje'

export function DirectPage() {
  const { convId } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [refreshKey, setRefreshKey] = useState(0)
  const id = convId ? Number(convId) : null
  const nuevo = pathname === '/direct/nuevo'
  const tab = pathname === '/direct/solicitudes' ? 'solicitudes' : 'mensajes'
  const actividad = () => setRefreshKey((k) => k + 1)
  const irNuevo = () => navigate('/direct/nuevo')

  const chat = id !== null && Number.isFinite(id) ? <ChatPane key={id} convId={id} isMobile={isMobile} onActividad={actividad} /> : null

  if (isMobile) {
    return (
      <div className={chat ? 'h-dvh' : 'h-[calc(100dvh-var(--nav-h))]'}>
        {chat ?? <Inbox activeId={null} tab={tab} refreshKey={refreshKey} onNuevo={irNuevo} />}
        {nuevo && <NuevoMensaje />}
      </div>
    )
  }
  return (
    <div className="flex h-dvh">
      <aside className="h-full w-[397px] shrink-0 border-r border-outline-variant/60">
        <Inbox activeId={id} tab={tab} refreshKey={refreshKey} onNuevo={irNuevo} />
      </aside>
      <section className="h-full min-w-0 flex-1">
        {chat ?? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 flex size-24 items-center justify-center rounded-full border-2 border-on-surface">
              <Icon name="send" size={48} />
            </span>
            <h2 className="type-title-l">Tus mensajes</h2>
            <p className="type-body-m mt-1 text-on-surface-variant">Enviá fotos y mensajes privados a un amigo o grupo</p>
            <Button className="mt-5" onClick={irNuevo}>
              Enviar mensaje
            </Button>
          </div>
        )}
      </section>
      {nuevo && <NuevoMensaje />}
    </div>
  )
}
