import { useEffect, useState } from 'react'
import { GraphView } from './GraphView'
import { nodes, edges, islands } from './data/graphData'
import { runElkLayout } from './layout/elkLayout'
import type { GraphLayoutBundle } from './types'
import styles from './App.module.css'

export default function App() {
  const [graph, setGraph] = useState<GraphLayoutBundle | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const layout = await runElkLayout(nodes, edges, islands)
      if (!alive) return
      const positions: GraphLayoutBundle['positions'] = {}
      for (const [id, p] of layout) {
        positions[id] = { x: p.x, y: p.y }
      }
      setGraph({ nodes, edges, islands, positions })
    })()
    return () => {
      alive = false
    }
  }, [])

  return <div className={styles.app}>{graph && <GraphView graph={graph} />}</div>
}
