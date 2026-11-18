// TEMPORAL (hueco 12) — invitación a álbum también por DM con call to action.
// El contrato no tiene un mensaje con `album_id`: el DM viaja como texto con el enlace
// /albumes/{id} y el chat lo detecta para dibujar la tarjeta con "Aceptar" / "Ver álbum".
// Borrar cuando el backend envíe el DM al invitar (o Mensaje tenga album_id). Flag: VITE_TEMPORAL_DM_INVITACION.
import { temporal } from '../../config/env'
import type { Album } from '../../types/api'
import { crearConversacion, enviarMensaje } from '../dms'

const RE = /\/albumes\/(\d+)\b/

export function textoInvitacion(album: Album): string {
  return `📸 Te invité a «${album.titulo}», un álbum compartido. Sumate y subí tus fotos y videos: ${window.location.origin}/albumes/${album.id}`
}

/** Envía el DM de invitación. No falla la invitación si el DM no se puede enviar (p. ej. bloqueo). */
export async function enviarInvitacionPorDm(album: Album, usuarioId: number): Promise<void> {
  if (!temporal.dmInvitacion) return
  try {
    const conv = await crearConversacion({ participantes: [usuarioId] })
    await enviarMensaje(conv.id, { texto: textoInvitacion(album) })
  } catch {
    /* la invitación ya quedó hecha; el DM es un extra */
  }
}

/** Si el texto es una invitación a álbum, devuelve el id del álbum. */
export function albumDeInvitacion(texto: string | null): number | null {
  if (!temporal.dmInvitacion || !texto || !texto.startsWith('📸 Te invité a «')) return null
  const m = RE.exec(texto)
  return m ? Number(m[1]) : null
}
