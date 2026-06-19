import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './FloatingPanel.module.css';

interface FloatingPanelProps {
  defaultX: number;
  defaultY: number;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
  /** Если задан — позиция и размер запоминаются в localStorage по этому ключу. */
  storageKey?: string;
  children: ReactNode;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Mode = 'drag' | 'resize' | null;

function loadRect(storageKey: string | undefined): Rect | null {
  if (!storageKey) return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      // не даём панели оказаться за пределами окна
      return {
        x: Math.min(parsed.x, window.innerWidth - 80),
        y: Math.min(parsed.y, window.innerHeight - 60),
        w: parsed.w,
        h: parsed.h,
      } as Rect;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function FloatingPanel({
  defaultX,
  defaultY,
  defaultWidth,
  defaultHeight,
  minWidth = 260,
  minHeight = 220,
  zIndex = 7,
  storageKey,
  children,
}: FloatingPanelProps) {
  const [rect, setRect] = useState<Rect>(
    () => loadRect(storageKey) ?? { x: defaultX, y: defaultY, w: defaultWidth, h: defaultHeight },
  );
  const mode = useRef<Mode>(null);
  const start = useRef<{ px: number; py: number; rect: Rect }>({ px: 0, py: 0, rect });

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(rect));
  }, [rect, storageKey]);

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (!mode.current) return;
      const dx = e.clientX - start.current.px;
      const dy = e.clientY - start.current.py;
      const s = start.current.rect;
      if (mode.current === 'drag') {
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 60;
        setRect((r) => ({
          ...r,
          x: Math.min(maxX, Math.max(0, s.x + dx)),
          y: Math.min(maxY, Math.max(0, s.y + dy)),
        }));
      } else {
        setRect((r) => ({ ...r, w: Math.max(minWidth, s.w + dx), h: Math.max(minHeight, s.h + dy) }));
      }
    },
    [minWidth, minHeight],
  );

  const stop = useCallback(() => {
    mode.current = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', stop);
    document.body.style.userSelect = '';
  }, [onMove]);

  const begin = useCallback(
    (e: React.PointerEvent, m: Exclude<Mode, null>) => {
      mode.current = m;
      start.current = { px: e.clientX, py: e.clientY, rect };
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', stop);
    },
    [rect, onMove, stop],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (!t.closest('[data-fp-handle]')) return;
    if (t.closest('button, a, input, [data-no-drag]')) return;
    begin(e, 'drag');
  };

  return (
    <div
      className={styles.panel}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex }}
      onPointerDown={onPointerDown}
    >
      {children}
      <div className={styles.resize} onPointerDown={(e) => begin(e, 'resize')} title="Изменить размер" />
    </div>
  );
}
