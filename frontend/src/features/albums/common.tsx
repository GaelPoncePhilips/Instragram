/** Piezas compartidas de álbumes compartidos (EXTRA, diferencial). */
import { useEffect, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { cn } from '../../lib/hooks'
import { usuarioPorId } from '../../services/temporal'
import type { Album, AlbumItem, UsuarioResumen } from '../../types/api'

export const miembrosAceptados = (a: Album) => a.miembros.filter((m) => m.estado === 'aceptado')

export function miRol(a: Album, yoId: number) {
  const m = a.miembros.find((x) => x.id === yoId)
  return {
    esMiembro: m?.estado === 'aceptado',
    esAdmin: m?.estado === 'aceptado' && m.rol === 'admin',
    pendiente: m?.estado === 'pendiente',
  }
}

export function contarMedia(items: AlbumItem[]): string {
  const videos = items.filter((i) => i.tipo === 'video').length
  const fotos = items.length - videos
  const partes: string[] = []
  if (fotos) partes.push(`${fotos} ${fotos === 1 ? 'foto' : 'fotos'}`)
  if (videos) partes.push(`${videos} ${videos === 1 ? 'video' : 'videos'}`)
  return partes.length ? partes.join(' y ') : 'Sin fotos todavía'
}

/** Avatares superpuestos con "+N" (como los álbumes de grupo). */
export function AvatarStack({ usuarios, max = 3, size = 24 }: { usuarios: UsuarioResumen[]; max?: number; size?: number }) {
  const visibles = usuarios.slice(0, max)
  const resto = usuarios.length - visibles.length
  return (
    <span className="flex items-center" aria-label={`${usuarios.length} participantes`}>
      {visibles.map((u, i) => (
        <span key={u.id} className={cn('rounded-full ring-2 ring-surface', i > 0 && '-ml-2')} style={{ zIndex: max - i }}>
          <Avatar username={u.username} size={size} alt="" />
        </span>
      ))}
      {resto > 0 && (
        <span
          className="-ml-2 flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container ring-2 ring-surface type-label-s emphasized"
          style={{ width: size, height: size }}
        >
          +{resto}
        </span>
      )}
    </span>
  )
}

/**
 * Resuelve el autor de un item: primero entre los miembros; si ya salió del álbum (su contenido permanece),
 * TEMPORAL (hueco 7): GET /usuarios/{id}/resumen.
 */
export function useAutor(usuarioId: number, miembros: UsuarioResumen[]): UsuarioResumen | null {
  const local = miembros.find((m) => m.id === usuarioId) ?? null
  const [remoto, setRemoto] = useState<UsuarioResumen | null>(null)
  useEffect(() => {
    if (local) return
    let vivo = true
    usuarioPorId(usuarioId)
      .then((u) => {
        if (vivo) setRemoto(u)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [usuarioId, local])
  return local ?? remoto
}
