import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import type { GraphNodeDef } from '../types';
import { FALLBACK_BADGE, FALLBACK_STRIP, getNodeSize, objectTypeColors } from '../theme';
import styles from './CustomNode.module.css';

export interface CustomNodeData extends Record<string, unknown> {
  def: GraphNodeDef;
}

export function CustomNode({ data, selected }: NodeProps) {
  const def = (data as CustomNodeData).def;
  const p = def.additionalParams;
  const { width, height } = getNodeSize(p);
  const badge = p.badgeColor ?? objectTypeColors[def.type] ?? FALLBACK_BADGE;

  const style = {
    width,
    height,
    '--node-strip': p.color ?? FALLBACK_STRIP,
    '--badge-color': badge,
    '--badge-bg': p.badgeBg ?? `${badge}1a`,
    '--node-bg': p.background,
    '--node-border': p.borderColor,
    '--title-color': p.titleColor,
  } as CSSProperties;

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`} style={style}>
      <span className={styles.strip} />
      <span className={styles.badge}>{def.type}</span>
      <div className={styles.body}>
        <div className={styles.title} title={def.title}>
          {def.title}
        </div>
        <div className={styles.desc}>{def.description ? 'Описание' : ''}</div>
      </div>

      <Handle type="target" position={Position.Left} className={styles.handle} />
      <Handle type="source" position={Position.Right} className={styles.handle} />
      <Handle type="target" position={Position.Right} id="r" className={styles.handle} />
      <Handle type="source" position={Position.Left} id="l" className={styles.handle} />
    </div>
  );
}
