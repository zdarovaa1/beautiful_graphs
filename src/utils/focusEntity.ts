import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { SelectedEntity } from '../types'

export const FOCUS_ZOOM_DURATION = 400
export const FOCUS_ZOOM_PADDING = 0.35
export const FOCUS_ZOOM_MAX = 1.25

export function reactFlowNodeIds(entity: SelectedEntity): string[] {
  if (entity.kind === 'node') return [entity.data.id]
  if (entity.kind === 'island') return [`island-${entity.data.id}`]
  return [entity.data.source, entity.data.target]
}

export function useFocusEntity() {
  const { fitView } = useReactFlow()

  return useCallback(
    (entity: SelectedEntity) => {
      void fitView({
        nodes: reactFlowNodeIds(entity).map((id) => ({ id })),
        duration: FOCUS_ZOOM_DURATION,
        padding: FOCUS_ZOOM_PADDING,
        maxZoom: FOCUS_ZOOM_MAX,
      })
    },
    [fitView],
  )
}
