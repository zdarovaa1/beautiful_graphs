import { fetchGraphFromS3, isS3GraphConfigured, S3_GRAPH_OBJECT_KEY } from '../api/s3Graph';
import {
  edges as localEdges,
  islands as localIslands,
  nodes as localNodes,
} from '../data/graphData';
import { runElkLayout } from '../layout/elkLayout';
import type { GraphLayoutBundle } from '../types';
import type { PosMap } from './graphHelpers';

export { S3_GRAPH_OBJECT_KEY };

function layoutMapToPosMap(layout: Map<string, { x: number; y: number }>): PosMap {
  const positions: PosMap = {};
  for (const [id, p] of layout) {
    positions[id] = { x: p.x, y: p.y };
  }
  return positions;
}

/**
 * S3 (если настроен VITE_S3_GRAPH_BASE_URL + VITE_S3_GRAPH_OBJECT_KEY)
 * иначе локальный graphData.ts + ELK.
 */
export async function loadGraphBundle(signal?: AbortSignal): Promise<GraphLayoutBundle> {
  if (isS3GraphConfigured() && S3_GRAPH_OBJECT_KEY) {
    return fetchGraphFromS3({ key: S3_GRAPH_OBJECT_KEY, signal });
  }

  const layout = await runElkLayout(localNodes, localEdges);
  return {
    nodes: localNodes,
    edges: localEdges,
    islands: localIslands,
    positions: layoutMapToPosMap(layout),
  };
}

export function bundleToLayoutMap(bundle: GraphLayoutBundle): Map<string, { id: string; x: number; y: number }> {
  return new Map(
    Object.entries(bundle.positions).map(([id, p]) => [id, { id, x: p.x, y: p.y }]),
  );
}
