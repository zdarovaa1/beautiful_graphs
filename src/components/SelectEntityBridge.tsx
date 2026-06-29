import { memo, useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { SelectedEntity } from '../types'
import { reactFlowNodeIds } from '../utils/focusEntity'

interface SelectEntityBridgeProps {
  onReady: (select: (entity: SelectedEntity) => void) => void
}

export const SelectEntityBridge = memo(function SelectEntityBridge({ onReady }: SelectEntityBridgeProps) {
  const { setNodes, setEdges } = useReactFlow()
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const select = (entity: SelectedEntity) => {
      const rfIds = new Set(reactFlowNodeIds(entity))
      setNodes((ns) => ns.map((n) => ({ ...n, selected: rfIds.has(n.id) })))
      if (entity.kind === 'edge') {
        setEdges((es) => es.map((e) => ({ ...e, selected: e.id === entity.data.id })))
      } else {
        setEdges((es) => es.map((e) => ({ ...e, selected: false })))
      }
    }
    onReadyRef.current(select)
  }, [setNodes, setEdges])

  return null
})
