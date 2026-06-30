import { memo, useContext, useMemo } from 'react'
import type React from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CSSProperties } from 'react'
import { getNodeSize } from '../theme'
import { withAlpha } from '../utils/normalizeGraphColors'
import { nodeDefById } from '../utils/graphRegistry'
import type { GraphNodeDataRef } from '../utils/graphRegistry'
import { ZoomTierContext } from '../utils/zoomTier'
import styles from './CustomNode.module.css'

type HandleEntry = {
  type: 'source' | 'target'
  pos: Position
  id: string
  style: React.CSSProperties
}

function buildHandles(): HandleEntry[] {
  const sides: Array<{ pos: Position; axis: 'v' | 'h'; key: string }> = [
    { pos: Position.Left, axis: 'v', key: 'left' },
    { pos: Position.Right, axis: 'v', key: 'right' },
    { pos: Position.Top, axis: 'h', key: 'top' },
    { pos: Position.Bottom, axis: 'h', key: 'bottom' },
  ]
  const slots: Array<['1' | '2' | '3', string]> = [
    ['1', '25%'],
    ['2', '50%'],
    ['3', '75%'],
  ]
  const result: HandleEntry[] = []
  for (const { pos, axis, key } of sides) {
    for (const [slot, offset] of slots) {
      const style: React.CSSProperties = axis === 'v' ? { top: offset } : { left: offset }
      for (const type of ['source', 'target'] as const) {
        result.push({ type, pos, id: `${key}-${type[0]}-${slot}`, style })
      }
    }
  }
  return result
}

const HANDLES = buildHandles()

const HandleLayer = memo(function HandleLayer() {
  return (
    <>
      {HANDLES.map((h) => (
        <Handle key={h.id} type={h.type} position={h.pos} id={h.id} className={styles.handle} style={h.style} />
      ))}
    </>
  )
})

function CustomNodeInner({ data, selected }: NodeProps) {
  const zoomTier = useContext(ZoomTierContext)
  const { defId } = data as GraphNodeDataRef
  const def = nodeDefById.get(defId)

  const layout = useMemo(() => {
    if (!def) return null
    const p = def.additionalParams
    const { width, height } = getNodeSize(p)
    const color = p.color!
    const style = {
      width,
      height,
      '--node-strip': color,
      '--badge-color': p.badgeColor,
      '--badge-bg': p.badgeBg,
      '--node-bg': p.background ?? '#fff',
      '--node-border': p.borderColor,
      '--title-color': p.titleColor,
      '--node-select-border': p.borderColor ?? withAlpha(color, 0.55),
      '--node-select-bg': withAlpha(color, 0.12),
      '--node-select-ring': withAlpha(color, 0.3),
    } as CSSProperties
    return { width, height, strip: color, style }
  }, [def])

  if (!def || !layout) return null

  const { width, height, strip, style } = layout

  if (zoomTier === 0) {
    return (
      <div className={styles.nodeTiny} style={{ width, height, background: strip }}>
        <HandleLayer />
      </div>
    )
  }

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`} style={style}>
      <span className={styles.strip} />
      {zoomTier >= 1 && <span className={styles.badge}>{def.type}</span>}
      <div className={styles.body}>
        {zoomTier >= 1 && <div className={styles.title}>{def.title}</div>}
        {zoomTier >= 2 && def.shortDescription && <div className={styles.desc}>{def.shortDescription}</div>}
      </div>
      <HandleLayer />
    </div>
  )
}

function nodePropsEqual(prev: NodeProps, next: NodeProps): boolean {
  return (
    prev.id === next.id && prev.selected === next.selected && prev.dragging === next.dragging && prev.data === next.data
  )
}

export const CustomNode = memo(CustomNodeInner, nodePropsEqual)
