/**
 * PWA: registro del service worker e instalación.
 * El SW solo se registra en el build de producción (en `vite dev` cachearía módulos en desarrollo)
 * y solo en contextos seguros (https o localhost), que es lo que exige el navegador.
 */
import { create } from 'zustand'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaState {
  /** El navegador ofrece instalar (Chrome/Edge/Android). */
  instalable: boolean
  /** Ya corre como app instalada. */
  instalada: boolean
  instalar: () => Promise<void>
}

let diferido: BeforeInstallPromptEvent | null = null

const enStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const usePwa = create<PwaState>((set) => ({
  instalable: false,
  instalada: enStandalone(),
  async instalar() {
    if (!diferido) return
    await diferido.prompt()
    const { outcome } = await diferido.userChoice
    diferido = null
    set({ instalable: false, instalada: outcome === 'accepted' })
  },
}))

/** iOS no tiene beforeinstallprompt: se instala con Compartir → "Agregar a inicio". */
export const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function instalarPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    diferido = e as BeforeInstallPromptEvent
    usePwa.setState({ instalable: true })
  })
  window.addEventListener('appinstalled', () => usePwa.setState({ instalable: false, instalada: true }))

  if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err: unknown) => console.warn('No se pudo registrar el service worker', err))
    })
  }
}
