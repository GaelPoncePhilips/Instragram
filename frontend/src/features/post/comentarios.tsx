import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { IconButton } from '../../components/ui/IconButton'
import { cn } from '../../lib/hooks'
import { tiempoCorto } from '../../lib/time'
import { mensajeDeError } from '../../services/client'
import * as postsApi from '../../services/posts'
import { snackbar } from '../../stores/ui'
import type { Comentario } from '../../types/api'
import { RichText } from './RichText'

export const MAX_COMENTARIO = 300

/** Un comentario: avatar, username en negrita + texto, tiempo y borrar si corresponde. */
export function ComentarioItem({
  comentario,
  puedeBorrar,
  onBorrado,
}: {
  comentario: Comentario
  puedeBorrar: boolean
  onBorrado?: (id: number) => void
}) {
  const [busy, setBusy] = useState(false)
  const borrar = async () => {
    setBusy(true)
    try {
      await postsApi.borrarComentario(comentario.id)
      onBorrado?.(comentario.id)
    } catch (e) {
      snackbar(mensajeDeError(e))
      setBusy(false)
    }
  }
  return (
    <div className="group flex items-start gap-3 px-4 py-2">
      <Link to={`/${comentario.autor_username}`} className="shrink-0">
        <Avatar username={comentario.autor_username} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="type-body-m break-words">
          <Link to={`/${comentario.autor_username}`} className="emphasized mr-1.5 font-semibold">
            {comentario.autor_username}
          </Link>
          <RichText text={comentario.texto} />
        </p>
        <p className="type-label-s mt-0.5 text-on-surface-variant">{tiempoCorto(comentario.fecha)}</p>
      </div>
      {puedeBorrar && (
        <IconButton
          icon="delete"
          label="Eliminar comentario"
          size={18}
          disabled={busy}
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          onClick={() => void borrar()}
        />
      )}
    </div>
  )
}

/** Caja "Añade un comentario…" con validación 1–300 y contador. */
export function CajaComentario({
  postId,
  onComentado,
  autoFocus,
  className,
}: {
  postId: number
  onComentado: (c: Comentario) => void
  autoFocus?: boolean
  className?: string
}) {
  const [texto, setTexto] = useState('')
  const [busy, setBusy] = useState(false)
  const limpio = texto.trim()
  const valido = limpio.length >= 1 && limpio.length <= MAX_COMENTARIO
  const enviar = async () => {
    if (!valido || busy) return
    setBusy(true)
    try {
      const c = await postsApi.comentar(postId, limpio)
      onComentado(c)
      setTexto('')
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className={cn('flex items-center gap-2', className)}
      onSubmit={(e) => {
        e.preventDefault()
        void enviar()
      }}
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Añade un comentario…"
        aria-label="Añade un comentario"
        maxLength={MAX_COMENTARIO + 50}
        autoFocus={autoFocus}
        className="type-body-m min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-on-surface-variant"
      />
      {texto.length > 0 && (
        <span className={cn('type-label-s', limpio.length > MAX_COMENTARIO ? 'text-error' : 'text-on-surface-variant')}>
          {limpio.length}/{MAX_COMENTARIO}
        </span>
      )}
      {texto.length > 0 && (
        <button type="submit" disabled={!valido || busy} className="type-label-l emphasized text-primary disabled:opacity-40">
          Publicar
        </button>
      )}
    </form>
  )
}
