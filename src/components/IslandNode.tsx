import { type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { IconEye } from '@tabler/icons-react';
import type { IslandDef } from '../types';
import { FALLBACK_ISLAND, islandTypeColors } from '../theme';
import styles from './IslandNode.module.css';

export interface IslandNodeData extends Record<string, unknown> {
  def: IslandDef;
  width: number;
  height: number;
}

export function IslandNode({ data, selected }: NodeProps) {
  const { def, width, height } = data as IslandNodeData;
  const p = def.additionalParams;
  const color = p.color ?? islandTypeColors[def.type] ?? FALLBACK_ISLAND;
  const badge = p.badgeColor ?? color;

  const style = {
    width,
    height,
    '--island-bg': p.background ?? `${color}14`,
    '--island-border': p.borderColor ?? `${color}66`,
    '--badge-color': badge,
    '--badge-bg': p.badgeBg ?? `${badge}1f`,
  } as CSSProperties;

  return (
    <div className={`${styles.island} ${selected ? styles.selected : ''}`} style={style}>
      <div className={styles.header}>
        <span className={styles.title}>{def.title}</span>
        <IconEye size={16} className={styles.eye} />
      </div>
      <span className={styles.badge}>{def.type}</span>
    </div>
  );
}
