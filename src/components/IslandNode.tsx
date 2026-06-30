import { memo, useCallback, useMemo, type MouseEvent } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { CSSProperties } from 'react'
import { islandDefById } from '../utils/graphRegistry'
import type { IslandNodeDataRef } from '../utils/graphRegistry'
import styles from './IslandNode.module.css'

function IslandNodeInner({ data, selected }: NodeProps) {
  const { defId, width, height } = data as IslandNodeDataRef
  const def = islandDefById.get(defId)

  const style = useMemo((): CSSProperties | null => {
    if (!def) return null
    const p = def.additionalParams
    return {
      width,
      height,
      '--island-bg': p.background,
      '--island-border': p.borderColor,
      '--badge-color': p.badgeColor,
      '--badge-bg': p.badgeBg,
    } as CSSProperties
  }, [def, width, height])

  const stopProp = useCallback((e: MouseEvent) => e.stopPropagation(), [])

  if (!def || !style) return null

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
          {def.shortDescription && <span className={styles.subtitle}>{def.shortDescription}</span>}
        </div>
      </div>
      <span className={styles.badge}>{def.type}</span>
    </div>
  )
}

function islandPropsEqual(prev: NodeProps, next: NodeProps): boolean {
  return (
    prev.id === next.id && prev.selected === next.selected && prev.dragging === next.dragging && prev.data === next.data
  )
}

export const IslandNode = memo(IslandNodeInner, islandPropsEqual)
