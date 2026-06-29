import { memo, useContext, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import {
  DEFAULT_EDGE_CURVATURE,
  DEFAULT_EDGE_WIDTH,
  DEFAULT_EDGE_WIDTH_SELECTED,
  FALLBACK_EDGE,
  edgeTypeColors,
} from '../theme';
import { edgeDefById } from '../utils/graphRegistry';
import type { EdgeDataRef } from '../utils/graphRegistry';
import { computeEdgePathWithLabel } from '../utils/edgePath';
import { ZoomTierContext } from '../utils/zoomTier';
import styles from './CustomEdge.module.css';

function edgeColorKey(color: string): string {
  return color.replace(/[^a-z0-9]/gi, '');
}

function CustomEdgeInner(props: EdgeProps) {
  const {
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    selected, data,
  } = props;

  const edgeData = data as EdgeDataRef | undefined;
  const def = edgeData ? edgeDefById.get(edgeData.defId) : undefined;
  const showLabelSetting = edgeData?.showLabel ?? true;
  const zoomTier = useContext(ZoomTierContext);

  const appearance = useMemo(() => {
    const params = def?.additionalParams;
    const color = params?.color ?? (def ? edgeTypeColors[def.type] : undefined) ?? FALLBACK_EDGE;
    return {
      color,
      strokeW: selected ? DEFAULT_EDGE_WIDTH_SELECTED : params?.strokeWidth ?? DEFAULT_EDGE_WIDTH,
      curvature: params?.curvature ?? DEFAULT_EDGE_CURVATURE,
      useGradient: params?.edgeGradient === true,
      markerId: `arrow-${edgeColorKey(color)}`,
      useAnimation: params?.animated ?? true,
    };
  }, [def, selected]);

  const {
    color, strokeW, curvature, useGradient, markerId, useAnimation,
  } = appearance;

  const useRichStyle = zoomTier >= 2;
  const showLabel = useRichStyle && showLabelSetting && !!def;

  const { path: edgePath, labelX, labelY } = useMemo(
    () => computeEdgePathWithLabel(
      sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature,
    ),
    [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature],
  );

  if (!useRichStyle) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          stroke: color,
          strokeWidth: strokeW,
        }}
      />
    );
  }

  const gid = `grad-${id}`;
  const mid = `arrow-edge-${id}`;

  return (
    <>
      {useGradient && (
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <marker id={mid} markerWidth="14" markerHeight="14" viewBox="0 0 14 14" refX="10" refY="7" orient="auto-start-reverse">
            <path d="M2,2 L12,7 L2,12 Z" fill={color} />
          </marker>
        </defs>
      )}

      {!useGradient && (
        <defs>
          <marker id={mid} markerWidth="14" markerHeight="14" viewBox="0 0 14 14" refX="10" refY="7" orient="auto-start-reverse">
            <path d="M2,2 L12,7 L2,12 Z" fill={color} />
          </marker>
        </defs>
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${mid})`}
        style={{
          stroke: useGradient ? `url(#${gid})` : color,
          strokeWidth: strokeW,
          filter: selected ? `drop-shadow(0 0 5px ${color})` : undefined,
        }}
      />
      {useAnimation && useRichStyle && (
        <path d={edgePath} className={styles.flow} data-screenshot-decor style={{ stroke: color }} />
      )}

      {showLabel && def && (
        <EdgeLabelRenderer>
          <div
            data-edge-id={id}
            className={`${styles.label} ${selected ? styles.labelSelected : ''}`}
            style={{
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              borderColor: color,
            }}
          >
            {def.title}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function edgePropsEqual(prev: EdgeProps, next: EdgeProps): boolean {
  return (
    prev.id === next.id
    && prev.selected === next.selected
    && prev.data === next.data
    && prev.sourceX === next.sourceX
    && prev.sourceY === next.sourceY
    && prev.targetX === next.targetX
    && prev.targetY === next.targetY
    && prev.sourcePosition === next.sourcePosition
    && prev.targetPosition === next.targetPosition
  );
}

export const CustomEdge = memo(CustomEdgeInner, edgePropsEqual);
