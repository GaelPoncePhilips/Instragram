/** Contadores de la navegación: notificaciones sin leer (TEMPORAL) y mensajes sin leer. */
import { create } from 'zustand'
import { conversaciones, solicitudesDeMensaje } from '../services/dms'
import { cantidadNoLeidas } from '../services/temporal'

interface BadgesState {
  notificaciones: number
  mensajes: number
  solicitudesMensaje: number
  refrescar: () => Promise<void>
  setNotificaciones: (n: number) => void
  reset: () => void
}

export const useBadges = create<BadgesState>((set) => ({
  notificaciones: 0,
  mensajes: 0,
  solicitudesMensaje: 0,
  async refrescar() {
    const [n, convs, sols] = await Promise.allSettled([cantidadNoLeidas(), conversaciones(), solicitudesDeMensaje()])
    set({
      notificaciones: n.status === 'fulfilled' ? n.value.cantidad : 0,
      // Como Instagram: el contador del avión cuenta conversaciones con mensajes sin leer.
      mensajes: convs.status === 'fulfilled' ? convs.value.filter((c) => c.no_leidos > 0).length : 0,
      solicitudesMensaje: sols.status === 'fulfilled' ? sols.value.length : 0,
    })
  },
  setNotificaciones(n) {
    set({ notificaciones: n })
  },
  reset() {
    set({ notificaciones: 0, mensajes: 0, solicitudesMensaje: 0 })
  },
}))
