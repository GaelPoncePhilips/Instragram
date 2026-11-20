/** Estadísticas (HU12): frases simples, sin gráficos. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ScreenHeader } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { FilterChip } from '../../components/ui/Controls'
import { CenteredLoader, ErrorState } from '../../components/ui/Feedback'
import { useAsync } from '../../lib/hooks'
import { numeroCorto, plural } from '../../lib/time'
import * as usuariosApi from '../../services/usuarios'
import { useYo } from '../../stores/session'

function isoDia(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}
function haceDias(n: number): string {
  return isoDia(new Date(Date.now() - n * 86_400_000))
}

type Atajo = '7' | '30' | 'todo' | null

function CampoFecha({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="type-label-m text-on-surface-variant">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xs border border-outline bg-transparent px-3 type-body-l text-on-surface outline-none focus:border-2 focus:border-primary"
      />
    </label>
  )
}

export function StatsPage() {
  const yo = useYo()
  const navigate = useNavigate()
  const [desde, setDesde] = useState(() => haceDias(30))
  const [hasta, setHasta] = useState(() => isoDia(new Date()))
  const [atajo, setAtajo] = useState<Atajo>('30')
  const stats = useAsync(() => usuariosApi.estadisticas(yo.id, desde || undefined, hasta || undefined), [yo.id, desde, hasta])

  const elegir = (a: Exclude<Atajo, null>) => {
    setAtajo(a)
    setHasta(isoDia(new Date()))
    setDesde(a === 'todo' ? '' : haceDias(Number(a)))
  }
  const s = stats.data

  return (
    <div className="mx-auto w-full max-w-[600px] pb-10">
      <ScreenHeader title="Estadísticas" onBack={() => navigate('/cuenta/ajustes')} />
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="7 días" selected={atajo === '7'} onClick={() => elegir('7')} />
          <FilterChip label="30 días" selected={atajo === '30'} onClick={() => elegir('30')} />
          <FilterChip label="Todo" selected={atajo === 'todo'} onClick={() => elegir('todo')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CampoFecha
            label="Desde"
            value={desde}
            onChange={(v) => {
              setDesde(v)
              setAtajo(null)
            }}
          />
          <CampoFecha
            label="Hasta"
            value={hasta}
            onChange={(v) => {
              setHasta(v)
              setAtajo(null)
            }}
          />
        </div>
      </div>
      {stats.loading ? (
        <CenteredLoader />
      ) : stats.error ? (
        <ErrorState error={stats.error} onRetry={stats.reload} />
      ) : s ? (
        <div className="flex flex-col gap-8 px-4 pt-8">
          <p className="type-headline-s">
            Publicaste <span className="emphasized">{plural(s.cantidad_posts, 'foto', 'fotos')}</span>
          </p>
          <p className="type-headline-s">
            En promedio, <span className="type-display-s emphasized">{s.promedio_likes_por_post.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</span> Me gusta por publicación
          </p>
          {s.post_con_mas_likes && (
            <div className="flex flex-col gap-3">
              <p className="type-title-m">Tu publicación con más Me gusta</p>
              <Link to={`/p/${s.post_con_mas_likes.id}`} className="state flex items-center gap-4 rounded-md p-2">
                <img src={s.post_con_mas_likes.url_imagen} alt="Publicación con más Me gusta" className="size-24 rounded-xs object-cover" />
                <span className="type-title-l emphasized">{numeroCorto(s.post_con_mas_likes.likes)} Me gusta</span>
              </Link>
            </div>
          )}
          {s.seguidor_que_mas_likes_dio && (
            <Link to={`/${s.seguidor_que_mas_likes_dio.username}`} className="state flex items-center gap-4 rounded-md p-2">
              <Avatar username={s.seguidor_que_mas_likes_dio.username} size={56} />
              <p className="type-title-l">
                Quien más te apoya: <span className="emphasized">@{s.seguidor_que_mas_likes_dio.username}</span> con{' '}
                {plural(s.seguidor_que_mas_likes_dio.likes, 'Me gusta', 'Me gusta')}
              </p>
            </Link>
          )}
        </div>
      ) : null}
    </div>
  )
}
