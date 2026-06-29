import type { GraphData, GraphLayoutBundle } from '../types';
import { runElkLayout } from '../layout/elkLayout';
import type { PosMap } from './graphHelpers';

export type { GraphLayoutBundle } from '../types';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseGraphData(json: unknown): GraphData {
  if (!isObject(json)) {
    throw new Error('Ожидается JSON-объект с полями nodes, edges, islands');
  }
  const { nodes, edges, islands } = json;
  if (!Array.isArray(nodes) || !Array.isArray(edges) || !Array.isArray(islands)) {
    throw new Error('Файл должен содержать массивы nodes, edges и islands');
  }
  if (nodes.length === 0) {
    throw new Error('Список nodes пуст');
  }
  return { nodes, edges, islands } as GraphData;
}

/** Парсит JSON с GraphLayoutBundle (результат ELK / файл для S3) */
export function parseGraphLayoutBundle(json: unknown): GraphLayoutBundle {
  const data = parseGraphData(json);
  if (!isObject(json)) {
    throw new Error('Ожидается JSON-объект с полями nodes, edges, islands, positions');
  }
  const { positions } = json;
  if (!isObject(positions)) {
    throw new Error('Файл должен содержать объект positions');
  }
  for (const [id, pos] of Object.entries(positions)) {
    if (!isObject(pos) || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      throw new Error(`Некорректная позиция для узла «${id}»`);
    }
  }
  return { ...data, positions: positions as PosMap };
}

export async function buildGraphLayoutBundle(data: GraphData): Promise<GraphLayoutBundle> {
  const layout = await runElkLayout(data.nodes, data.edges);
  const positions: PosMap = {};
  for (const [id, p] of layout) {
    positions[id] = { x: p.x, y: p.y };
  }
  return { ...data, positions };
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
