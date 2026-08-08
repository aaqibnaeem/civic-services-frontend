/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL for the API, including the version segment.
   * Dev: leave unset — defaults to `/api/v1`, which the Vite proxy forwards to
   * http://localhost:8000. Prod: `https://<your-api-host>/api/v1`.
   */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
