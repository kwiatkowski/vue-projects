/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** REST base for `npm run dev` without WordPress serving the shell, default /wp-json/projects/v1/ */
  readonly VITE_REST_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
