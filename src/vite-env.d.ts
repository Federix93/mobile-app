/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATABRICKS_HOST: string
  readonly VITE_DATABRICKS_TOKEN?: string
  readonly VITE_GENIE_SPACE_ID?: string
  readonly VITE_SQL_WAREHOUSE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

