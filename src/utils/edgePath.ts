import { getBezierPath, Position, type Edge } from '@xyflow/react';
import { getEdgePosition } from '@xyflow/system';
import type { GraphEdgeDef } from '../types';
import {
  DEFAULT_EDGE_CURVATURE,
  DEFAULT_EDGE_WIDTH,
  edgeTypeColors,
  FALLBACK_EDGE,
} from '../theme';

interface EdgeData {
  def?: GraphEdgeDef;
}

/** Макс. добавка curvature для разводки параллельных связей */
const SPREAD_CURVATURE_DELTA_MAX = 0.22;
/** Делитель смещения узлов — чем больше, тем слабее разводка */
const SPREAD_DISTANCE_DIVISOR = 500;
/** Мин. итоговый curvature после spread */
const SPREAD_CURVATURE_FLOOR = 0.12;
/** Макс. итоговый curvature после spread */
const SPREAD_CURVATURE_CEILING = 0.55;

export function autoHandles(
  sx: number, sy: number, tx: number, ty: number,
): { sourcePosition: Position; targetPosition: Position } {
  const dx = tx - sx;
  const dy = ty - sy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourcePosition: Position.Right, targetPosition: Position.Left }
      : { sourcePosition: Position.Left, targetPosition: Position.Right };
  }
  return dy >= 0
    ? { sourcePosition: Position.Bottom, targetPosition: Position.Top }
    : { sourcePosition: Position.Top, targetPosition: Position.Bottom };
}

/** Разводит параллельные связи: разный curvature по смещению узлов */
function spreadCurvature(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  base: number,
): number {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const isHorizontal = sourcePosition === Position.Left || sourcePosition === Position.Right;
  const spread = isHorizontal
    ? Math.max(-SPREAD_CURVATURE_DELTA_MAX, Math.min(SPREAD_CURVATURE_DELTA_MAX, dy / SPREAD_DISTANCE_DIVISOR))
    : Math.max(-SPREAD_CURVATURE_DELTA_MAX, Math.min(SPREAD_CURVATURE_DELTA_MAX, dx / SPREAD_DISTANCE_DIVISOR));
  return Math.max(SPREAD_CURVATURE_FLOOR, Math.min(SPREAD_CURVATURE_CEILING, base + spread));
}

export function computeEdgePathD(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition?: Position,
  targetPosition?: Position,
  curvature = DEFAULT_EDGE_CURVATURE,
): string {
  const handles = sourcePosition && targetPosition
    ? { sourcePosition, targetPosition }
    : autoHandles(sourceX, sourceY, targetX, targetY);
  const c = sourcePosition && targetPosition
    ? spreadCurvature(sourceX, sourceY, targetX, targetY, sourcePosition, curvature)
    : curvature;
  const [path] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    ...handles,
    curvature: c,
  });
  return path;
}

export function computeEdgePathWithLabel(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  curvature = DEFAULT_EDGE_CURVATURE,
): { path: string; labelX: number; labelY: number } {
  const c = spreadCurvature(sourceX, sourceY, targetX, targetY, sourcePosition, curvature);
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    curvature: c,
  });
  return { path, labelX, labelY };
}

export function getEdgeColor(edge: Edge): string {
  const def = (edge.data as EdgeData | undefined)?.def;
  const p = def?.additionalParams;
  return p?.color ?? (def ? edgeTypeColors[def.type] : undefined) ?? FALLBACK_EDGE;
}

export function getEdgeStrokeWidth(edge: Edge): number {
  const def = (edge.data as EdgeData | undefined)?.def;
  return def?.additionalParams?.strokeWidth ?? DEFAULT_EDGE_WIDTH;
}

export function getEdgeCurvature(edge: Edge): number {
  const def = (edge.data as EdgeData | undefined)?.def;
  return def?.additionalParams?.curvature ?? DEFAULT_EDGE_CURVATURE;
}

type FlowStore = {
  getState: () => {
    nodeLookup: Map<string, unknown>;
    connectionMode: Parameters<typeof getEdgePosition>[0]['connectionMode'];
    onError?: Parameters<typeof getEdgePosition>[0]['onError'];
  };
};

export function resolveEdgeEndpoints(
  edge: Edge,
  store: FlowStore,
): { sourceX: number; sourceY: number; targetX: number; targetY: number } | null {
  const state = store.getState();
  const sourceNode = state.nodeLookup.get(edge.source);
  const targetNode = state.nodeLookup.get(edge.target);
  if (!sourceNode || !targetNode) return null;

  const pos = getEdgePosition({
    id: edge.id,
    sourceNode: sourceNode as Parameters<typeof getEdgePosition>[0]['sourceNode'],
    targetNode: targetNode as Parameters<typeof getEdgePosition>[0]['targetNode'],
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    connectionMode: state.connectionMode,
    onError: state.onError,
  });

  if (!pos || pos.sourceX == null || pos.sourceY == null || pos.targetX == null || pos.targetY == null) {
    return null;
  }
  return { sourceX: pos.sourceX, sourceY: pos.sourceY, targetX: pos.targetX, targetY: pos.targetY };
}
