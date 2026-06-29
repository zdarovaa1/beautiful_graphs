import type { Node, Edge } from '@xyflow/react'
import type React from 'react'
import type {
  GraphNodeDef,
  GraphEdgeDef,
  IslandDef,
  DisplaySettings,
  ObjectType,
  EdgeType,
  IslandType,
  SelectedEntity,
} from '../types'
import { ALL_OBJECT_TYPES } from '../types'
import type { LaidOutNode } from '../layout/elkLayout'
import { runElkSelectionLayout } from '../layout/elkLayout'
import { getNodeSize } from '../theme'
import { getEdgeData, getGraphNodeData, getIslandNodeData } from './graphRegistry'

export type PosMap = Record<string, { x: number; y: number }>

const Z_ISLAND = 0
const Z_EDGE = 5
const Z_NODE = 6

const ISLAND_PAD = 26
const ISLAND_HEADER = 30
const ISLAND_NEST_OFFSET = 50

export function buildInitialSettings(
  nodeDefs: GraphNodeDef[],
  edgeDefs: GraphEdgeDef[],
  islandDefs: IslandDef[],
): DisplaySettings {
  const edgeTypeMap = Object.fromEntries([...new Set(edgeDefs.map((e) => e.type))].map((t) => [t, true])) as Record<
    EdgeType,
    boolean
  >
  const islandTypeMap = Object.fromEntries([...new Set(islandDefs.map((i) => i.type))].map((t) => [t, true])) as Record<
    IslandType,
    boolean
  >
  return {
    onlySelectedAndNeighbors: false,
    hideAllIslands: false,
    showEdgeLabels: true,
    objectTypes: Object.fromEntries(ALL_OBJECT_TYPES.map((t) => [t, true])) as Record<ObjectType, boolean>,
    edgeTypes: edgeTypeMap,
    islandTypes: islandTypeMap,
    nodeNames: Object.fromEntries(nodeDefs.map((n) => [n.id, true])),
    edgeNames: Object.fromEntries(edgeDefs.map((e) => [e.id, true])),
    islandNames: Object.fromEntries(islandDefs.map((i) => [i.id, true])),
    islandTypeCascade: Object.fromEntries([...new Set(islandDefs.map((i) => i.type))].map((t) => [t, true])) as Record<
      IslandType,
      boolean
    >,
    islandNameCascade: Object.fromEntries(islandDefs.map((i) => [i.id, true])),
  }
}

export function isFiltersChanged(settings: DisplaySettings, defaultSettings: DisplaySettings): boolean {
  return (
    Object.values(settings.objectTypes).some((v) => !v) ||
    Object.values(settings.nodeNames).some((v) => !v) ||
    Object.values(settings.edgeTypes).some((v) => !v) ||
    Object.values(settings.edgeNames).some((v) => !v) ||
    Object.values(settings.islandTypes).some((v) => !v) ||
    Object.values(settings.islandNames).some((v) => !v) ||
    Object.values(settings.islandTypeCascade).some((v) => !v) ||
    Object.values(settings.islandNameCascade).some((v) => !v) ||
    settings.onlySelectedAndNeighbors !== defaultSettings.onlySelectedAndNeighbors ||
    settings.hideAllIslands !== defaultSettings.hideAllIslands
  )
}

export function computeVisibleNodeIds(
  nodeDefs: GraphNodeDef[],
  edgeDefs: GraphEdgeDef[],
  islandDefs: IslandDef[],
  settings: DisplaySettings,
  focusNodeId: string | null,
): Set<string> {
  let ids = nodeDefs.filter((n) => settings.objectTypes[n.type] && settings.nodeNames[n.id]).map((n) => n.id)

  const hiddenCascadeIslands = new Set<string>()
  for (const id of Object.keys(settings.islandNames)) {
    if (settings.islandNames[id] === false && settings.islandNameCascade[id] !== false) {
      hiddenCascadeIslands.add(id)
    }
  }
  const hiddenCascadeTypes = new Set<IslandType>()
  for (const type of Object.keys(settings.islandTypes) as IslandType[]) {
    if (settings.islandTypes[type] === false && settings.islandTypeCascade[type] !== false) {
      hiddenCascadeTypes.add(type)
    }
  }
  if (hiddenCascadeIslands.size > 0 || hiddenCascadeTypes.size > 0) {
    ids = ids.filter((id) => {
      const node = nodeDefs.find((n) => n.id === id)
      if (!node) return false
      return !node.islandIds.some((islandId) => {
        if (hiddenCascadeIslands.has(islandId)) return true
        const island = islandDefs.find((i) => i.id === islandId)
        return !!island && hiddenCascadeTypes.has(island.type)
      })
    })
  }

  if (settings.onlySelectedAndNeighbors && focusNodeId) {
    const keep = new Set([focusNodeId])
    edgeDefs.forEach((e) => {
      if (e.source === focusNodeId) keep.add(e.target)
      if (e.target === focusNodeId) keep.add(e.source)
    })
    ids = ids.filter((id) => keep.has(id))
  }

  return new Set(ids)
}

export function isEntityVisible(
  entity: SelectedEntity,
  nodeDefs: GraphNodeDef[],
  edgeDefs: GraphEdgeDef[],
  islandDefs: IslandDef[],
  settings: DisplaySettings,
  focusNodeId: string | null,
): boolean {
  const visibleNodeIds = computeVisibleNodeIds(nodeDefs, edgeDefs, islandDefs, settings, focusNodeId)

  if (entity.kind === 'node') {
    return visibleNodeIds.has(entity.data.id)
  }

  if (entity.kind === 'island') {
    if (settings.hideAllIslands) return false
    if (!settings.islandTypes[entity.data.type] || !settings.islandNames[entity.data.id]) return false
    return nodeDefs.some((n) => n.islandIds.includes(entity.data.id) && visibleNodeIds.has(n.id))
  }

  const edge = entity.data
  return (
    settings.edgeTypes[edge.type] !== false &&
    settings.edgeNames[edge.id] !== false &&
    visibleNodeIds.has(edge.source) &&
    visibleNodeIds.has(edge.target)
  )
}

function islandBoundsWithPad(
  memberSet: Set<string>,
  nodeDefs: GraphNodeDef[],
  positions: Map<string, LaidOutNode>,
  savedPositions: PosMap,
  extraPad: number,
): { x: number; y: number; width: number; height: number } | null {
  if (memberSet.size === 0) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const id of memberSet) {
    const def = nodeDefs.find((n) => n.id === id)
    if (!def) continue
    const base = positions.get(id)
    if (!base) continue
    const p = savedPositions[id] ?? base
    const { width: mw, height: mh } = getNodeSize(def.additionalParams)
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + mw)
    maxY = Math.max(maxY, p.y + mh)
  }
  const pad = ISLAND_PAD + extraPad
  return {
    x: minX - pad,
    y: minY - pad - ISLAND_HEADER,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2 + ISLAND_HEADER,
  }
}

export function computeIslandNodes(
  nodeDefs: GraphNodeDef[],
  islandDefs: IslandDef[],
  positions: Map<string, LaidOutNode>,
  visibleNodeIds: Set<string>,
  settings: DisplaySettings,
  savedPositions: PosMap,
): Node[] {
  if (settings.hideAllIslands) return []

  const visibleIslands = islandDefs.filter((i) => settings.islandTypes[i.type] && settings.islandNames[i.id])

  const memberSets = new Map<string, Set<string>>()
  for (const island of visibleIslands) {
    memberSets.set(
      island.id,
      new Set(nodeDefs.filter((n) => n.islandIds.includes(island.id) && visibleNodeIds.has(n.id)).map((n) => n.id)),
    )
  }

  const out: Node[] = []
  for (const island of visibleIslands) {
    const myMembers = memberSets.get(island.id)!
    if (myMembers.size === 0) continue

    let nestLevel = 0
    for (const [otherId, otherSet] of memberSets) {
      if (otherId === island.id) continue
      const hasShared = [...otherSet].some((id) => myMembers.has(id))
      if (hasShared && otherSet.size < myMembers.size) nestLevel++
    }

    const bounds = islandBoundsWithPad(myMembers, nodeDefs, positions, savedPositions, nestLevel * ISLAND_NEST_OFFSET)
    if (!bounds) continue

    const { x, y, width, height } = bounds
    out.push({
      id: `island-${island.id}`,
      type: 'island',
      position: { x, y },
      data: getIslandNodeData(island.id, width, height),
      draggable: false,
      selectable: true,
      zIndex: Z_ISLAND,
      style: { width, height },
      width,
      height,
    })
  }
  return out
}

export function computeGraphNodes(
  nodeDefs: GraphNodeDef[],
  positions: Map<string, LaidOutNode>,
  visibleNodeIds: Set<string>,
  savedPositions: PosMap,
): Node[] {
  return nodeDefs
    .filter((n) => visibleNodeIds.has(n.id))
    .map((n) => {
      const base = positions.get(n.id)
      const p = savedPositions[n.id] ?? base
      const { width, height } = getNodeSize(n.additionalParams)
      return {
        id: n.id,
        type: 'graph',
        position: { x: p?.x ?? 0, y: p?.y ?? 0 },
        data: getGraphNodeData(n.id),
        zIndex: Z_NODE,

        width,
        height,
      } satisfies Node
    })
}

export function pickEdgeHandles(
  srcId: string,
  tgtId: string,
  savedPositions: PosMap,
  positions: Map<string, LaidOutNode> | null,
): { sourceHandle: string; targetHandle: string } {
  const sp = savedPositions[srcId] ?? positions?.get(srcId)
  const tp = savedPositions[tgtId] ?? positions?.get(tgtId)
  const dx = (tp?.x ?? 0) - (sp?.x ?? 0)
  const dy = (tp?.y ?? 0) - (sp?.y ?? 0)
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'right-s', targetHandle: 'left-t' }
      : { sourceHandle: 'left-s', targetHandle: 'right-t' }
  }
  return dy >= 0
    ? { sourceHandle: 'bottom-s', targetHandle: 'top-t' }
    : { sourceHandle: 'top-s', targetHandle: 'bottom-t' }
}

export function computeEdges(
  edgeDefs: GraphEdgeDef[],
  settings: DisplaySettings,
  visibleNodeIds: Set<string>,
  positions: Map<string, LaidOutNode> | null,
  savedPositions: PosMap,
): Edge[] {
  return edgeDefs
    .filter(
      (e) =>
        settings.edgeTypes[e.type] &&
        settings.edgeNames[e.id] !== false &&
        visibleNodeIds.has(e.source) &&
        visibleNodeIds.has(e.target),
    )
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'custom',
      data: getEdgeData(e.id, settings.showEdgeLabels),
      zIndex: Z_EDGE,

      ...pickEdgeHandles(e.source, e.target, savedPositions, positions),
    }))
}

export function applyAlignment(
  axis: 'h' | 'v',
  ids: string[],
  nodeDefs: GraphNodeDef[],
  positions: Map<string, LaidOutNode> | null,
  savedPositions: PosMap,
  setSavedPositions: React.Dispatch<React.SetStateAction<PosMap>>,
  setNodes: (fn: (ns: Node[]) => Node[]) => void,
): void {
  if (!positions) return
  type Info = { id: string; x: number; y: number; w: number; h: number }
  const infos: Info[] = ids.flatMap((id) => {
    const def = nodeDefs.find((n) => n.id === id)
    const pos = def ? (savedPositions[id] ?? positions.get(id)) : null
    if (!def || !pos) return []
    const { width: w, height: h } = getNodeSize(def.additionalParams)
    return [{ id, x: pos.x, y: pos.y, w, h }]
  })
  if (infos.length < 2) return

  let newPos: Map<string, { x: number; y: number }>
  if (axis === 'h') {
    const meanCY = infos.reduce((s, { y, h }) => s + y + h / 2, 0) / infos.length
    newPos = new Map(infos.map(({ id, x, h }) => [id, { x, y: meanCY - h / 2 }]))
  } else {
    const meanCX = infos.reduce((s, { x, w }) => s + x + w / 2, 0) / infos.length
    newPos = new Map(infos.map(({ id, y, w }) => [id, { x: meanCX - w / 2, y }]))
  }

  setSavedPositions((prev) => {
    const next = { ...prev }
    newPos.forEach((pos, id) => {
      next[id] = pos
    })
    return next
  })
  setNodes((ns) =>
    ns.map((n) => {
      const p = newPos.get(n.id)
      return p ? { ...n, position: p } : n
    }),
  )
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

function selectionBounds(
  ids: string[],
  nodeDefs: GraphNodeDef[],
  positions: Map<string, LaidOutNode>,
  savedPositions: PosMap,
): Bounds | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const id of ids) {
    const def = nodeDefs.find((n) => n.id === id)
    const pos = def ? (savedPositions[id] ?? positions.get(id)) : null
    if (!def || !pos) continue
    const { width, height } = getNodeSize(def.additionalParams)
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + width)
    maxY = Math.max(maxY, pos.y + height)
  }
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

function layoutBounds(layout: Map<string, LaidOutNode>, nodeDefs: GraphNodeDef[]): Bounds | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [id, pos] of layout) {
    const def = nodeDefs.find((n) => n.id === id)
    if (!def) continue
    const { width, height } = getNodeSize(def.additionalParams)
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + width)
    maxY = Math.max(maxY, pos.y + height)
  }
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

export async function applyElkLayoutToSelection(
  ids: string[],
  nodeDefs: GraphNodeDef[],
  edgeDefs: GraphEdgeDef[],
  positions: Map<string, LaidOutNode> | null,
  savedPositions: PosMap,
  setSavedPositions: React.Dispatch<React.SetStateAction<PosMap>>,
  setNodes: (fn: (ns: Node[]) => Node[]) => void,
): Promise<void> {
  if (!positions || ids.length < 2) return

  const idSet = new Set(ids)
  const subgraphNodes = nodeDefs.filter((n) => idSet.has(n.id))
  const subgraphEdges = edgeDefs.filter((e) => idSet.has(e.source) && idSet.has(e.target))

  const current = selectionBounds(ids, nodeDefs, positions, savedPositions)
  if (!current) return

  const layout = await runElkSelectionLayout(subgraphNodes, subgraphEdges)
  const laid = layoutBounds(layout, nodeDefs)
  if (!laid) return

  const oldCx = (current.minX + current.maxX) / 2
  const oldCy = (current.minY + current.maxY) / 2
  const newCx = (laid.minX + laid.maxX) / 2
  const newCy = (laid.minY + laid.maxY) / 2
  const dx = oldCx - newCx
  const dy = oldCy - newCy

  const newPos = new Map<string, { x: number; y: number }>()
  for (const [id, p] of layout) {
    newPos.set(id, { x: p.x + dx, y: p.y + dy })
  }

  setSavedPositions((prev) => {
    const next = { ...prev }
    newPos.forEach((pos, id) => {
      next[id] = pos
    })
    return next
  })
  setNodes((ns) =>
    ns.map((n) => {
      const p = newPos.get(n.id)
      return p ? { ...n, position: p } : n
    }),
  )
}
