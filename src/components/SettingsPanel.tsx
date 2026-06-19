import { useState, type ReactNode } from 'react';
import { IconChevronDown, IconChevronRight, IconGripVertical } from '@tabler/icons-react';
import type { DisplaySettings } from '../types';
import { CheckTree, type CheckItem } from './CheckTree';
import { FloatingPanel } from './FloatingPanel';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  settings: DisplaySettings;
  onChange: (next: DisplaySettings) => void;
  onClose: () => void;
  onRemember: () => void;
  objectTypeItems: CheckItem[];
  edgeTypeItems: CheckItem[];
  islandTypeItems: CheckItem[];
  nodeNameItems: CheckItem[];
  islandNameItems: CheckItem[];
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.toggle} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className={`${styles.switch} ${checked ? styles.switchOn : ''}`}>
        <span className={styles.knob} />
      </span>
      <span>{children}</span>
    </div>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHead} onClick={() => setOpen((o) => !o)}>
        {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        <span>{title}</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

function setAll<K extends string>(items: CheckItem[], value: boolean): Record<K, boolean> {
  return Object.fromEntries(items.map((i) => [i.key, value])) as Record<K, boolean>;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const { settings, onChange } = props;
  const patch = (p: Partial<DisplaySettings>) => onChange({ ...settings, ...p });

  return (
    <FloatingPanel
      storageKey="graph-settings-panel"
      defaultX={Math.max(20, window.innerWidth - 360)}
      defaultY={90}
      defaultWidth={320}
      defaultHeight={Math.min(620, window.innerHeight - 140)}
      zIndex={8}
    >
      <div className={styles.settings}>
        <div className={styles.title} data-fp-handle>
          <IconGripVertical size={15} className={styles.grip} />
          Настройки отображения
        </div>

      <div className={styles.toggles}>
        <Toggle checked={settings.onlySelectedAndNeighbors} onChange={(v) => patch({ onlySelectedAndNeighbors: v })}>
          Только выбранный объект и ближайшие соседи
        </Toggle>
        <Toggle checked={settings.onlyFirst10PerIsland} onChange={(v) => patch({ onlyFirst10PerIsland: v })}>
          Только первые 10 объектов в острове
        </Toggle>
        <Toggle checked={settings.hideAllIslands} onChange={(v) => patch({ hideAllIslands: v })}>
          Скрыть все острова
        </Toggle>
      </div>

      <Section title="Тип объекта" defaultOpen>
        <CheckTree
          items={props.objectTypeItems}
          state={settings.objectTypes}
          onChange={(k, v) => patch({ objectTypes: { ...settings.objectTypes, [k]: v } })}
          onToggleAll={(v) => patch({ objectTypes: setAll(props.objectTypeItems, v) })}
        />
      </Section>

      <Section title="Имя объекта">
        <CheckTree
          items={props.nodeNameItems}
          state={settings.nodeNames}
          onChange={(k, v) => patch({ nodeNames: { ...settings.nodeNames, [k]: v } })}
          onToggleAll={(v) => patch({ nodeNames: setAll(props.nodeNameItems, v) })}
        />
      </Section>

      <Section title="Тип связи">
        <CheckTree
          items={props.edgeTypeItems}
          state={settings.edgeTypes}
          onChange={(k, v) => patch({ edgeTypes: { ...settings.edgeTypes, [k]: v } })}
          onToggleAll={(v) => patch({ edgeTypes: setAll(props.edgeTypeItems, v) })}
        />
      </Section>

      <Section title="Тип острова">
        <CheckTree
          items={props.islandTypeItems}
          state={settings.islandTypes}
          onChange={(k, v) => patch({ islandTypes: { ...settings.islandTypes, [k]: v } })}
          onToggleAll={(v) => patch({ islandTypes: setAll(props.islandTypeItems, v) })}
        />
      </Section>

      <Section title="Имя острова">
        <CheckTree
          items={props.islandNameItems}
          state={settings.islandNames}
          onChange={(k, v) => patch({ islandNames: { ...settings.islandNames, [k]: v } })}
          onToggleAll={(v) => patch({ islandNames: setAll(props.islandNameItems, v) })}
        />
      </Section>

      <div className={styles.footer}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={props.onRemember}>
          Запомнить выбор
        </button>
        <button type="button" className={styles.btn} onClick={props.onClose}>
          Закрыть
        </button>
      </div>
      </div>
    </FloatingPanel>
  );
}
