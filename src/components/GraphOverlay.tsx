import { memo, startTransition, useCallback, type Dispatch, type SetStateAction } from 'react'
import type { CSSProperties } from 'react'
import { DetailPanel } from './DetailPanel'
import { SettingsPanel } from './SettingsPanel'
import { Toolbar } from './Toolbar'
import type { SnapEdge, PanelSize } from './FloatingPanel'
import type { DisplaySettings, SelectedEntity, InteractionMode } from '../types'
import type { ToolbarLayout } from '../SnapLayout'

interface SettingsItems {
  objectTypeItems: { key: string; label: string }[]
  edgeTypeItems: { key: string; label: string }[]
  edgeNameItems: { key: string; label: string }[]
  islandTypeItems: { key: string; label: string }[]
  nodeNameItems: { key: string; label: string }[]
  islandNameItems: { key: string; label: string }[]
}

interface FilterStats {
  changed: boolean
  nodes: [number, number]
  edges: [number, number]
  islands: [number, number]
}

interface GraphOverlayProps {
  toolbarStyle: CSSProperties
  toolbarLayout: ToolbarLayout
  showSettings: boolean
  showDetailPanel: boolean
  settings: DisplaySettings
  selected: SelectedEntity | null
  editMode: boolean
  interactionMode: InteractionMode
  isFullscreen: boolean
  filterStats: FilterStats
  hasSavedPositions: boolean
  graphEpoch: number
  settingsItems: SettingsItems
  onToggleSettings: () => void
  onFullscreen: () => void
  onToggleEdit: () => void
  onSetInteractionMode: (mode: InteractionMode) => void
  onResetPositions: () => void
  onImportPositions: (pos: Record<string, { x: number; y: number }>) => void
  getSavedPositions: () => Record<string, { x: number; y: number }>
  onSettingsChange: Dispatch<SetStateAction<DisplaySettings>>
  onSettingsClose: () => void
  onResetFilters: () => void
  onDetailClose: () => void
  onSelectEntity: (entity: SelectedEntity) => void
  onLayout: (snap: SnapEdge, size: PanelSize | null, key: string, pinned?: boolean) => void
}

export const GraphOverlay = memo(function GraphOverlay({
  toolbarStyle,
  toolbarLayout,
  showSettings,
  showDetailPanel,
  settings,
  selected,
  editMode,
  interactionMode,
  isFullscreen,
  filterStats,
  hasSavedPositions,
  graphEpoch,
  settingsItems,
  onToggleSettings,
  onFullscreen,
  onToggleEdit,
  onSetInteractionMode,
  onResetPositions,
  onImportPositions,
  getSavedPositions,
  onSettingsChange,
  onSettingsClose,
  onResetFilters,
  onDetailClose,
  onSelectEntity,
  onLayout,
}: GraphOverlayProps) {
  const handleSettingsChange = useCallback(
    (s: SetStateAction<DisplaySettings>) => {
      startTransition(() => onSettingsChange(s))
    },
    [onSettingsChange],
  )

  return (
    <>
      <Toolbar
        style={toolbarStyle}
        layout={toolbarLayout}
        onToggleSettings={onToggleSettings}
        settingsActive={showSettings}
        onFullscreen={onFullscreen}
        isFullscreen={isFullscreen}
        editMode={editMode}
        onToggleEdit={onToggleEdit}
        interactionMode={interactionMode}
        effectiveMode={interactionMode}
        onSetInteractionMode={onSetInteractionMode}
        filtersChanged={filterStats.changed}
        filterStats={filterStats}
        hasSavedPositions={hasSavedPositions}
        onResetPositions={onResetPositions}
        onImportPositions={onImportPositions}
        getSavedPositions={getSavedPositions}
      />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          onClose={onSettingsClose}
          onReset={onResetFilters}
          onLayout={onLayout}
          {...settingsItems}
        />
      )}

      {showDetailPanel && (
        <DetailPanel
          selected={selected}
          settings={settings}
          graphEpoch={graphEpoch}
          onChange={handleSettingsChange}
          onClose={onDetailClose}
          onSelectEntity={onSelectEntity}
          onLayout={onLayout}
        />
      )}
    </>
  )
})
