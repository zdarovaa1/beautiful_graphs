import { useEffect, useState } from 'react';
import { IconChevronDown, IconChevronRight, IconDownload, IconHelpCircle, IconGripVertical } from '@tabler/icons-react';
import type { SelectedEntity } from '../types';
import { FALLBACK_BADGE, islandTypeColors, objectTypeColors } from '../theme';
import { FloatingPanel } from './FloatingPanel';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  selected: SelectedEntity | null;
  onClose: () => void;
}

function accentFor(selected: SelectedEntity): string {
  const p = selected.data.additionalParams;
  if (p.badgeColor) return p.badgeColor;
  if (selected.kind === 'island') return islandTypeColors[selected.data.type] ?? FALLBACK_BADGE;
  if (selected.kind === 'node') return objectTypeColors[selected.data.type] ?? FALLBACK_BADGE;
  return p.color ?? FALLBACK_BADGE;
}

export function DetailPanel({ selected, onClose }: DetailPanelProps) {
  const [linksOpen, setLinksOpen] = useState(false);

  // сбрасываем раскрытие ссылок при смене объекта
  useEffect(() => setLinksOpen(false), [selected?.data.id]);

  if (!selected) return null;
  const d = selected.data;
  const accent = accentFor(selected);
  const links = d.additionalParams.links ?? [];

  return (
    <FloatingPanel
      storageKey="graph-detail-panel"
      defaultX={Math.max(20, window.innerWidth - 360)}
      defaultY={90}
      defaultWidth={320}
      defaultHeight={Math.min(520, window.innerHeight - 140)}
      zIndex={7}
    >
      <aside className={styles.detail}>
        <header className={styles.header} data-fp-handle>
          <IconGripVertical size={15} className={styles.grip} />
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{d.title}</h2>
            <span className={styles.badge} style={{ color: accent, background: `${accent}1f` }}>
              {d.type}
            </span>
          </div>
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
            <button type="button" className={styles.linksHead} onClick={() => setLinksOpen((o) => !o)}>
              {linksOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              <span>Полезные ссылки {links.length}</span>
              <IconHelpCircle size={15} className={styles.help} />
            </button>
            {linksOpen && (
              <ul className={styles.linkList}>
                {links.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <footer className={styles.footer}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
            <IconDownload size={16} /> Атрибуты
          </button>
          <button type="button" className={styles.btn} onClick={onClose}>
            Закрыть
          </button>
        </footer>
      </aside>
    </FloatingPanel>
  );
}
