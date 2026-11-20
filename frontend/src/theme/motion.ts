/**
 * Esquema de movimiento M3 con springs (valores de material-components-android, Motion.md).
 * Cada spring se convierte a una curva CSS `linear(...)` + duración, expuestas como
 * --md-motion-<token>-easing / --md-motion-<token>-duration.
 */

export interface SpringSpec {
  damping: number
  stiffness: number
}

export const SPRINGS = {
  'spatial-fast': { damping: 0.9, stiffness: 1400 },
  'spatial-default': { damping: 0.9, stiffness: 700 },
  'spatial-slow': { damping: 0.9, stiffness: 300 },
  'effects-fast': { damping: 1, stiffness: 3800 },
  'effects-default': { damping: 1, stiffness: 1600 },
  'effects-slow': { damping: 1, stiffness: 800 },
  /** Decisión propia (docs/DISENO.md §6): más rebote para like y FAB menu. */
  bounce: { damping: 0.6, stiffness: 500 },
} satisfies Record<string, SpringSpec>

export type SpringToken = keyof typeof SPRINGS

/** Respuesta al escalón de un oscilador amortiguado (masa 1), de 0 a 1. */
export function springCurve({ damping, stiffness }: SpringSpec): { points: number[]; durationMs: number } {
  const dt = 1 / 240
  let x = 0
  let v = 0
  const c = 2 * damping * Math.sqrt(stiffness)
  const samples: number[] = []
  let t = 0
  let quiet = 0
  while (t < 3) {
    const a = -stiffness * (x - 1) - c * v
    v += a * dt
    x += v * dt
    t += dt
    samples.push(x)
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) {
      quiet += 1
      if (quiet > 6) break
    } else quiet = 0
  }
  // Reducimos a ~40 puntos para la función linear().
  const step = Math.max(1, Math.floor(samples.length / 40))
  const points: number[] = [0]
  for (let i = step; i < samples.length; i += step) points.push(samples[i])
  points.push(1)
  return { points, durationMs: Math.round(t * 1000) }
}

export function springCss(spec: SpringSpec): { easing: string; duration: string } {
  const { points, durationMs } = springCurve(spec)
  return {
    easing: `linear(${points.map((p) => p.toFixed(4)).join(', ')})`,
    duration: `${durationMs}ms`,
  }
}

export function instalarMovimiento(): void {
  const root = document.documentElement
  for (const [token, spec] of Object.entries(SPRINGS)) {
    const { easing, duration } = springCss(spec)
    root.style.setProperty(`--md-motion-${token}-easing`, easing)
    root.style.setProperty(`--md-motion-${token}-duration`, duration)
  }
}

export function prefiereMenosMovimiento(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
