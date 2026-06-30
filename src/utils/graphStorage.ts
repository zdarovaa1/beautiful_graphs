import type { DisplaySettings, GraphData, GraphLayoutBundle } from '../types'
import type { PosMap } from './graphHelpers'

const STORAGE_NS = 'graph'

export const PANEL_STORAGE_KEYS = {
  detail: `${STORAGE_NS}-detail-panel`,
  settings: `${STORAGE_NS}-settings-panel`,
} as const

export interface GraphDataStorageKeys {
  displaySettings: string
  nodePositions: string
}

export function getGraphDataStorageKeys(graphId: string): GraphDataStorageKeys {
  const prefix = `${STORAGE_NS}:${graphId}`
  return {
    displaySettings: `${prefix}:display-settings`,
    nodePositions: `${prefix}:node-positions`,
  }
}

export function graphFingerprint(graph: GraphData): string {
  const parts: string[] = []
  for (const n of graph.nodes) parts.push(`n:${n.id}`)
  for (const e of graph.edges) parts.push(`e:${e.id}:${e.source}:${e.target}`)
  for (const i of graph.islands) parts.push(`i:${i.id}`)
  parts.sort()
  return parts.join('\n')
}

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function computeGraphId(graph: GraphLayoutBundle | GraphData): string {
  return fnv1aHash(graphFingerprint(graph)).slice(0, 10)
}

export function loadNodePositions(key: string): PosMap {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') as PosMap
  } catch {
    return {}
  }
}

export function saveNodePositions(key: string, positions: PosMap): void {
  localStorage.setItem(key, JSON.stringify(positions))
}

export function clearNodePositions(key: string): void {
  localStorage.removeItem(key)
}

export function loadDisplaySettings(key: string): Partial<DisplaySettings> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as Partial<DisplaySettings>
  } catch {
    return null
  }
}

export function saveDisplaySettings(key: string, settings: DisplaySettings): void {
  localStorage.setItem(key, JSON.stringify(settings))
}
