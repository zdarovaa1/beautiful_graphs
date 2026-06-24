import { memo, useMemo, type MouseEvent } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { IconEye } from '@tabler/icons-react';
import type { IslandDef } from '../types';
import { FALLBACK_ISLAND, islandTypeColors } from '../theme';
import styles from './IslandNode.module.css';

const stopProp = (e: MouseEvent) => e.stopPropagation();

export interface IslandNodeData extends Record<string, unknown> {
  def: IslandDef;
  width: number;
  height: number;
}

export const IslandNode = memo(function IslandNode({ data, selected }: NodeProps) {
  const { def, width, height } = data as IslandNodeData;
  const p = def.additionalParams;
  const color = p.color ?? islandTypeColors[def.type] ?? FALLBACK_ISLAND;
  const badge = p.badgeColor ?? color;

  const style = useMemo(() => ({
    width,
    height,
    '--island-bg': p.background ?? `${color}14`,
    '--island-border': p.borderColor ?? `${color}66`,
    '--badge-color': badge,
    '--badge-bg': p.badgeBg ?? `${badge}1f`,
  } as CSSProperties), [width, height, color, badge, p.background, p.borderColor, p.badgeBg]);

  return (
    <div
      className={`${styles.island} ${selected ? styles.selected : ''}`}
      style={style}
      // Останавливаем пузырение mouse-событий к React Flow NodeWrapper.
      // Иначе каждый mousemove над header/badge (у которых pointer-events:auto)
      // всплывал бы к wrapper'у острова и мог триггерить store-обновления.
      onMouseEnter={stopProp}
      onMouseMove={stopProp}
      onMouseLeave={stopProp}
    >
      <div className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.title}>{def.title}</span>
          {def.shortDescription && (
            <span className={styles.subtitle}>{def.shortDescription}</span>
          )}
        </div>
        <IconEye size={16} className={styles.eye} />
      </div>
      <span className={styles.badge}>{def.type}</span>
    </div>
  );
});
