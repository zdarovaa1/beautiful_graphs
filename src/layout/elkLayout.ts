import ELK from 'elkjs/lib/elk.bundled.js'
import type { GraphEdgeDef, GraphNodeDef, IslandDef } from '../types'
import { getNodeSize } from '../theme'

const elk = new ELK()

export interface LaidOutNode {
  id: string
  x: number
  y: number
}

// Single set of layout options — used for both full graph and selection sub-layout
const LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '220',
  'elk.spacing.nodeNode': '50',
  'elk.spacing.componentComponent': '100',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
}

type ElkChild = {
  id: string
  width?: number
  height?: number
  x?: number
  y?: number
}

export async function runElkLayout(
  nodes: GraphNodeDef[],
  edges: GraphEdgeDef[],
  _islands: IslandDef[] = [],
): Promise<Map<string, LaidOutNode>> {
  if (nodes.length === 0) return new Map()

  const graph = {
    id: 'root',
    layoutOptions: LAYOUT_OPTIONS,
    children: nodes.map((n) => {
      const { width, height } = getNodeSize(n.additionalParams)
      return { id: n.id, width, height }
    }),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }

  const res = await elk.layout(graph as Parameters<typeof elk.layout>[0])
  const map = new Map<string, LaidOutNode>()
  for (const child of (res.children ?? []) as ElkChild[]) {
    map.set(child.id, { id: child.id, x: child.x ?? 0, y: child.y ?? 0 })
  }
  return map
}

export async function runElkSelectionLayout(
  nodes: GraphNodeDef[],
  edges: GraphEdgeDef[],
): Promise<Map<string, LaidOutNode>> {
  const graph = {
    id: 'root',
    layoutOptions: LAYOUT_OPTIONS,
    children: nodes.map((n) => {
      const { width, height } = getNodeSize(n.additionalParams)
      return { id: n.id, width, height }
    }),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }
  const res = await elk.layout(graph as Parameters<typeof elk.layout>[0])
  const map = new Map<string, LaidOutNode>()
  for (const child of (res.children ?? []) as ElkChild[]) {
    map.set(child.id, { id: child.id, x: child.x ?? 0, y: child.y ?? 0 })
  }
  return map
}
