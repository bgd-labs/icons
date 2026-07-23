/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the submit endpoint that re-validates and opens the PR. */
  readonly VITE_SUBMIT_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
