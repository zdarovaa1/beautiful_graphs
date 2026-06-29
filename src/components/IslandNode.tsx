import { memo, type MouseEvent } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { defaultIslandBg, defaultIslandBorder, defaultBadgeBg, resolveColor } from '../utils/color';
import { FALLBACK_ISLAND, islandTypeColors } from '../theme';
import { islandDefById } from '../utils/graphRegistry';
import type { IslandNodeDataRef } from '../utils/graphRegistry';
import styles from './IslandNode.module.css';

const stopProp = (e: MouseEvent) => e.stopPropagation();

function IslandNodeInner({ data, selected }: NodeProps) {
  const { defId, width, height } = data as IslandNodeDataRef;
  const def = islandDefById.get(defId);
  if (!def) return null;

  const p = def.additionalParams;
  const color = resolveColor(p.color ?? islandTypeColors[def.type], FALLBACK_ISLAND);
  const badge = resolveColor(p.badgeColor, color);

  const style = {
    width,
    height,
    '--island-bg': p.background ?? defaultIslandBg(color),
    '--island-border': p.borderColor ?? defaultIslandBorder(color),
    '--badge-color': badge,
    '--badge-bg': p.badgeBg ?? defaultBadgeBg(badge),
  } as CSSProperties;

  return (
    <div
      className={`${styles.island} ${selected ? styles.selected : ''}`}
      style={style}
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
      </div>
      <span className={styles.badge}>{def.type}</span>
    </div>
  );
}

function islandPropsEqual(prev: NodeProps, next: NodeProps): boolean {
  return (
    prev.id === next.id
    && prev.selected === next.selected
    && prev.dragging === next.dragging
    && prev.data === next.data
  );
}

export const IslandNode = memo(IslandNodeInner, islandPropsEqual);
