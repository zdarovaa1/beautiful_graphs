import { memo, useContext, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import type { GraphNodeDef } from '../types';
import { FALLBACK_BADGE, FALLBACK_STRIP, getNodeSize, objectTypeColors } from '../theme';
import { ZoomTierContext } from '../GraphView';
import styles from './CustomNode.module.css';

export interface CustomNodeData extends Record<string, unknown> {
  def: GraphNodeDef;
}

const HANDLES: { type: 'source' | 'target'; pos: Position; id: string }[] = [
  { type: 'source', pos: Position.Left,   id: 'left-s'   },
  { type: 'target', pos: Position.Left,   id: 'left-t'   },
  { type: 'source', pos: Position.Right,  id: 'right-s'  },
  { type: 'target', pos: Position.Right,  id: 'right-t'  },
  { type: 'source', pos: Position.Top,    id: 'top-s'    },
  { type: 'target', pos: Position.Top,    id: 'top-t'    },
  { type: 'source', pos: Position.Bottom, id: 'bottom-s' },
  { type: 'target', pos: Position.Bottom, id: 'bottom-t' },
];

export const CustomNode = memo(function CustomNode({ data, selected }: NodeProps) {
  const def = (data as CustomNodeData).def;
  const p = def.additionalParams;
  const { width, height } = getNodeSize(p);
  const badge = p.badgeColor ?? objectTypeColors[def.type] ?? FALLBACK_BADGE;
  const zoomTier = useContext(ZoomTierContext);

  const style = useMemo(() => ({
    width,
    height,
    '--node-strip': p.color ?? FALLBACK_STRIP,
    '--badge-color': badge,
    '--badge-bg': p.badgeBg ?? `${badge}1a`,
    '--node-bg': p.background,
    '--node-border': p.borderColor,
    '--title-color': p.titleColor,
  } as CSSProperties), [width, height, p.color, p.badgeColor, p.badgeBg, p.background, p.borderColor, p.titleColor, badge]);

  // ── Уровень 0: zoom < 0.2 — цветной прямоугольник, текста не видно ──────
  if (zoomTier === 0) {
    return (
      <div className={styles.nodeTiny} style={{ width, height, background: p.color ?? FALLBACK_STRIP }}>
        {HANDLES.map((h) => (
          <Handle key={h.id} type={h.type} position={h.pos} id={h.id} className={styles.handle} />
        ))}
      </div>
    );
  }

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`} style={style}>
      <span className={styles.strip} />
      {/* Уровень 1: zoom < 0.5 — бейдж и заголовок, без описания */}
      {zoomTier >= 1 && <span className={styles.badge}>{def.type}</span>}
      <div className={styles.body}>
        <div className={styles.title} title={def.title}>{def.title}</div>
        {zoomTier >= 2 && def.shortDescription && (
          <div className={styles.desc} title={def.shortDescription}>{def.shortDescription}</div>
        )}
      </div>
      {HANDLES.map((h) => (
        <Handle key={h.id} type={h.type} position={h.pos} id={h.id} className={styles.handle} />
      ))}
    </div>
  );
});
