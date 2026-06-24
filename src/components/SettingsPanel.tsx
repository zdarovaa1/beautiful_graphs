import { memo, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { IconChevronDown, IconChevronRight, IconGripVertical, IconUpload, IconDownload, IconX } from '@tabler/icons-react';
import type { DisplaySettings } from '../types';
import { CheckTree, type CheckItem } from './CheckTree';
import { FloatingPanel, FloatingPanelActionsContext, type SnapEdge, type PanelSize } from './FloatingPanel';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  settings: DisplaySettings;
  /** Принимает dispatch-форму (React.Dispatch), чтобы patch мог использовать функциональное обновление. */
  onChange: React.Dispatch<React.SetStateAction<DisplaySettings>>;
  onClose: () => void;
  onReset: () => void;
  onLayout?: (snap: SnapEdge, size: PanelSize | null, key: string) => void;
  objectTypeItems: CheckItem[];
  edgeTypeItems: CheckItem[];
  islandTypeItems: CheckItem[];
  nodeNameItems: CheckItem[];
  islandNameItems: CheckItem[];
}

const Toggle = memo(function Toggle({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <div className={styles.toggle} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className={`${styles.switch} ${checked ? styles.switchOn : ''}`}>
        <span className={styles.knob} />
      </span>
      <span>{children}</span>
    </div>
  );
});

const Section = memo(function Section({
  title, children, defaultOpen = false,
}: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHead} onClick={toggle}>
        {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        <span>{title}</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
});

function setAll<K extends string>(items: CheckItem[], value: boolean): Record<K, boolean> {
  return Object.fromEntries(items.map((i) => [i.key, value])) as Record<K, boolean>;
}

function exportSettings(settings: DisplaySettings) {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'graph-filters.json'; a.click();
  URL.revokeObjectURL(url);
}

const DEFAULT_X = () => Math.max(20, window.innerWidth - 360);
const DEFAULT_Y = 90;
const DEFAULT_W = 320;
const DEFAULT_H = () => Math.min(620, window.innerHeight - 140);

/**
 * Внутренний компонент — рендерится как child FloatingPanel,
 * поэтому имеет доступ к FloatingPanelActionsContext.
 */
const SettingsPanelBody = memo(function SettingsPanelBody(props: SettingsPanelProps) {
  const { settings, onChange, objectTypeItems, edgeTypeItems, islandTypeItems, nodeNameItems, islandNameItems } = props;
  // Контекст доступен, так как мы рендеримся внутри FloatingPanel
  const panelActions = useContext(FloatingPanelActionsContext);
  const importRef = useRef<HTMLInputElement>(null);

  const patch = useCallback(
    (p: Partial<DisplaySettings>) => onChange((prev) => ({ ...prev, ...p })),
    [onChange],
  );

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Partial<DisplaySettings>;
        onChange((prev) => ({ ...prev, ...parsed }));
      } catch { /* игнорируем сломанный файл */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onChange]);

  const handleExport = useCallback(() => exportSettings(settings), [settings]);
  const handleImportClick = useCallback(() => importRef.current?.click(), []);

  const onChangeObjectType = useCallback((k: string, v: boolean) =>
    onChange((s) => ({ ...s, objectTypes: { ...s.objectTypes, [k]: v } })), [onChange]);
  const onToggleAllObjectTypes = useCallback((v: boolean) =>
    onChange((s) => ({ ...s, objectTypes: setAll(objectTypeItems, v) })), [onChange, objectTypeItems]);

  const onChangeNodeName = useCallback((k: string, v: boolean) =>
    onChange((s) => ({ ...s, nodeNames: { ...s.nodeNames, [k]: v } })), [onChange]);
  const onToggleAllNodeNames = useCallback((v: boolean) =>
    onChange((s) => ({ ...s, nodeNames: setAll(nodeNameItems, v) })), [onChange, nodeNameItems]);

  const onChangeEdgeType = useCallback((k: string, v: boolean) =>
    onChange((s) => ({ ...s, edgeTypes: { ...s.edgeTypes, [k]: v } })), [onChange]);
  const onToggleAllEdgeTypes = useCallback((v: boolean) =>
    onChange((s) => ({ ...s, edgeTypes: setAll(edgeTypeItems, v) })), [onChange, edgeTypeItems]);

  const onChangeIslandType = useCallback((k: string, v: boolean) =>
    onChange((s) => ({ ...s, islandTypes: { ...s.islandTypes, [k]: v } })), [onChange]);
  const onToggleAllIslandTypes = useCallback((v: boolean) =>
    onChange((s) => ({ ...s, islandTypes: setAll(islandTypeItems, v) })), [onChange, islandTypeItems]);

  const onChangeIslandName = useCallback((k: string, v: boolean) =>
    onChange((s) => ({ ...s, islandNames: { ...s.islandNames, [k]: v } })), [onChange]);
  const onToggleAllIslandNames = useCallback((v: boolean) =>
    onChange((s) => ({ ...s, islandNames: setAll(islandNameItems, v) })), [onChange, islandNameItems]);

  const onToggleOnlySelected = useCallback((v: boolean) => patch({ onlySelectedAndNeighbors: v }), [patch]);
  const onToggleHideIslands = useCallback((v: boolean) => patch({ hideAllIslands: v }), [patch]);
  const onToggleEdgeLabels = useCallback((v: boolean) => patch({ showEdgeLabels: v }), [patch]);

  return (
    <div className={styles.settings}>
      <div className={styles.title} data-fp-handle>
        <IconGripVertical size={15} className={styles.grip} />
        <span style={{ flex: 1 }}>Настройки отображения</span>
        {panelActions?.controls}
        <button type="button" className={styles.closeBtn} onClick={props.onClose} title="Закрыть" data-no-drag>
          <IconX size={14} />
        </button>
      </div>

      <div className={styles.toggles}>
        <Toggle checked={settings.onlySelectedAndNeighbors} onChange={onToggleOnlySelected}>
          Только выбранный объект и ближайшие соседи
        </Toggle>
        <Toggle checked={settings.hideAllIslands} onChange={onToggleHideIslands}>
          Скрыть все острова
        </Toggle>
        <Toggle checked={settings.showEdgeLabels} onChange={onToggleEdgeLabels}>
          Показывать подписи связей
        </Toggle>
      </div>

      <div className={styles.sectionsScroll}>
      <Section title="Тип объекта" defaultOpen>
        <CheckTree
          items={objectTypeItems}
          state={settings.objectTypes}
          onChange={onChangeObjectType}
          onToggleAll={onToggleAllObjectTypes}
        />
      </Section>

      <Section title="Имя объекта">
        <CheckTree
          items={nodeNameItems}
          state={settings.nodeNames}
          onChange={onChangeNodeName}
          onToggleAll={onToggleAllNodeNames}
        />
      </Section>

      <Section title="Тип связи">
        <CheckTree
          items={edgeTypeItems}
          state={settings.edgeTypes}
          onChange={onChangeEdgeType}
          onToggleAll={onToggleAllEdgeTypes}
        />
      </Section>

      <Section title="Тип острова">
        <CheckTree
          items={islandTypeItems}
          state={settings.islandTypes}
          onChange={onChangeIslandType}
          onToggleAll={onToggleAllIslandTypes}
        />
      </Section>

      <Section title="Имя острова">
        <CheckTree
          items={islandNameItems}
          state={settings.islandNames}
          onChange={onChangeIslandName}
          onToggleAll={onToggleAllIslandNames}
        />
      </Section>
      </div>

      <div className={styles.footer}>
        <button type="button" className={`${styles.btn} ${styles.btnReset}`} onClick={props.onReset} title="Сбросить все фильтры">
          Сбросить
        </button>
        <button type="button" className={styles.btn} onClick={handleExport} title="Экспорт фильтров">
          <IconDownload size={15} /> Экспорт
        </button>
        <button type="button" className={styles.btn} onClick={handleImportClick} title="Импорт фильтров">
          <IconUpload size={15} /> Импорт
        </button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
    </div>
  );
});

/**
 * Внешняя оболочка: создаёт FloatingPanel и передаёт в него SettingsPanelBody.
 * Разделение нужно, чтобы SettingsPanelBody мог читать FloatingPanelActionsContext
 * (провайдер находится внутри FloatingPanel, а не снаружи).
 */
export const SettingsPanel = memo(function SettingsPanel(props: SettingsPanelProps) {
  return (
    <FloatingPanel
      storageKey="graph-settings-panel"
      title="Настройки"
      onLayout={props.onLayout}
      defaultX={DEFAULT_X()}
      defaultY={DEFAULT_Y}
      defaultWidth={DEFAULT_W}
      defaultHeight={DEFAULT_H()}
      zIndex={8}
    >
      <SettingsPanelBody {...props} />
    </FloatingPanel>
  );
});
