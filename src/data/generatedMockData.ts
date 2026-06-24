// ⚠️ JSON-файл заполняется скриптом: node scripts/generateMocks.mjs
// После запуска — переключиться в GraphView.tsx на этот источник.
import type { GraphNodeDef, GraphEdgeDef, IslandDef } from '../types';
import type { PosMap } from '../utils/graphHelpers';
import raw from './mock/data.json';

type MockBundle = {
  nodes: GraphNodeDef[];
  edges: GraphEdgeDef[];
  islands: IslandDef[];
  positions: PosMap;
};

const _data = raw as unknown as MockBundle;

export const mockNodes: GraphNodeDef[] = _data.nodes;
export const mockEdges: GraphEdgeDef[] = _data.edges;
export const mockIslands: IslandDef[] = _data.islands;
/** ELK-позиции, предвычисленные скриптом. Передай в presetPositions в GraphView. */
export const mockPositions: PosMap = _data.positions;
