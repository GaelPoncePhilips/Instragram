import { useNavigate } from 'react-router'
import { ScreenHeader } from '../../components/shared'
import { NotificationsList } from './NotificationsList'

export function NotificationsPage() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto w-full max-w-[640px]">
      <ScreenHeader title="Notificaciones" onBack={() => navigate(-1)} />
      <NotificationsList />
    </div>
  )
}
