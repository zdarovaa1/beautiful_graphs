import { memo, useMemo } from 'react'
import { FALLBACK_EDGE } from '../theme'
import { getGraphEdges } from '../utils/graphRegistry'

function edgeColorKey(color: string): string {
  return color.replace(/[^a-z0-9]/gi, '')
}

const SVG_STYLE = { position: 'absolute', width: 0, height: 0, overflow: 'hidden' } as const

export const SharedEdgeDefs = memo(function SharedEdgeDefs({ graphId }: { graphId: string }) {
  const colors = useMemo(() => {
    const set = new Set<string>([FALLBACK_EDGE])
    for (const edge of getGraphEdges()) {
      set.add(edge.additionalParams.color ?? FALLBACK_EDGE)
    }
    return [...set]
  }, [graphId])

  return (
    <svg aria-hidden style={SVG_STYLE}>
      <defs>
        {colors.map((color) => (
          <marker
            key={color}
            id={`arrow-${edgeColorKey(color)}`}
            markerWidth='12'
            markerHeight='12'
            viewBox='0 0 14 14'
            refX='10'
            refY='7'
            orient='auto-start-reverse'
          >
            <path d='M2,2 L12,7 L2,12 Z' fill={color} />
          </marker>
        ))}
      </defs>
    </svg>
  )
})
