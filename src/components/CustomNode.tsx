import { memo, useContext } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import {
  defaultBadgeBg,
  nodeSelectionColors,
  NODE_SURFACE,
  resolveColor,
} from '../utils/color';
import { FALLBACK_BADGE, FALLBACK_STRIP, getNodeSize, objectTypeColors } from '../theme';
import { nodeDefById } from '../utils/graphRegistry';
import type { GraphNodeDataRef } from '../utils/graphRegistry';
import { ZoomTierContext } from '../utils/zoomTier';
import { Tooltip } from './Tooltip';
import styles from './CustomNode.module.css';

const HANDLES: { type: 'source' | 'target'; pos: Position; id: string }[] = [
  { type: 'source', pos: Position.Left, id: 'left-s' },
  { type: 'target', pos: Position.Left, id: 'left-t' },
  { type: 'source', pos: Position.Right, id: 'right-s' },
  { type: 'target', pos: Position.Right, id: 'right-t' },
  { type: 'source', pos: Position.Top, id: 'top-s' },
  { type: 'target', pos: Position.Top, id: 'top-t' },
  { type: 'source', pos: Position.Bottom, id: 'bottom-s' },
  { type: 'target', pos: Position.Bottom, id: 'bottom-t' },
];

const HandleLayer = memo(function HandleLayer() {
  return (
    <>
      {HANDLES.map((h) => (
        <Handle key={h.id} type={h.type} position={h.pos} id={h.id} className={styles.handle} />
      ))}
    </>
  );
});

function CustomNodeInner({ data, selected }: NodeProps) {
  const { defId } = data as GraphNodeDataRef;
  const def = nodeDefById.get(defId);
  if (!def) return null;

  const p = def.additionalParams;
  const { width, height } = getNodeSize(p);
  const strip = resolveColor(p.color, FALLBACK_STRIP);
  const badge = resolveColor(p.badgeColor ?? objectTypeColors[def.type], FALLBACK_BADGE);
  const selection = nodeSelectionColors(strip, {
    borderColor: p.borderColor,
    selectedBackground: p.selectedBackground as string | undefined,
  });
  const zoomTier = useContext(ZoomTierContext);

  const style = {
    width,
    height,
    '--node-strip': strip,
    '--badge-color': badge,
    '--badge-bg': p.badgeBg ?? defaultBadgeBg(badge),
    '--node-bg': p.background ?? NODE_SURFACE,
    '--node-border': p.borderColor,
    '--title-color': p.titleColor,
    '--node-select-border': selection.border,
    '--node-select-bg': selection.background,
    '--node-select-ring': selection.ring,
  } as CSSProperties;

  if (zoomTier === 0) {
    return (
      <div className={styles.nodeTiny} style={{ width, height, background: strip }}>
        <HandleLayer />
      </div>
    );
  }

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`} style={style}>
      <span className={styles.strip} />
      {zoomTier >= 1 && <span className={styles.badge}>{def.type}</span>}
      <div className={styles.body}>
        {zoomTier >= 2 ? (
          <Tooltip title={def.title} block>
            <div className={styles.title}>{def.title}</div>
          </Tooltip>
        ) : (
          <div className={styles.title} title={def.title}>{def.title}</div>
        )}
        {zoomTier >= 2 && def.shortDescription && (
          <Tooltip title={def.shortDescription} block>
            <div className={styles.desc}>{def.shortDescription}</div>
          </Tooltip>
        )}
      </div>
      <HandleLayer />
    </div>
  );
}

function nodePropsEqual(prev: NodeProps, next: NodeProps): boolean {
  return (
    prev.id === next.id
    && prev.selected === next.selected
    && prev.dragging === next.dragging
    && prev.data === next.data
  );
}

export const CustomNode = memo(CustomNodeInner, nodePropsEqual);
