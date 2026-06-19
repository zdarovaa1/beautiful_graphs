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
import styles from './CustomEdge.module.css';

export interface CustomEdgeData extends Record<string, unknown> {
  def: GraphEdgeDef;
}

export function CustomEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } = props;

  const def = (data as CustomEdgeData | undefined)?.def;
  const p = def?.additionalParams;
  const color = p?.color ?? (def ? edgeTypeColors[def.type] : undefined) ?? FALLBACK_EDGE;
  const width = (selected ? DEFAULT_EDGE_WIDTH_SELECTED : p?.strokeWidth ?? DEFAULT_EDGE_WIDTH) as number;
  const animated = p?.animated ?? true;
  const gid = `grad-${id}`;
  const mid = `arrow-${id}`;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: p?.curvature ?? DEFAULT_EDGE_CURVATURE,
  });

  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </linearGradient>
        <marker style={{ zIndex: selected ? 15 : 10 }} id={mid} markerWidth="14" markerHeight="14" viewBox="0 0 14 14" refX="10" refY="7" orient="auto-start-reverse">
          <path d="M2,2 L12,7 L2,12 Z" fill={color} />
        </marker>
      </defs>

      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#${mid})`}
        style={{
          stroke: `url(#${gid})`,
          strokeWidth: width,
          filter: selected ? `drop-shadow(0 0 5px ${color})` : undefined,
        }}
      />
      {animated && <path d={path} className={styles.flow} style={{ stroke: color }} />}

      {/* {def && selected && ( */}
        <EdgeLabelRenderer>
          <div
            className={styles.label}
            style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, borderColor: color }}
          >
            {def.title}
          </div>
        </EdgeLabelRenderer>
      {/* )} */}
    </>
  );
}
