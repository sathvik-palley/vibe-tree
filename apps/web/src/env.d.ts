/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string
  readonly VITE_PROJECT_PATH: string
  readonly VITE_AUTO_LOAD_PROJECTS: string
  readonly VITE_DEFAULT_PROJECT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
