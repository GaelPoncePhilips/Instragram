import { useYo } from '../../stores/session'
import { CreateForm } from './CreateForm'

export function CreatePostPage() {
  const yo = useYo()
  return <CreateForm tipo="foto" titulo="Nueva publicación" destino={`/${yo.username}`} mensaje="Publicado" />
}
