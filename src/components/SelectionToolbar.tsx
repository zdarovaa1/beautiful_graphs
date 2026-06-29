import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useReactFlow, useStore } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import { IconCamera, IconLayoutAlignMiddle, IconLayoutAlignCenter, IconTopologyStar3 } from '@tabler/icons-react'
import { ScreenshotPreviewModal } from './ScreenshotPreviewModal'
import { getGraphNodes } from '../utils/graphRegistry'
import { useGraphTexts } from '../texts/GraphTextsContext'
import { Tooltip } from './Tooltip'
import styles from './SelectionToolbar.module.css'

const GAP = 10
const MARGIN = 8

interface SelectionToolbarProps {
  selectedIds: string[]
  isEditMode: boolean
  onAlignH: () => void
  onAlignV: () => void
  onElkLayout: () => Promise<void>
  layoutTick: number
  onLayoutBump: () => void
}

function expandScreenshotIds(selectedIds: string[], allNodes: Node[]): string[] {
  const result = new Set<string>()
  const nodesById = new Map(allNodes.map((n) => [n.id, n]))

  for (const id of selectedIds) {
    const node = nodesById.get(id)
    if (node?.type === 'island') {
      const islandId = id.replace(/^island-/, '')
      const members = getGraphNodes().filter((n) => n.islandIds.includes(islandId))
      members.forEach((n) => result.add(n.id))
      result.add(id)
    } else {
      result.add(id)
    }
  }

  return [...result]
}

function measureSelectionBounds(flowRoot: Element, container: Element) {
  const nodes = flowRoot.querySelectorAll<HTMLElement>('.react-flow__node.selected')
  if (nodes.length === 0) return null

  const containerRect = container.getBoundingClientRect()
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity

  nodes.forEach((n) => {
    const b = n.getBoundingClientRect()
    left = Math.min(left, b.left)
    top = Math.min(top, b.top)
    right = Math.max(right, b.right)
    bottom = Math.max(bottom, b.bottom)
  })

  return {
    cx: (left + right) / 2 - containerRect.left,
    top: top - containerRect.top,
    bottom: bottom - containerRect.top,
    containerW: containerRect.width,
    containerH: containerRect.height,
  }
}

const ToolBtn = memo(function ToolBtn({
  title,
  onClick,
  disabled,
  children,
  className,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Tooltip title={title}>
      <button type='button' className={`${styles.btn} ${className ?? ''}`} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    </Tooltip>
  )
})

export const SelectionToolbar = memo(function SelectionToolbar({
  selectedIds,
  isEditMode,
  onAlignH,
  onAlignV,
  onElkLayout,
  layoutTick,
  onLayoutBump,
}: SelectionToolbarProps) {
  const texts = useGraphTexts()
  const { getNodes, getEdges } = useReactFlow()
  const graphSelectedCount = useStore(
    (s: { nodeLookup: Map<string, Node> }) =>
      [...s.nodeLookup.values()].filter((n) => n.selected && n.type === 'graph').length,
  )
  const barRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [screenshotIds, setScreenshotIds] = useState<string[]>([])
  const [elkBusy, setElkBusy] = useState(false)

  const openPreview = useCallback(() => {
    if (selectedIds.length === 0) return
    setScreenshotIds(expandScreenshotIds(selectedIds, getNodes()))
    setPreviewOpen(true)
  }, [selectedIds, getNodes])

  const closePreview = useCallback(() => setPreviewOpen(false), [])

  const handleAlignH = useCallback(() => {
    onAlignH()
    onLayoutBump()
  }, [onAlignH, onLayoutBump])

  const handleAlignV = useCallback(() => {
    onAlignV()
    onLayoutBump()
  }, [onAlignV, onLayoutBump])

  const handleElk = useCallback(async () => {
    if (elkBusy) return
    setElkBusy(true)
    try {
      await onElkLayout()
      onLayoutBump()
    } finally {
      setElkBusy(false)
    }
  }, [elkBusy, onElkLayout, onLayoutBump])

  const updatePosition = useCallback(() => {
    if (selectedIds.length === 0) {
      setPos(null)
      return
    }

    const bar = barRef.current
    if (!bar) return

    const container = bar.offsetParent as HTMLElement | null
    const flowRoot = container?.querySelector('.react-flow')
    if (!container || !flowRoot) return

    const bounds = measureSelectionBounds(flowRoot, container)
    if (!bounds) {
      setPos(null)
      return
    }

    const barH = bar.offsetHeight || 42
    let top = bounds.top - GAP - barH
    if (top < MARGIN) {
      top = bounds.bottom + GAP
    }
    top = Math.min(top, bounds.containerH - barH - MARGIN)

    const left = Math.max(MARGIN, Math.min(bounds.containerW - MARGIN, bounds.cx))

    setPos({ left, top })
  }, [selectedIds])

  useLayoutEffect(() => {
    updatePosition()
    const id = requestAnimationFrame(updatePosition)
    return () => cancelAnimationFrame(id)
  }, [updatePosition, layoutTick, selectedIds])

  const barStyle = useMemo((): CSSProperties | undefined => (pos ? { left: pos.left, top: pos.top } : undefined), [pos])

  if (selectedIds.length === 0) return null

  return (
    <>
      <div ref={barRef} className={styles.bar} style={barStyle}>
        {isEditMode && graphSelectedCount >= 2 && (
          <>
            <ToolBtn title={texts.selectionToolbar.alignH} onClick={handleAlignH}>
              <IconLayoutAlignMiddle size={16} />
            </ToolBtn>
            <ToolBtn title={texts.selectionToolbar.alignV} onClick={handleAlignV}>
              <IconLayoutAlignCenter size={16} />
            </ToolBtn>
            <ToolBtn
              title={texts.selectionToolbar.elkLayout}
              onClick={() => {
                void handleElk()
              }}
              disabled={elkBusy}
              className={elkBusy ? styles.btnBusy : ''}
            >
              <IconTopologyStar3 size={16} className={elkBusy ? styles.spin : undefined} />
            </ToolBtn>
            <div className={styles.sep} />
          </>
        )}
        <ToolBtn title={texts.selectionToolbar.screenshot} onClick={openPreview}>
          <IconCamera size={16} />
        </ToolBtn>
      </div>

      {previewOpen && (
        <ScreenshotPreviewModal
          selectedIds={screenshotIds}
          allNodes={getNodes()}
          allEdges={getEdges()}
          onClose={closePreview}
        />
      )}
    </>
  )
})
