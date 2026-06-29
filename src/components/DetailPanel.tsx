import { memo, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  IconChevronDown, IconChevronRight, IconDownload,
  IconHelpCircle, IconGripVertical, IconX,
} from '@tabler/icons-react';
import type { ObjectType, EdgeType, IslandType, SelectedEntity, DisplaySettings } from '../types';
import { FALLBACK_BADGE, islandTypeColors, objectTypeColors } from '../theme';
import { getGraphEdges, getGraphIslands, getGraphNodes } from '../utils/graphRegistry';
import { FloatingPanel, FloatingPanelActionsContext, type SnapEdge, type PanelSize } from './FloatingPanel';
import { getInnerHeight, getInnerWidth } from '../utils/getRootSizes';
import { Tooltip } from './Tooltip';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  selected: SelectedEntity | null;
  settings: DisplaySettings;
  graphEpoch: number;
  onChange: React.Dispatch<React.SetStateAction<DisplaySettings>>;
  onClose: () => void;
  onSelectEntity: (entity: SelectedEntity) => void;
  onLayout?: (snap: SnapEdge, size: PanelSize | null, key: string, pinned?: boolean) => void;
}

const Toggle = memo(function Toggle({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <div className={styles.toggle} onClick={() => onChange(!checked)}>
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

/** Отступ панели от правого края root-контейнера */
const PANEL_RIGHT_OFFSET = 360;
/** Начальная позиция Y панели деталей */
const PANEL_DEFAULT_Y = 90;
/** Ширина панели деталей по умолчанию */
const PANEL_DEFAULT_WIDTH = 320;
/** Отступ панели от нижнего края root-контейнера */
const PANEL_BOTTOM_OFFSET = 140;
/** Макс. высота панели деталей */
const PANEL_MAX_HEIGHT = 520;
/** Мин. отступ панели от левого края при расчёте X */
const PANEL_MIN_LEFT = 20;

const DEFAULT_X = () => Math.max(PANEL_MIN_LEFT, getInnerWidth() - PANEL_RIGHT_OFFSET);
const DEFAULT_Y = PANEL_DEFAULT_Y;
const DEFAULT_W = PANEL_DEFAULT_WIDTH;
const DEFAULT_H = () => Math.min(PANEL_MAX_HEIGHT, getInnerHeight() - PANEL_BOTTOM_OFFSET);

const ContextCard = memo(function ContextCard({
  title, meta, text, onClick,
}: {
  title: string;
  meta?: string;
  text?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.contextCard} onClick={onClick} data-no-drag>
      <div className={styles.contextName}>{title}</div>
      {meta && <div className={styles.contextMeta}>{meta}</div>}
      {text && <div className={styles.contextText}>{text}</div>}
    </button>
  );
});

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function entityMarkdown(selected: SelectedEntity): string {
  const nodes = getGraphNodes();
  const edges = getGraphEdges();
  const islands = getGraphIslands();
  const d = selected.data;
  const lines = [
    `# ${d.title}`,
    '',
    `Тип сущности: ${selected.kind}`,
    `Тип: ${d.type}`,
    '',
    d.shortDescription ? `Кратко: ${d.shortDescription}` : '',
    d.description ? `Описание: ${d.description}` : '',
    '',
    '## Атрибуты',
    ...(d.attributes.length ? d.attributes.map((a) => `- ${a.name}: ${a.value}`) : ['- Нет атрибутов']),
  ].filter(Boolean);

  if (selected.kind === 'node') {
    const nodeIslands = selected.data.islandIds
      .map((id) => islands.find((is) => is.id === id))
      .filter(Boolean);
    const nodeEdges = edges.filter((e) => e.source === d.id || e.target === d.id);
    lines.push('', '## Острова', ...(nodeIslands.length
      ? nodeIslands.map((is) => `- ${is?.title} (${is?.type})`)
      : ['- Нет островов']));
    lines.push('', '## Ближайшие связи', ...(nodeEdges.length
      ? nodeEdges.map((e) => {
        const otherId = e.source === d.id ? e.target : e.source;
        const other = nodes.find((n) => n.id === otherId);
        return `- ${other?.title ?? otherId}: ${e.type} — ${e.title}`;
      })
      : ['- Нет связей']));
  }

  if (selected.kind === 'island') {
    const members = nodes.filter((n) => n.islandIds.includes(d.id));
    lines.push('', '## Вершины в острове', ...(members.length
      ? members.map((n) => `- ${n.title} (${n.type})`)
      : ['- Нет вершин']));
  }

  if (selected.kind === 'edge') {
    const edge = selected.data;
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    lines.push('', '## Концы связи');
    lines.push(`- Источник: ${source?.title ?? edge.source} (${source?.type ?? '—'})`);
    lines.push(`- Цель: ${target?.title ?? edge.target} (${target?.type ?? '—'})`);
  }

  return `${lines.join('\n')}\n`;
}

const DetailPanelBody = memo(function DetailPanelBody({
  selected, settings, graphEpoch, onChange, onClose, onSelectEntity,
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
    const islands = getGraphIslands();
    return selected.data.islandIds
      .map((iid) => islands.find((is) => is.id === iid))
      .filter(Boolean);
  }, [selected, graphEpoch]);

  const nodeNeighbors = useMemo(() => {
    if (selected?.kind !== 'node') return [];
    const edges = getGraphEdges();
    const nodes = getGraphNodes();
    return edges
      .filter((e) => e.source === selected.data.id || e.target === selected.data.id)
      .map((e) => {
        const otherId = e.source === selected.data.id ? e.target : e.source;
        const other = nodes.find((n) => n.id === otherId);
        return { edge: e, other };
      });
  }, [selected, graphEpoch]);

  const islandMembers = useMemo(() => {
    if (selected?.kind !== 'island') return [];
    return getGraphNodes().filter((n) => n.islandIds.includes(selected.data.id));
  }, [selected, graphEpoch]);

  const edgeEndpoints = useMemo(() => {
    if (selected?.kind !== 'edge') return null;
    const nodes = getGraphNodes();
    const { source, target } = selected.data;
    return {
      source: nodes.find((n) => n.id === source),
      target: nodes.find((n) => n.id === target),
    };
  }, [selected, graphEpoch]);

  const selectNode = useCallback((id: string) => {
    const def = getGraphNodes().find((n) => n.id === id);
    if (def) onSelectEntity({ kind: 'node', data: def });
  }, [onSelectEntity]);

  const selectIsland = useCallback((id: string) => {
    const def = getGraphIslands().find((is) => is.id === id);
    if (def) onSelectEntity({ kind: 'island', data: def });
  }, [onSelectEntity]);

  const setVisible = useCallback((patch: Partial<DisplaySettings>) => {
    onChange((s) => ({ ...s, ...patch }));
  }, [onChange]);

  const handleLinksToggle = useCallback(() => setLinksOpen((o) => !o), []);
  const handleDownload = useCallback(() => {
    if (!selected) return;
    downloadText(`${selected.data.id}-details.md`, entityMarkdown(selected));
  }, [selected]);

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
              <Tooltip title="Закрыть">
                <button type="button" className={styles.closeBtn} onClick={onClose} data-no-drag>
                  <IconX size={16} />
                </button>
              </Tooltip>
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
            <Tooltip title="Закрыть">
              <button type="button" className={styles.closeBtn} onClick={onClose} data-no-drag>
                <IconX size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
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
        {isNode && (
          <div className={styles.contextBlock}>
            <div className={styles.divider} />
            <div>
              <div className={styles.contextTitle}>Где расположен</div>
              {nodeIslands.length > 0 ? nodeIslands.map((is) => is && (
                <ContextCard
                  key={is.id}
                  title={is.title}
                  meta={is.type}
                  text={is.shortDescription}
                  onClick={() => selectIsland(is.id)}
                />
              )) : <div className={styles.empty}>Нет островов</div>}
            </div>
            <div>
              <div className={styles.contextTitle}>Ближайшие соседи</div>
              {nodeNeighbors.length > 0 ? nodeNeighbors.map(({ edge, other }) => (
                <ContextCard
                  key={edge.id}
                  title={other?.title ?? 'Неизвестная вершина'}
                  meta={`${edge.type} · ${edge.title}`}
                  text={edge.shortDescription}
                  onClick={() => other && selectNode(other.id)}
                />
              )) : <div className={styles.empty}>Нет связей</div>}
            </div>
          </div>
        )}
        {isIsland && (
          <div className={styles.contextBlock}>
            <div className={styles.divider} />
            <div>
              <div className={styles.contextTitle}>Вершины в острове</div>
              {islandMembers.length > 0 ? islandMembers.map((n) => (
                <ContextCard
                  key={n.id}
                  title={n.title}
                  meta={n.type}
                  text={n.shortDescription}
                  onClick={() => selectNode(n.id)}
                />
              )) : <div className={styles.empty}>Нет вершин</div>}
            </div>
          </div>
        )}
        {isEdge && edgeEndpoints && (
          <div className={styles.contextBlock}>
            <div className={styles.divider} />
            <div>
              <div className={styles.contextTitle}>Концы связи</div>
              {edgeEndpoints.source && (
                <ContextCard
                  title={edgeEndpoints.source.title}
                  meta={`Источник · ${edgeEndpoints.source.type}`}
                  text={edgeEndpoints.source.shortDescription}
                  onClick={() => selectNode(edgeEndpoints.source!.id)}
                />
              )}
              {edgeEndpoints.target && (
                <ContextCard
                  title={edgeEndpoints.target.title}
                  meta={`Цель · ${edgeEndpoints.target.type}`}
                  text={edgeEndpoints.target.shortDescription}
                  onClick={() => selectNode(edgeEndpoints.target!.id)}
                />
              )}
              {!edgeEndpoints.source && !edgeEndpoints.target && (
                <div className={styles.empty}>Вершины не найдены</div>
              )}
            </div>
          </div>
        )}
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
            <Toggle
              checked={settings.islandNameCascade[d.id] !== false}
              onChange={(v) => setVisible({ islandNameCascade: { ...settings.islandNameCascade, [d.id]: v } })}
            >
              Скрыть вместе с вершинами
            </Toggle>
          </>
        )}
      </div>

      <footer className={styles.footer}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleDownload}>
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
