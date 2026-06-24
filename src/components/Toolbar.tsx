import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReactFlow } from '@xyflow/react';
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
} from '@tabler/icons-react';
import type { InteractionMode } from '../GraphView';
import type { ToolbarLayout } from '../SnapLayout';
import styles from './Toolbar.module.css';

type PosMap = Record<string, { x: number; y: number }>;

interface FilterStats {
  changed: boolean;
  nodes: [number, number];
  edges: [number, number];
  islands: [number, number];
}

interface ToolbarProps {
  style?: React.CSSProperties;
  layout?: ToolbarLayout;
  onToggleSettings: () => void;
  settingsActive: boolean;
  onFullscreen: () => void;
  isFullscreen: boolean;
  editMode: boolean;
  onToggleEdit: () => void;
  interactionMode: InteractionMode;
  effectiveMode: InteractionMode;
  onSetInteractionMode: (m: InteractionMode) => void;
  filtersChanged: boolean;
  filterStats: FilterStats;
  hasSavedPositions: boolean;
  onResetPositions: () => void;
  onImportPositions: (pos: PosMap) => void;
  getSavedPositions: () => PosMap;
}

const ZOOM_DURATION = 250;
const FIT_DURATION = 400;
const FIT_PADDING = 0.2;

export const Toolbar = memo(function Toolbar({
  style,
  layout = 'horizontal',
  onToggleSettings, settingsActive, onFullscreen, isFullscreen,
  editMode, onToggleEdit,
  interactionMode, effectiveMode, onSetInteractionMode,
  filtersChanged, filterStats,
  hasSavedPositions, onResetPositions,
  onImportPositions, getSavedPositions,
}: ToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [dropOpen, setDropOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const dropWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (dropWrapRef.current?.contains(e.target as globalThis.Node)) return;
      setDropOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [dropOpen]);

  const closeDrop = useCallback(() => setDropOpen(false), []);

  const handleZoomIn = useCallback(() => zoomIn({ duration: ZOOM_DURATION }), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut({ duration: ZOOM_DURATION }), [zoomOut]);
  const handleFitView = useCallback(() => fitView({ duration: FIT_DURATION, padding: FIT_PADDING }), [fitView]);
  const handleSetHand = useCallback(() => onSetInteractionMode('hand'), [onSetInteractionMode]);
  const handleSetCursor = useCallback(() => onSetInteractionMode('cursor'), [onSetInteractionMode]);
  const handleDropToggle = useCallback(() => setDropOpen((o) => !o), []);

  const exportPositions = useCallback(() => {
    const blob = new Blob([JSON.stringify(getSavedPositions(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'graph-positions.json'; a.click();
    URL.revokeObjectURL(url);
    setDropOpen(false);
  }, [getSavedPositions, closeDrop]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as PosMap;
        onImportPositions(parsed);
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = '';
    setDropOpen(false);
  }, [onImportPositions, closeDrop]);

  return (
    <div
      className={`${styles.toolbar} ${layout === 'vertical' ? styles.toolbarVertical : ''}`}
      style={style as CSSProperties}
    >
      <button
        type="button"
        className={`${styles.btn} ${editMode ? styles.active : ''}`}
        onClick={onToggleEdit}
        title={editMode ? 'Редактирование включено' : 'Редактирование выключено'}
      >
        {editMode ? <IconLockOpen size={18} /> : <IconLock size={18} />}
      </button>

      <button
        type="button"
        className={[
          styles.btn,
          effectiveMode === 'hand' ? styles.active : '',
          effectiveMode !== interactionMode && effectiveMode === 'hand' ? styles.activeCtrl : '',
        ].join(' ')}
        onClick={handleSetHand}
        title="Режим руки — перемещение"
      >
        <IconHandStop size={18} />
      </button>
      <button
        type="button"
        className={[
          styles.btn,
          effectiveMode === 'cursor' ? styles.active : '',
          effectiveMode !== interactionMode && effectiveMode === 'cursor' ? styles.activeCtrl : '',
        ].join(' ')}
        onClick={handleSetCursor}
        title="Режим выделения"
      >
        <IconPointer size={18} />
      </button>

      <div className={styles.dropWrap} ref={dropWrapRef}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSplit}`}
          onClick={onResetPositions}
          disabled={!hasSavedPositions}
          title="Сбросить сохранённые позиции"
        >
          <IconRestore size={17} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnCaret} ${dropOpen ? styles.active : ''}`}
          onClick={handleDropToggle}
          title="Экспорт / импорт позиций"
        >
          <span className={styles.caret} />
        </button>
        {dropOpen && (
          <div className={styles.dropdown}>
            <button type="button" className={styles.dropItem} onClick={exportPositions}>
              <IconDownload size={15} /> Экспорт позиций
            </button>
            <button type="button" className={styles.dropItem} onClick={() => importRef.current?.click()}>
              <IconUpload size={15} /> Импорт позиций
            </button>
          </div>
        )}
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      <span className={styles.sep} />

      <div className={styles.settingsWrap}>
        <button
          type="button"
          className={`${styles.btn} ${settingsActive ? styles.active : ''}`}
          onClick={onToggleSettings}
          title="Настройки отображения"
        >
          <IconAdjustmentsHorizontal size={18} />
        </button>
        {filtersChanged && !settingsActive && <span className={styles.filterDot} />}
      </div>

      <button type="button" className={styles.btn} onClick={handleZoomIn} title="Увеличить">
        <IconZoomIn size={18} />
      </button>
      <button type="button" className={styles.btn} onClick={handleZoomOut} title="Уменьшить">
        <IconZoomOut size={18} />
      </button>
      <button type="button" className={styles.btn} onClick={handleFitView} title="Центрировать">
        <IconCurrentLocation size={18} />
      </button>
      <button
        type="button"
        className={`${styles.btn} ${isFullscreen ? styles.active : ''}`}
        onClick={onFullscreen}
        title={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
      >
        {isFullscreen ? <IconArrowsMinimize size={18} /> : <IconArrowsMaximize size={18} />}
      </button>

      {filterStats.changed && (
        <div className={styles.stats}>
          <span>Вершины: {filterStats.nodes[0]} / {filterStats.nodes[1]}</span>
          <span>Связи: {filterStats.edges[0]} / {filterStats.edges[1]}</span>
          <span>Острова: {filterStats.islands[0]} / {filterStats.islands[1]}</span>
        </div>
      )}
    </div>
  );
});
