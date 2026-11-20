/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string
  readonly VITE_API_URL?: string
  readonly VITE_MOCK_LATENCY_MS?: string
  readonly VITE_MOCK_FAIL_RATE?: string
  readonly VITE_TEMPORAL_NOTIFICACIONES?: string
  readonly VITE_TEMPORAL_BUSQUEDA?: string
  readonly VITE_TEMPORAL_USUARIOS_POR_ID?: string
  readonly VITE_TEMPORAL_ALBUM_VIDEO?: string
  readonly VITE_TEMPORAL_AVATARES?: string
  readonly VITE_TEMPORAL_GUARDADOS?: string
  readonly VITE_TEMPORAL_DEV_CUENTAS?: string
  readonly VITE_TEMPORAL_DM_INVITACION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
