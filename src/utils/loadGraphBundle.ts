import type { GraphLayoutBundle } from '../types'
import type { LaidOutNode } from '../layout/elkLayout'

export function bundleToLayoutMap(bundle: GraphLayoutBundle): Map<string, LaidOutNode> {
  return new Map(Object.entries(bundle.positions).map(([id, p]) => [id, { id, x: p.x, y: p.y }]))
}
