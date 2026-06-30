import { edges as defaultEdges, islands as defaultIslands, nodes as defaultNodes } from '../data/graphData'
import type { GraphEdgeDef, GraphNodeDef, GraphLayoutBundle, IslandDef } from '../types'
import { normalizeGraphData, normalizeGraphLayoutBundle } from './normalizeGraphColors'

export const nodeDefById = new Map<string, GraphNodeDef>()
export const islandDefById = new Map<string, IslandDef>()
export const edgeDefById = new Map<string, GraphEdgeDef>()

const defaults = normalizeGraphData({ nodes: defaultNodes, edges: defaultEdges, islands: defaultIslands })

let graphNodes: GraphNodeDef[] = defaults.nodes
let graphEdges: GraphEdgeDef[] = defaults.edges
let graphIslands: IslandDef[] = defaults.islands

const graphNodeDataCache = new Map<string, GraphNodeDataRef>()
const islandDataCache = new Map<string, IslandNodeDataRef>()
const edgeDataCache = new Map<string, EdgeDataRef>()

function clearDataCaches() {
  graphNodeDataCache.clear()
  islandDataCache.clear()
  edgeDataCache.clear()
}

function rebuildLookupMaps() {
  nodeDefById.clear()
  islandDefById.clear()
  edgeDefById.clear()
  for (const n of graphNodes) nodeDefById.set(n.id, n)
  for (const i of graphIslands) islandDefById.set(i.id, i)
  for (const e of graphEdges) edgeDefById.set(e.id, e)
  clearDataCaches()
}

/** Применяет bundle — обновляет lookup для CustomNode, IslandNode, DetailPanel */
export function applyGraphLayoutBundle(bundle: GraphLayoutBundle): void {
  const normalized = normalizeGraphLayoutBundle(bundle)
  graphNodes = normalized.nodes
  graphEdges = normalized.edges
  graphIslands = normalized.islands
  rebuildLookupMaps()
}

export function getGraphNodes(): GraphNodeDef[] {
  return graphNodes
}

export function getGraphEdges(): GraphEdgeDef[] {
  return graphEdges
}

export function getGraphIslands(): IslandDef[] {
  return graphIslands
}

rebuildLookupMaps()

export interface GraphNodeDataRef extends Record<string, unknown> {
  defId: string
}

export interface IslandNodeDataRef extends Record<string, unknown> {
  defId: string
  width: number
  height: number
}

export interface EdgeDataRef extends Record<string, unknown> {
  defId: string
  showLabel: boolean
}

export function getGraphNodeData(id: string): GraphNodeDataRef {
  let entry = graphNodeDataCache.get(id)
  if (!entry) {
    entry = { defId: id }
    graphNodeDataCache.set(id, entry)
  }
  return entry
}

export function getIslandNodeData(defId: string, width: number, height: number): IslandNodeDataRef {
  const key = `${defId}:${width}:${height}`
  let entry = islandDataCache.get(key)
  if (!entry) {
    entry = { defId, width, height }
    islandDataCache.set(key, entry)
  }
  return entry
}

export function getEdgeData(defId: string, showLabel: boolean): EdgeDataRef {
  const key = `${defId}:${showLabel ? 1 : 0}`
  let entry = edgeDataCache.get(key)
  if (!entry) {
    entry = { defId, showLabel }
    edgeDataCache.set(key, entry)
  }
  return entry
}
