import type { CommonAdditionalParams } from './types'

export const DEFAULT_NODE_WIDTH = 220
export const DEFAULT_NODE_HEIGHT = 76

export const FALLBACK_STRIP = '#94a3b8'
export const FALLBACK_BADGE = '#64748b'
export const FALLBACK_ISLAND = '#5b8def'
export const FALLBACK_EDGE = '#7c8db5'

export const DEFAULT_EDGE_WIDTH = 2
export const DEFAULT_EDGE_WIDTH_SELECTED = 3.5
export const DEFAULT_EDGE_CURVATURE = 0.35

export function getNodeSize(params: CommonAdditionalParams): { width: number; height: number } {
  return {
    width: params.width ?? DEFAULT_NODE_WIDTH,
    height: params.height ?? DEFAULT_NODE_HEIGHT,
  }
}
