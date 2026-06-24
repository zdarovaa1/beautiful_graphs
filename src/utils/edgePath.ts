import { getBezierPath, getStraightPath, Position, type Edge } from '@xyflow/react';
import { getEdgePosition } from '@xyflow/system';
import type { GraphEdgeDef } from '../types';
import {
  DEFAULT_EDGE_CURVATURE,
  DEFAULT_EDGE_WIDTH,
  edgeTypeColors,
  FALLBACK_EDGE,
} from '../theme';

const STRAIGHT_THRESHOLD = 40;

interface EdgeData {
  def?: GraphEdgeDef;
}

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

export function computeEdgePathD(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  curvature = DEFAULT_EDGE_CURVATURE,
): string {
  const { sourcePosition, targetPosition } = autoHandles(sourceX, sourceY, targetX, targetY);
  const [bezier] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    curvature,
  });
  const [straight] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const dist = Math.hypot(targetX - sourceX, targetY - sourceY);
  return dist < STRAIGHT_THRESHOLD ? straight : bezier;
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

export function colorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length >= 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
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
