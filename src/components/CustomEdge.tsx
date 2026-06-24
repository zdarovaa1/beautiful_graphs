import { memo, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { GraphEdgeDef } from '../types';
import {
  DEFAULT_EDGE_CURVATURE,
  DEFAULT_EDGE_WIDTH,
  DEFAULT_EDGE_WIDTH_SELECTED,
  FALLBACK_EDGE,
  edgeTypeColors,
} from '../theme';
import { autoHandles, computeEdgePathD } from '../utils/edgePath';
import styles from './CustomEdge.module.css';

export interface CustomEdgeData extends Record<string, unknown> {
  def: GraphEdgeDef;
  showLabel?: boolean;
}

export const CustomEdge = memo(function CustomEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, selected, data } = props;

  const def = (data as CustomEdgeData | undefined)?.def;
  const showLabel = (data as CustomEdgeData | undefined)?.showLabel ?? true;
  const p = def?.additionalParams;
  const color = p?.color ?? (def ? edgeTypeColors[def.type] : undefined) ?? FALLBACK_EDGE;
  const strokeW = (selected ? DEFAULT_EDGE_WIDTH_SELECTED : p?.strokeWidth ?? DEFAULT_EDGE_WIDTH) as number;
  const animated = p?.animated ?? true;
  const curvature = p?.curvature ?? DEFAULT_EDGE_CURVATURE;
  const gid = `grad-${id}`;
  const mid = `arrow-${id}`;

  const { edgePath, labelX, labelY } = useMemo(() => {
    const { sourcePosition, targetPosition } = autoHandles(sourceX, sourceY, targetX, targetY);
    const [, bx, by] = getBezierPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition,
      curvature,
    });
    return {
      edgePath: computeEdgePathD(sourceX, sourceY, targetX, targetY, curvature),
      labelX: bx,
      labelY: by,
    };
  }, [sourceX, sourceY, targetX, targetY, curvature]);

  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </linearGradient>
        <marker id={mid} markerWidth="14" markerHeight="14" viewBox="0 0 14 14" refX="10" refY="7" orient="auto-start-reverse">
          <path d="M2,2 L12,7 L2,12 Z" fill={color} />
        </marker>
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${mid})`}
        style={{
          stroke: `url(#${gid})`,
          strokeWidth: strokeW,
          filter: selected ? `drop-shadow(0 0 5px ${color})` : undefined,
        }}
      />
      {animated && (
        <path d={edgePath} className={styles.flow} data-screenshot-decor style={{ stroke: color }} />
      )}

      {def && showLabel && (
        <EdgeLabelRenderer>
          <div
            data-edge-id={id}
            className={`${styles.label} ${selected ? styles.labelSelected : ''}`}
            style={{
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              borderColor: color,
              opacity: selected ? 1 : 0.72,
            }}
          >
            {def.title}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
