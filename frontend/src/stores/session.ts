/** Sesión: usuario logueado, login/logout y cambio de cuenta de desarrollo sin recargar. */
import { create } from 'zustand'
import { auth, setTemporalIdentity } from '../services/client'
import * as usuariosApi from '../services/usuarios'
import type { Usuario } from '../types/api'

type Estado = 'iniciando' | 'anonimo' | 'autenticado'

interface SessionState {
  estado: Estado
  usuario: Usuario | null
  /** Cambia con cada login: la app remonta las rutas para limpiar estado de la cuenta anterior. */
  sesionId: number
  iniciar: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refrescarUsuario: () => Promise<void>
  setUsuario: (u: Usuario) => void
}

export const useSession = create<SessionState>((set, get) => ({
  estado: 'iniciando',
  usuario: null,
  sesionId: 0,

  async iniciar() {
    if (!auth.getToken()) {
      set({ estado: 'anonimo' })
      return
    }
    try {
      const u = await usuariosApi.me()
      setTemporalIdentity(u.username)
      set({ usuario: u, estado: 'autenticado' })
    } catch {
      auth.setToken(null)
      set({ estado: 'anonimo', usuario: null })
    }
  },

  async login(email, password) {
    const { access_token } = await usuariosApi.login({ email, password })
    auth.setToken(access_token)
    const u = await usuariosApi.me()
    setTemporalIdentity(u.username)
    set({ usuario: u, estado: 'autenticado', sesionId: get().sesionId + 1 })
  },

  logout() {
    auth.setToken(null)
    setTemporalIdentity(null)
    set({ usuario: null, estado: 'anonimo', sesionId: get().sesionId + 1 })
  },

  async refrescarUsuario() {
    const u = await usuariosApi.me()
    set({ usuario: u })
  },

  setUsuario(u) {
    set({ usuario: u })
  },
}))

auth.onUnauthorized(() => {
  if (useSession.getState().estado === 'autenticado') useSession.getState().logout()
})

/** Usuario logueado (las rutas privadas garantizan que existe). */
export function useYo(): Usuario {
  const u = useSession((s) => s.usuario)
  if (!u) throw new Error('useYo fuera de una ruta autenticada')
  return u
}
