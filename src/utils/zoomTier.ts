import { createContext } from 'react'

/** Порог zoom: ниже — tier 0 (точки) */
export const ZOOM_TIER_0_MAX = 0.12
/** Порог zoom: ниже — tier 1 (заголовок), выше — tier 2 (полная детализация) */
export const ZOOM_TIER_1_MAX = 0.38

export type ZoomTier = 0 | 1 | 2

export const ZoomTierContext = createContext<ZoomTier>(2)

export function selectZoomTier(z: number): ZoomTier {
  if (z < ZOOM_TIER_0_MAX) return 0
  if (z < ZOOM_TIER_1_MAX) return 1
  return 2
}
