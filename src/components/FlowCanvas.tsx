import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  SelectionMode,
  useNodesState,
  useStore,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react'
import { shallow } from 'zustand/shallow'
import { CustomNode } from './CustomNode'
import { CustomEdge } from './CustomEdge'
import { IslandNode } from './IslandNode'
import { FocusEntityBridge } from './FocusEntityBridge'
import { SelectEntityBridge } from './SelectEntityBridge'
import { SelectionToolbar } from './SelectionToolbar'
import { SharedEdgeDefs } from './SharedEdgeDefs'
import type { InteractionMode, SelectedEntity } from '../types'
import { syncDerivedNodes } from '../utils/syncDerivedNodes'
import { selectZoomTier, ZoomTierContext } from '../utils/zoomTier'

const RF_NODE_TYPES = { graph: CustomNode, island: IslandNode }
const RF_EDGE_TYPES = { custom: CustomEdge }

const MIN_ZOOM = 0.05
const MAX_ZOOM = 2.5
const BG_GAP = 22
const BG_DOT_SIZE = 1.4
const BG_DOT_COLOR = '#c7d2e0'
const MINIMAP_MAX_NODES = 800

const PRO_OPTIONS = { hideAttribution: true } as const

const MINIMAP_STYLE = {
  width: 180,
  height: 120,
  right: 16,
  bottom: 16,
  borderRadius: 14,
  border: '1px solid #d6e0ee',
  boxShadow: '0 10px 24px rgba(30, 58, 95, 0.16)',
  background: '#ffffffcc',
  overflow: 'hidden',
} as const

const minimapNodeColor = (node: Node) => (node.type === 'island' ? '#dbeafe' : '#93c5fd')
const minimapNodeStrokeColor = (node: Node) => (node.type === 'island' ? '#60a5fa' : '#2563eb')

const PAN_ON_DRAG_SELECT: number[] = [1, 2]

const selectZoomTierFromStore = (s: { transform: [number, number, number] }) => selectZoomTier(s.transform[2])

const selectSelectedIds = (s: { nodeLookup: Map<string, Node> }) =>
  [...s.nodeLookup.values()].filter((n) => n.selected).map((n) => n.id)

const selectSelectedGraphIds = (s: { nodeLookup: Map<string, Node> }) =>
  [...s.nodeLookup.values()].filter((n) => n.selected && n.type === 'graph').map((n) => n.id)

interface FlowCanvasProps {
  derivedNodes: Node[]
  edges: Edge[]
  graphId: string
  isEditMode: boolean
  interactionMode: InteractionMode
  onNodeClick: NodeMouseHandler
  onEdgeClick: EdgeMouseHandler
  onPaneClick: () => void
  onNodeDragStop: (e: unknown, node: Node, draggedNodes: Node[]) => void
  setNodesExternal: (setter: (payload: Node[] | ((ns: Node[]) => Node[])) => void) => void
  onAlignH: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => void
  onAlignV: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => void
  onElkLayout: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => Promise<void>
  onFocusReady: (focus: (entity: SelectedEntity) => void) => void
  onSelectReady: (select: (entity: SelectedEntity) => void) => void
}

export const FlowCanvas = memo(function FlowCanvas({
  derivedNodes,
  edges,
  graphId,
  isEditMode,
  interactionMode,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onNodeDragStop,
  setNodesExternal,
  onAlignH,
  onAlignV,
  onElkLayout,
  onFocusReady,
  onSelectReady,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes)

  useEffect(() => {
    setNodes((current) => syncDerivedNodes(current, derivedNodes))
  }, [derivedNodes, setNodes])

  const setNodesExternalRef = useRef(setNodesExternal)
  setNodesExternalRef.current = setNodesExternal
  useEffect(() => {
    setNodesExternalRef.current(setNodes)
  }, [setNodes])

  const isHand = interactionMode === 'hand'

  const zoomTier = useStore(selectZoomTierFromStore)

  const selectedIds = useStore(selectSelectedIds, shallow)

  const selectedGraphIds = useStore(selectSelectedGraphIds, shallow)

  const [selectionLayoutTick, setSelectionLayoutTick] = useState(0)
  const bumpSelectionLayout = useCallback(() => {
    setSelectionLayoutTick((t) => t + 1)
  }, [])

  const handleAlignH = useCallback(() => {
    onAlignH(selectedGraphIds, setNodes)
  }, [onAlignH, selectedGraphIds, setNodes])

  const handleAlignV = useCallback(() => {
    onAlignV(selectedGraphIds, setNodes)
  }, [onAlignV, selectedGraphIds, setNodes])

  const handleElkLayout = useCallback(() => {
    return onElkLayout(selectedGraphIds, setNodes)
  }, [onElkLayout, selectedGraphIds, setNodes])

  const showMiniMap = derivedNodes.length <= MINIMAP_MAX_NODES

  return (
    <ZoomTierContext.Provider value={zoomTier}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={RF_NODE_TYPES}
        edgeTypes={RF_EDGE_TYPES}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeDrag={bumpSelectionLayout}
        onMove={bumpSelectionLayout}
        nodesDraggable={isEditMode}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={!isHand}
        panOnDrag={isHand ? true : PAN_ON_DRAG_SELECT}
        panOnScroll={false}
        selectNodesOnDrag={!isHand && isEditMode ? false : !isHand}
        elevateNodesOnSelect={false}
        multiSelectionKeyCode={['Control', 'Meta']}
        selectionKeyCode={null}
        deleteKeyCode={null}
        fitView
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        proOptions={PRO_OPTIONS}
        nodesConnectable={false}
        nodesFocusable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={BG_GAP}
          size={BG_DOT_SIZE}
          color={BG_DOT_COLOR}
          bgColor='transparent'
        />
        <SharedEdgeDefs graphId={graphId} />
        <FocusEntityBridge onReady={onFocusReady} />
        <SelectEntityBridge onReady={onSelectReady} />
        {showMiniMap && (
          <MiniMap
            position='bottom-right'
            pannable
            zoomable
            maskColor='rgba(15, 23, 42, 0.08)'
            nodeBorderRadius={8}
            nodeStrokeWidth={2}
            nodeColor={minimapNodeColor}
            nodeStrokeColor={minimapNodeStrokeColor}
            style={MINIMAP_STYLE}
          />
        )}
      </ReactFlow>
      <SelectionToolbar
        selectedIds={selectedIds}
        isEditMode={isEditMode}
        onAlignH={handleAlignH}
        onAlignV={handleAlignV}
        onElkLayout={handleElkLayout}
        layoutTick={selectionLayoutTick}
        onLayoutBump={bumpSelectionLayout}
      />
    </ZoomTierContext.Provider>
  )
})
