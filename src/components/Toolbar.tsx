import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useReactFlow } from '@xyflow/react'
import {
  IconAdjustmentsHorizontal,
  IconZoomIn,
  IconZoomOut,
  IconCurrentLocation,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconLock,
  IconLockOpen,
  IconRestore,
  IconDownload,
  IconUpload,
  IconHandStop,
  IconPointer,
  IconPackage,
  IconLoader2,
} from '@tabler/icons-react'
import { buildGraphLayoutBundle, downloadJsonFile, parseGraphData } from '../utils/buildGraphLayout'
import type { InteractionMode } from '../types'
import type { ToolbarLayout } from '../SnapLayout'
import { useReportToolbarLayout } from '../SnapLayout'
import { useGraphTexts } from '../texts/GraphTextsContext'
import { Tooltip } from './Tooltip'
import styles from './Toolbar.module.css'

type PosMap = Record<string, { x: number; y: number }>

interface FilterStats {
  changed: boolean
  nodes: [number, number]
  edges: [number, number]
  islands: [number, number]
}

interface ToolbarProps {
  style?: React.CSSProperties
  layout?: ToolbarLayout
  onToggleSettings: () => void
  settingsActive: boolean
  onFullscreen: () => void
  isFullscreen: boolean
  editMode: boolean
  onToggleEdit: () => void
  interactionMode: InteractionMode
  effectiveMode: InteractionMode
  onSetInteractionMode: (m: InteractionMode) => void
  filtersChanged: boolean
  filterStats: FilterStats
  hasSavedPositions: boolean
  onResetPositions: () => void
  onImportPositions: (pos: PosMap) => void
  getSavedPositions: () => PosMap
}

const ZOOM_DURATION = 250
const FIT_DURATION = 400
const FIT_PADDING = 0.2

export const Toolbar = memo(function Toolbar({
  style,
  layout = 'horizontal',
  onToggleSettings,
  settingsActive,
  onFullscreen,
  isFullscreen,
  editMode,
  onToggleEdit,
  interactionMode,
  effectiveMode,
  onSetInteractionMode,
  filtersChanged,
  filterStats,
  hasSavedPositions,
  onResetPositions,
  onImportPositions,
  getSavedPositions,
}: ToolbarProps) {
  const texts = useGraphTexts()
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const reportToolbarLayout = useReportToolbarLayout()
  const [dropOpen, setDropOpen] = useState(false)
  const [elkBusy, setElkBusy] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const graphDataImportRef = useRef<HTMLInputElement>(null)
  const dropWrapRef = useRef<HTMLDivElement>(null)

  const showFilterStats = filterStats.changed

  useLayoutEffect(() => {
    reportToolbarLayout({ showFilterStats })
  }, [reportToolbarLayout, showFilterStats])

  useEffect(() => {
    if (!dropOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (dropWrapRef.current?.contains(e.target as globalThis.Node)) return
      setDropOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [dropOpen])

  const closeDrop = useCallback(() => setDropOpen(false), [])

  const handleZoomIn = useCallback(() => zoomIn({ duration: ZOOM_DURATION }), [zoomIn])
  const handleZoomOut = useCallback(() => zoomOut({ duration: ZOOM_DURATION }), [zoomOut])
  const handleFitView = useCallback(() => fitView({ duration: FIT_DURATION, padding: FIT_PADDING }), [fitView])
  const handleSetHand = useCallback(() => onSetInteractionMode('hand'), [onSetInteractionMode])
  const handleSetCursor = useCallback(() => onSetInteractionMode('cursor'), [onSetInteractionMode])
  const handleDropToggle = useCallback(() => setDropOpen((o) => !o), [])

  const exportPositions = useCallback(() => {
    const blob = new Blob([JSON.stringify(getSavedPositions(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'graph-positions.json'
    a.click()
    URL.revokeObjectURL(url)
    setDropOpen(false)
  }, [getSavedPositions, closeDrop])

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string) as PosMap
          onImportPositions(parsed)
        } catch {
          /* ignore */
        }
      }
      reader.readAsText(file)
      e.target.value = ''
      setDropOpen(false)
    },
    [onImportPositions, closeDrop],
  )

  const handleGraphDataImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      setElkBusy(true)
      try {
        const parsed = parseGraphData(JSON.parse(ev.target?.result as string))
        const bundle = await buildGraphLayoutBundle(parsed)
        const baseName = file.name.replace(/\.json$/i, '') || 'graph'
        downloadJsonFile(bundle, `${baseName}-layout.json`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : texts.toolbar.elkFileError
        window.alert(msg)
      } finally {
        setElkBusy(false)
      }
    }
    reader.onerror = () => {
      window.alert(texts.toolbar.fileReadError)
      setElkBusy(false)
    }
    reader.readAsText(file)
  }, [])

  const isVertical = layout === 'vertical'

  return (
    <div className={`${styles.toolbar} ${isVertical ? styles.toolbarVertical : ''}`} style={style as CSSProperties}>
      <div className={styles.toolbarRow}>
        <div className={styles.settingsWrap}>
          <Tooltip title={texts.toolbar.settings}>
            <button
              type='button'
              className={`${styles.btn} ${settingsActive ? styles.active : ''}`}
              onClick={onToggleSettings}
            >
              <IconAdjustmentsHorizontal size={18} />
            </button>
          </Tooltip>
          {filtersChanged && <span className={styles.filterDot} />}
        </div>

        <span className={styles.sep} />

        <div className={styles.group}>
          <Tooltip title={texts.toolbar.zoomIn}>
            <button type='button' className={styles.btn} onClick={handleZoomIn}>
              <IconZoomIn size={18} />
            </button>
          </Tooltip>
          <Tooltip title={texts.toolbar.zoomOut}>
            <button type='button' className={styles.btn} onClick={handleZoomOut}>
              <IconZoomOut size={18} />
            </button>
          </Tooltip>
          <Tooltip title={texts.toolbar.fitView}>
            <button type='button' className={styles.btn} onClick={handleFitView}>
              <IconCurrentLocation size={18} />
            </button>
          </Tooltip>
        </div>

        <span className={styles.sep} />

        <div className={styles.group}>
          <Tooltip title={texts.toolbar.handMode}>
            <button
              type='button'
              className={[
                styles.btn,
                effectiveMode === 'hand' ? styles.active : '',
                effectiveMode !== interactionMode && effectiveMode === 'hand' ? styles.activeCtrl : '',
              ].join(' ')}
              onClick={handleSetHand}
            >
              <IconHandStop size={18} />
            </button>
          </Tooltip>
          <Tooltip title={texts.toolbar.selectMode}>
            <button
              type='button'
              className={[
                styles.btn,
                effectiveMode === 'cursor' ? styles.active : '',
                effectiveMode !== interactionMode && effectiveMode === 'cursor' ? styles.activeCtrl : '',
              ].join(' ')}
              onClick={handleSetCursor}
            >
              <IconPointer size={18} />
            </button>
          </Tooltip>
          <Tooltip title={editMode ? texts.toolbar.editOn : texts.toolbar.editOff}>
            <button type='button' className={`${styles.btn} ${editMode ? styles.active : ''}`} onClick={onToggleEdit}>
              {editMode ? <IconLockOpen size={18} /> : <IconLock size={18} />}
            </button>
          </Tooltip>
        </div>

        <span className={styles.sep} />

        <div className={styles.dropWrap} ref={dropWrapRef}>
          <Tooltip title={texts.toolbar.resetPositions}>
            <button
              type='button'
              className={`${styles.btn} ${styles.btnSplit}`}
              onClick={onResetPositions}
              disabled={!hasSavedPositions}
            >
              <IconRestore size={17} />
            </button>
          </Tooltip>
          <Tooltip title={texts.toolbar.positionsMenu}>
            <button
              type='button'
              className={`${styles.btn} ${styles.btnCaret} ${dropOpen ? styles.active : ''}`}
              onClick={handleDropToggle}
            >
              <span className={styles.caret} />
            </button>
          </Tooltip>
          {dropOpen && (
            <div className={styles.dropdown}>
              <button type='button' className={styles.dropItem} onClick={exportPositions}>
                <IconDownload size={15} /> {texts.toolbar.exportPositions}
              </button>
              <button type='button' className={styles.dropItem} onClick={() => importRef.current?.click()}>
                <IconUpload size={15} /> {texts.toolbar.importPositions}
              </button>
            </div>
          )}
          <input ref={importRef} type='file' accept='.json' style={{ display: 'none' }} onChange={handleImport} />
        </div>

        <span className={styles.sep} />

        <Tooltip title={texts.toolbar.elkPrepare}>
          <button
            type='button'
            className={`${styles.btn} ${elkBusy ? styles.busy : ''}`}
            onClick={() => graphDataImportRef.current?.click()}
            disabled={elkBusy}
          >
            {elkBusy ? <IconLoader2 size={18} className={styles.spin} /> : <IconPackage size={18} />}
          </button>
        </Tooltip>
        <input
          ref={graphDataImportRef}
          type='file'
          accept='.json,application/json'
          style={{ display: 'none' }}
          onChange={handleGraphDataImport}
        />

        <span className={styles.sep} />

        <Tooltip title={isFullscreen ? texts.toolbar.exitFullscreen : texts.toolbar.fullscreen}>
          <button type='button' className={`${styles.btn} ${isFullscreen ? styles.active : ''}`} onClick={onFullscreen}>
            {isFullscreen ? <IconArrowsMinimize size={18} /> : <IconArrowsMaximize size={18} />}
          </button>
        </Tooltip>
      </div>

      {showFilterStats && (
        <div className={styles.statsBar}>
          <span>
            {texts.toolbar.statsNodes}: {filterStats.nodes[0]}/{filterStats.nodes[1]}
          </span>
          {!isVertical && <span className={styles.statsSep}>·</span>}
          <span>
            {texts.toolbar.statsEdges}: {filterStats.edges[0]}/{filterStats.edges[1]}
          </span>
          {!isVertical && <span className={styles.statsSep}>·</span>}
          <span>
            {texts.toolbar.statsIslands}: {filterStats.islands[0]}/{filterStats.islands[1]}
          </span>
        </div>
      )}
    </div>
  )
})
