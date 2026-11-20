/** Estado de UI global: snackbars, selector "Crear", paneles laterales y tema. */
import { create } from 'zustand'
import { aplicarTema, type Tema } from '../theme/color'

export interface Snack {
  id: number
  texto: string
  accion?: { label: string; onClick: () => void }
}

export type Panel = 'notificaciones' | 'buscar' | null

interface UiState {
  snacks: Snack[]
  crearAbierto: boolean
  panel: Panel
  tema: Tema
  snackbar: (texto: string, accion?: Snack['accion']) => void
  cerrarSnack: (id: number) => void
  setCrear: (v: boolean) => void
  setPanel: (p: Panel) => void
  setTema: (t: Tema) => void
}

const TEMA_KEY = 'keepsy.tema'
function temaInicial(): Tema {
  try {
    const t = localStorage.getItem(TEMA_KEY)
    return t === 'claro' || t === 'oscuro' ? t : 'sistema'
  } catch {
    return 'sistema'
  }
}

let snackSeq = 0

export const useUi = create<UiState>((set, get) => ({
  snacks: [],
  crearAbierto: false,
  panel: null,
  tema: temaInicial(),
  snackbar(texto, accion) {
    const id = ++snackSeq
    set({ snacks: [...get().snacks.slice(-2), { id, texto, accion }] })
    window.setTimeout(() => get().cerrarSnack(id), 4000)
  },
  cerrarSnack(id) {
    set({ snacks: get().snacks.filter((s) => s.id !== id) })
  },
  setCrear(v) {
    set({ crearAbierto: v })
  },
  setPanel(p) {
    set({ panel: get().panel === p ? null : p })
  },
  setTema(t) {
    try {
      localStorage.setItem(TEMA_KEY, t)
    } catch {
      /* sin almacenamiento */
    }
    aplicarTema(t)
    set({ tema: t })
  },
}))

/** Atajo para mostrar un snackbar desde cualquier lado. */
export const snackbar = (texto: string, accion?: Snack['accion']) => useUi.getState().snackbar(texto, accion)
