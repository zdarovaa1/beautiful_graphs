/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовый URL S3-бакета или прокси для GraphLayoutBundle */
  readonly VITE_S3_GRAPH_BASE_URL?: string
  /** Префикс ключей, напр. graphs/ */
  readonly VITE_S3_GRAPH_KEY_PREFIX?: string
  /** Имя файла GraphLayoutBundle в S3 */
  readonly VITE_S3_GRAPH_OBJECT_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
