import { memo, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  IconChevronDown, IconChevronRight, IconDownload,
  IconHelpCircle, IconGripVertical, IconX,
} from '@tabler/icons-react';
import type { ObjectType, EdgeType, IslandType, SelectedEntity, DisplaySettings } from '../types';
import { FALLBACK_BADGE, islandTypeColors, objectTypeColors } from '../theme';
import { islands } from '../data/graphData';
import { FloatingPanel, FloatingPanelActionsContext, type SnapEdge, type PanelSize } from './FloatingPanel';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  selected: SelectedEntity | null;
  settings: DisplaySettings;
  onChange: React.Dispatch<React.SetStateAction<DisplaySettings>>;
  onClose: () => void;
  onLayout?: (snap: SnapEdge, size: PanelSize | null, key: string, pinned?: boolean) => void;
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

function accentFor(selected: SelectedEntity): string {
  const p = selected.data.additionalParams;
  if (p.badgeColor) return p.badgeColor as string;
  if (selected.kind === 'island') return islandTypeColors[selected.data.type] ?? FALLBACK_BADGE;
  if (selected.kind === 'node') return objectTypeColors[selected.data.type] ?? FALLBACK_BADGE;
  return (p.color as string | undefined) ?? FALLBACK_BADGE;
}

const DEFAULT_X = () => Math.max(20, window.innerWidth - 360);
const DEFAULT_Y = 90;
const DEFAULT_W = 320;
const DEFAULT_H = () => Math.min(520, window.innerHeight - 140);

const DetailPanelBody = memo(function DetailPanelBody({
  selected, settings, onChange, onClose,
}: Omit<DetailPanelProps, 'onLayout'>) {
  const panelActions = useContext(FloatingPanelActionsContext);

  const [linksOpen, setLinksOpen] = useState(false);
  useEffect(() => setLinksOpen(false), [selected?.data.id]);

  const accent = useMemo(() => selected ? accentFor(selected) : '', [selected]);

  const links = useMemo(
    () => (selected?.data.additionalParams.links as { label: string; url: string }[] | undefined) ?? [],
    [selected?.data.additionalParams.links],
  );

  const nodeIslands = useMemo(() => {
    if (selected?.kind !== 'node') return [];
    return selected.data.islandIds
      .map((iid) => islands.find((is) => is.id === iid))
      .filter(Boolean);
  }, [selected]);

  const setVisible = useCallback((patch: Partial<DisplaySettings>) => {
    onChange((s) => ({ ...s, ...patch }));
  }, [onChange]);

  const handleLinksToggle = useCallback(() => setLinksOpen((o) => !o), []);

  if (!selected) {
    return (
      <aside className={styles.detail}>
        <header className={styles.header} data-fp-handle>
          <IconGripVertical size={15} className={styles.grip} />
          <div className={styles.titleRow}>
            <h2 className={`${styles.title} ${styles.placeholderTitle}`}>
              Выберите элемент для просмотра информации
            </h2>
            <div className={styles.titleActions}>
              {panelActions?.controls}
              <button type="button" className={styles.closeBtn} onClick={onClose} title="Закрыть" data-no-drag>
                <IconX size={16} />
              </button>
            </div>
          </div>
        </header>
        <div className={styles.emptyState}>
          Кликните на узел, связь или остров на графе
        </div>
      </aside>
    );
  }

  const d = selected.data;
  const isNode = selected.kind === 'node';
  const isEdge = selected.kind === 'edge';
  const isIsland = selected.kind === 'island';

  return (
    <aside className={styles.detail}>
      <header className={styles.header} data-fp-handle>
        <IconGripVertical size={15} className={styles.grip} />
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{d.title}</h2>
          <span className={styles.badge} style={{ color: accent, background: `${accent}1f` }}>
            {d.type}
          </span>
          <div className={styles.titleActions}>
            {panelActions?.controls}
            <button type="button" className={styles.closeBtn} onClick={onClose} title="Закрыть" data-no-drag>
              <IconX size={16} />
            </button>
          </div>
        </div>
        {isNode && nodeIslands.length > 0 && (
          <div className={styles.islandTags}>
            {nodeIslands.map((is) => is && (
              <span
                key={is.id}
                className={styles.islandTag}
                style={{ borderColor: (is.additionalParams.color as string | undefined) ?? '#94a3b8' }}
              >
                {is.title}
              </span>
            ))}
          </div>
        )}
        {'shortDescription' in d && d.shortDescription && (
          <p className={styles.shortDesc}>{d.shortDescription as string}</p>
        )}
        <p className={styles.desc}>{d.description}</p>
      </header>

      <div className={styles.attrs}>
        {d.attributes.map((a, i) => (
          <div key={i}>
            <div className={styles.attrName}>{a.name}</div>
            <div className={styles.attrValue}>{a.value}</div>
          </div>
        ))}
        {d.attributes.length === 0 && <div className={styles.empty}>Нет атрибутов</div>}
      </div>

      {links.length > 0 && (
        <div className={styles.links}>
          <button type="button" className={styles.linksHead} onClick={handleLinksToggle}>
            {linksOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            <span>Полезные ссылки {links.length}</span>
            <IconHelpCircle size={15} className={styles.help} />
          </button>
          {linksOpen && (
            <ul className={styles.linkList}>
              {links.map((l, i) => (
                <li key={i}><a href={l.url} target="_blank" rel="noreferrer">{l.label}</a></li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={styles.togglesSection}>
        {isNode && (
          <>
            <Toggle
              checked={settings.nodeNames[d.id] !== false}
              onChange={(v) => setVisible({ nodeNames: { ...settings.nodeNames, [d.id]: v } })}
            >
              Показывать по имени
            </Toggle>
            <Toggle
              checked={settings.objectTypes[d.type as ObjectType] !== false}
              onChange={(v) => setVisible({ objectTypes: { ...settings.objectTypes, [d.type as ObjectType]: v } })}
            >
              Показывать по типу
            </Toggle>
          </>
        )}
        {isEdge && (
          <Toggle
            checked={settings.edgeTypes[d.type as EdgeType] !== false}
            onChange={(v) => setVisible({ edgeTypes: { ...settings.edgeTypes, [d.type as EdgeType]: v } })}
          >
            Показывать по типу
          </Toggle>
        )}
        {isIsland && (
          <>
            <Toggle
              checked={settings.islandNames[d.id] !== false}
              onChange={(v) => setVisible({ islandNames: { ...settings.islandNames, [d.id]: v } })}
            >
              Показывать по имени
            </Toggle>
            <Toggle
              checked={settings.islandTypes[d.type as IslandType] !== false}
              onChange={(v) => setVisible({ islandTypes: { ...settings.islandTypes, [d.type as IslandType]: v } })}
            >
              Показывать по типу
            </Toggle>
          </>
        )}
      </div>

      <footer className={styles.footer}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
          <IconDownload size={16} /> Атрибуты
        </button>
      </footer>
    </aside>
  );
});

export const DetailPanel = memo(function DetailPanel(props: DetailPanelProps) {
  return (
    <FloatingPanel
      storageKey="graph-detail-panel"
      title="Детали"
      onLayout={props.onLayout}
      defaultX={DEFAULT_X()}
      defaultY={DEFAULT_Y}
      defaultWidth={DEFAULT_W}
      defaultHeight={DEFAULT_H()}
      zIndex={7}
    >
      <DetailPanelBody {...props} />
    </FloatingPanel>
  );
});
