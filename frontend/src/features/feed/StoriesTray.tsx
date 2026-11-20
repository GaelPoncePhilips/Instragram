import { Link } from 'react-router'
import { Avatar, type Anillo } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { useAsync } from '../../lib/hooks'
import * as storiesApi from '../../services/stories'
import { useYo } from '../../stores/session'
import type { StoriesDeUsuario } from '../../types/api'

function anilloDe(s: StoriesDeUsuario): Anillo {
  if (s.todas_vistas) return 'visto'
  if (s.stories.some((x) => !x.vista && x.solo_mejores_amigos)) return 'amigos'
  return 'sin-ver'
}

/** Fila de stories del inicio: la propia primero, luego las de seguidos. */
export function StoriesTray() {
  const yo = useYo()
  const seguidos = useAsync(() => storiesApi.storiesDeSeguidos(yo.id), [yo.id])
  const mias = useAsync(() => storiesApi.storiesPublicadas(yo.id), [yo.id])
  const tengo = (mias.data?.length ?? 0) > 0

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto px-3 py-3 md:px-0" role="list" aria-label="Stories">
      <div role="listitem" className="relative flex w-[74px] shrink-0 flex-col items-center gap-1">
        <Link to={tengo ? `/stories/${yo.id}` : '/crear/story'} aria-label={tengo ? 'Ver tu story' : 'Crear story'}>
          <Avatar username={yo.username} size={66} anillo={tengo ? 'visto' : 'ninguno'} />
        </Link>
        <Link
          to="/crear/story"
          aria-label="Crear story"
          className="absolute top-[48px] right-1 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-primary text-on-primary"
        >
          <Icon name="add" size={16} />
        </Link>
        <span className="type-label-s w-full truncate text-center text-on-surface-variant">Tu story</span>
      </div>
      {seguidos.loading && !seguidos.data
        ? Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex w-[74px] shrink-0 flex-col items-center gap-1" aria-hidden="true">
              <span className="size-[66px] rounded-full bg-surface-container-highest" />
              <span className="h-3 w-12 rounded-xs bg-surface-container-highest" />
            </div>
          ))
        : (seguidos.data ?? []).map((s) => (
            <Link
              key={s.usuario.id}
              role="listitem"
              to={`/stories/${s.usuario.id}`}
              className="flex w-[74px] shrink-0 flex-col items-center gap-1"
              aria-label={`Story de ${s.usuario.username}`}
            >
              <Avatar username={s.usuario.username} size={66} anillo={anilloDe(s)} />
              <span className="type-label-s w-full truncate text-center">{s.usuario.username}</span>
            </Link>
          ))}
    </div>
  )
}
