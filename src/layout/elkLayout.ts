import ELK from 'elkjs/lib/elk.bundled.js';
import type { GraphEdgeDef, GraphNodeDef } from '../types';
import { getNodeSize } from '../theme';

const elk = new ELK();

export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
}

/** Для небольших графов — иерархический алгоритм (качественная укладка). */
const LAYOUT_LAYERED: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'LEFT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '40',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

/** Для больших графов — силовой алгоритм (быстро, O(n)). */
const LAYOUT_FORCE: Record<string, string> = {
  'elk.algorithm': 'force',
  'elk.force.iterations': '200',
  'elk.spacing.nodeNode': '60',
};

const LARGE_GRAPH_THRESHOLD = 200;

const LAYOUT_SELECTION: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '56',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
};

async function runElkWithOptions(
  nodes: GraphNodeDef[],
  edges: GraphEdgeDef[],
  layoutOptions: Record<string, string>,
): Promise<Map<string, LaidOutNode>> {
  const graph = {
    id: 'root',
    layoutOptions,
    children: nodes.map((n) => {
      const { width, height } = getNodeSize(n.additionalParams);
      return { id: n.id, width, height };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const res = await elk.layout(graph);
  const map = new Map<string, LaidOutNode>();
  for (const child of res.children ?? []) {
    map.set(child.id, { id: child.id, x: child.x ?? 0, y: child.y ?? 0 });
  }
  return map;
}

export async function runElkLayout(
  nodes: GraphNodeDef[],
  edges: GraphEdgeDef[],
): Promise<Map<string, LaidOutNode>> {
  const isLarge = nodes.length > LARGE_GRAPH_THRESHOLD;
  return runElkWithOptions(nodes, edges, isLarge ? LAYOUT_FORCE : LAYOUT_LAYERED);
}

/** Компактная укладка выделенного подграфа */
export async function runElkSelectionLayout(
  nodes: GraphNodeDef[],
  edges: GraphEdgeDef[],
): Promise<Map<string, LaidOutNode>> {
  return runElkWithOptions(nodes, edges, LAYOUT_SELECTION);
}
