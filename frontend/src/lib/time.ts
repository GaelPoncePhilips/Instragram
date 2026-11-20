/** Fechas relativas en español, al estilo de Instagram. */

const MIN = 60_000
const H = 60 * MIN
const D = 24 * H

/** "ahora", "5 min", "3 h", "2 d", "4 sem" o fecha corta. */
export function tiempoCorto(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  if (diff < MIN) return 'ahora'
  if (diff < H) return `${Math.floor(diff / MIN)} min`
  if (diff < D) return `${Math.floor(diff / H)} h`
  if (diff < 7 * D) return `${Math.floor(diff / D)} d`
  if (diff < 30 * D) return `${Math.floor(diff / (7 * D))} sem`
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

/** "hace 5 minutos", "hace 3 horas", "hace 2 días", "12 de marzo". */
export function tiempoLargo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  if (diff < MIN) return 'justo ahora'
  if (diff < H) {
    const n = Math.floor(diff / MIN)
    return `hace ${n} ${n === 1 ? 'minuto' : 'minutos'}`
  }
  if (diff < D) {
    const n = Math.floor(diff / H)
    return `hace ${n} ${n === 1 ? 'hora' : 'horas'}`
  }
  if (diff < 7 * D) {
    const n = Math.floor(diff / D)
    return `hace ${n} ${n === 1 ? 'día' : 'días'}`
  }
  return fechaLarga(iso)
}

export function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Separador de día en el chat: "Hoy", "Ayer", "lunes", "12 mar 2026". */
export function etiquetaDia(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dias = Math.round((a - b) / D)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias < 7) return d.toLocaleDateString('es-AR', { weekday: 'long' })
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

/** 1234 → "1234", 12345 → "12,3 mil", 1.2M → "1,2 M" */
export function numeroCorto(n: number): string {
  if (n < 10_000) return n.toLocaleString('es-AR')
  if (n < 1_000_000) return `${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} mil`
  return `${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`
}

export function plural(n: number, uno: string, varios: string): string {
  return `${numeroCorto(n)} ${n === 1 ? uno : varios}`
}
