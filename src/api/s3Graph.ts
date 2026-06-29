/**
 * Загрузка GraphLayoutBundle из S3.
 *
 * Настройка (.env):
 *   VITE_S3_GRAPH_BASE_URL=https://your-bucket.s3.amazonaws.com
 *   VITE_S3_GRAPH_KEY_PREFIX=graphs
 *
 * Пример:
 *   const bundle = await fetchGraphFromS3({ key: 'my-graph-layout.json' });
 *   // bundle: { nodes, edges, islands, positions }
 *
 * Presigned URL (без VITE_S3_GRAPH_BASE_URL):
 *   await fetchGraphFromS3({ key: 'x.json', url: presignedUrl });
 */
import type { GraphLayoutBundle } from '../types'
import { parseGraphLayoutBundle } from '../utils/buildGraphLayout'

/** Базовый URL бакета или API-прокси до S3, без trailing slash */
export const S3_GRAPH_BASE_URL = import.meta.env.VITE_S3_GRAPH_BASE_URL ?? ''

/** Префикс ключей объектов, напр. graphs/ */
export const S3_GRAPH_KEY_PREFIX = import.meta.env.VITE_S3_GRAPH_KEY_PREFIX ?? 'graphs/'

/** Ключ объекта по умолчанию для GraphView */
export const S3_GRAPH_OBJECT_KEY = import.meta.env.VITE_S3_GRAPH_OBJECT_KEY ?? ''

export function isS3GraphConfigured(): boolean {
  return S3_GRAPH_BASE_URL.length > 0
}

export class S3GraphFetchError extends Error {
  readonly status?: number

  readonly key?: string

  constructor(message: string, status?: number, key?: string) {
    super(message)
    this.name = 'S3GraphFetchError'
    this.status = status
    this.key = key
  }
}

/** Собирает URL объекта: base + prefix + key */
export function buildGraphS3Url(objectKey: string): string {
  const base = S3_GRAPH_BASE_URL.replace(/\/+$/, '')
  const prefix = S3_GRAPH_KEY_PREFIX.replace(/^\/+|\/+$/g, '')
  const key = objectKey.replace(/^\/+/, '')
  const fullKey = prefix ? `${prefix}/${key}` : key
  return `${base}/${fullKey}`
}

export interface FetchGraphFromS3Options {
  /** Ключ объекта в бакете, напр. my-graph-layout.json */
  key: string
  /** Готовый URL (presigned, CloudFront). Если задан — base URL из env не нужен */
  url?: string
  signal?: AbortSignal
}

/**
 * GET JSON из S3 → GraphLayoutBundle.
 * Формат файла: { nodes, edges, islands, positions } (после ELK-подготовки в Toolbar).
 */
export async function fetchGraphFromS3({ key, url, signal }: FetchGraphFromS3Options): Promise<GraphLayoutBundle> {
  const targetUrl = url ?? buildGraphS3Url(key)

  if (!url && !isS3GraphConfigured()) {
    throw new S3GraphFetchError(
      'Задайте VITE_S3_GRAPH_BASE_URL или передайте options.url (presigned URL)',
      undefined,
      key,
    )
  }

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new S3GraphFetchError(
      `Не удалось загрузить граф: ${response.status} ${response.statusText}`,
      response.status,
      key,
    )
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new S3GraphFetchError('Ответ S3 не является JSON', response.status, key)
  }

  try {
    return parseGraphLayoutBundle(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Некорректный формат файла'
    throw new S3GraphFetchError(msg, response.status, key)
  }
}

/**
 * Заготовка: PUT JSON в S3 (presigned URL с бэкенда).
 * Реализуйте выдачу presigned URL на сервере и передайте его сюда.
 */
export async function uploadGraphToS3(url: string, bundle: GraphLayoutBundle, signal?: AbortSignal): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
    signal,
  })

  if (!response.ok) {
    throw new S3GraphFetchError(`Не удалось сохранить граф: ${response.status} ${response.statusText}`, response.status)
  }
}
