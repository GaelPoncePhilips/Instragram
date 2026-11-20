/** Lectura tipada de variables de entorno (ver .env.example). */

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return value === undefined || value === '' || Number.isNaN(n) ? fallback : n
}

const e = import.meta.env

export const env = {
  useMock: bool(e.VITE_USE_MOCK, true),
  apiUrl: (e.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, ''),
  mockLatencyMs: num(e.VITE_MOCK_LATENCY_MS, 250),
  mockFailRate: num(e.VITE_MOCK_FAIL_RATE, 0),
} as const

/**
 * TEMPORAL — cada parche se apaga con VITE_TEMPORAL_<NOMBRE>=false
 * cuando el backend real implementa el endpoint.
 */
export const temporal = {
  notificaciones: bool(e.VITE_TEMPORAL_NOTIFICACIONES, true),
  busqueda: bool(e.VITE_TEMPORAL_BUSQUEDA, true),
  usuariosPorId: bool(e.VITE_TEMPORAL_USUARIOS_POR_ID, true),
  albumVideo: bool(e.VITE_TEMPORAL_ALBUM_VIDEO, true),
  avatares: bool(e.VITE_TEMPORAL_AVATARES, true),
  guardados: bool(e.VITE_TEMPORAL_GUARDADOS, true),
  devCuentas: bool(e.VITE_TEMPORAL_DEV_CUENTAS, true),
  dmInvitacion: bool(e.VITE_TEMPORAL_DM_INVITACION, true),
} as const
