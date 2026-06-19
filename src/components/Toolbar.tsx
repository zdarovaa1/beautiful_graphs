import { useReactFlow } from '@xyflow/react';
import {
  IconAdjustmentsHorizontal,
  IconZoomIn,
  IconZoomOut,
  IconCurrentLocation,
  IconArrowsMaximize,
  IconLock,
  IconLockOpen,
  IconRestore,
} from '@tabler/icons-react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onToggleSettings: () => void;
  settingsActive: boolean;
  onFullscreen: () => void;
  editMode: boolean;
  onToggleEdit: () => void;
  hasSavedPositions: boolean;
  onResetPositions: () => void;
}

export function Toolbar({
  onToggleSettings,
  settingsActive,
  onFullscreen,
  editMode,
  onToggleEdit,
  hasSavedPositions,
  onResetPositions,
}: ToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className={styles.toolbar}>
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
        className={styles.btn}
        onClick={onResetPositions}
        disabled={!hasSavedPositions}
        title="Сбросить сохранённые позиции"
      >
        <IconRestore size={18} />
      </button>
      <span className={styles.sep} />
      <button
        type="button"
        className={`${styles.btn} ${settingsActive ? styles.active : ''}`}
        onClick={onToggleSettings}
        title="Настройки отображения"
      >
        <IconAdjustmentsHorizontal size={18} />
      </button>
      <button type="button" className={styles.btn} onClick={() => zoomIn({ duration: 250 })} title="Увеличить">
        <IconZoomIn size={18} />
      </button>
      <button type="button" className={styles.btn} onClick={() => zoomOut({ duration: 250 })} title="Уменьшить">
        <IconZoomOut size={18} />
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={() => fitView({ duration: 400, padding: 0.2 })}
        title="Центрировать"
      >
        <IconCurrentLocation size={18} />
      </button>
      <button type="button" className={styles.btn} onClick={onFullscreen} title="На весь экран">
        <IconArrowsMaximize size={18} />
      </button>
    </div>
  );
}
