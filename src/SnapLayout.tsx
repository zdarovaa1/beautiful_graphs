/**
 * SnapLayout: позиции snap-панелей (соседние слоты) + toolbar + z-index стек.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import type { SnapEdge, PanelSize } from './components/FloatingPanel';
import { getInnerHeight, getInnerWidth } from './utils/getRootSizes';
export type SideSlot = {
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  width?: number | string;
  height?: number | string;
};
export type ToolbarLayout = 'horizontal' | 'vertical';
export interface ToolbarPosition {
  left: number;
  top: number;
  layout: ToolbarLayout;
}

/** Флаги chrome toolbar (stats под кнопками) — размеры считаются аналитически */
export interface ToolbarChrome {
  showFilterStats: boolean;
}

export type PanelInfo = {
  snap: SnapEdge;
  w: number;
  h: number;
  left: number;
  top: number;
  pinned: boolean;
};
const LEFT_SNAPS = new Set<NonNullable<SnapEdge>>(['left', 'top-left', 'bottom-left']);
const RIGHT_SNAPS = new Set<NonNullable<SnapEdge>>(['right', 'top-right', 'bottom-right']);
const SNAP_MARGIN = 8;
const SNAP_GAP = 8;
const TOOLBAR_MARGIN = 16;
const TOOLBAR_GAP = 8;
const TOOLBAR_BTN = 34;
const TOOLBAR_H_ROW_W = 487;
const TOOLBAR_V_W = 52;
const TOOLBAR_V_H = TOOLBAR_BTN * 11 + TOOLBAR_GAP * 10;
const TOOLBAR_STATS_GAP = 6;
const TOOLBAR_STATS_H = 18;
const TOOLBAR_STATS_V_H = 54;

const DEFAULT_TOOLBAR_CHROME: ToolbarChrome = { showFilterStats: false };

function computeToolbarMetrics(layout: ToolbarLayout, showFilterStats: boolean) {
  if (layout === 'horizontal') {
    return {
      width: TOOLBAR_H_ROW_W,
      height: TOOLBAR_BTN + (showFilterStats ? TOOLBAR_STATS_GAP + TOOLBAR_STATS_H : 0),
    };
  }
  return {
    width: TOOLBAR_V_W,
    height: TOOLBAR_V_H + (showFilterStats ? TOOLBAR_STATS_GAP + TOOLBAR_STATS_V_H : 0),
  };
}

const PANEL_Z_BASE = 10;
function isLeftSnap(s: SnapEdge): s is NonNullable<SnapEdge> {
  return s !== null && LEFT_SNAPS.has(s);
}
function isRightSnap(s: SnapEdge): s is NonNullable<SnapEdge> {
  return s !== null && RIGHT_SNAPS.has(s);
}
function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
function panelRect(p: PanelInfo) {
  return { left: p.left, top: p.top, right: p.left + p.w, bottom: p.top + p.h };
}

function toolbarBounds(
  left: number,
  top: number,
  layout: ToolbarLayout,
  showFilterStats: boolean,
) {
  const { width, height } = computeToolbarMetrics(layout, showFilterStats);
  return { left, top, right: left + width, bottom: top + height };
}
function fitsInViewport(tb: ReturnType<typeof toolbarBounds>, margin: number): boolean {
  return (
    tb.left >= margin
    && tb.top >= margin
    && tb.right <= getInnerWidth() - margin
    && tb.bottom <= getInnerHeight() - margin
  );
}
type SnapCol = {
  full?: string;
  top?: string;
  bottom?: string;
  w: number;
};

/** Соседние колонки вдоль края: при pin — без внешних отступов к краю экрана */
function assignSideSlots(
  snaps: Map<string, PanelInfo>,
  side: 'left' | 'right',
  out: Map<string, SideSlot>,
) {
  const edge = side === 'left' ? 'left' : 'right';
  const topC = side === 'left' ? 'top-left' : 'top-right';
  const botC = side === 'left' ? 'bottom-left' : 'bottom-right';
  const isSide = side === 'left' ? isLeftSnap : isRightSnap;
  const m = SNAP_MARGIN;
  const gap = SNAP_GAP;
  const entries = [...snaps.entries()].filter(([, p]) => p.snap && isSide(p.snap));
  if (entries.length === 0) return;
  const cols: SnapCol[] = [];

  const addCol = (key: string, snap: NonNullable<SnapEdge>, w: number) => {
    const col: SnapCol = { w };
    if (snap === edge) col.full = key;
    else if (snap === topC) col.top = key;
    else col.bottom = key;
    cols.push(col);
  };
  for (const [key, p] of entries) {
    const snap = p.snap as NonNullable<SnapEdge>;
    let placed = false;
    for (const col of cols) {
      if (snap === edge) {
        if (!col.full && !col.top && !col.bottom) {
          col.full = key;
          col.w = Math.max(col.w, p.w);
          placed = true;
          break;
        }
        continue;
      }
      if (snap === topC && !col.top && !col.full) {
        col.top = key;
        col.w = Math.max(col.w, p.w);
        placed = true;
        break;
      }
      if (snap === botC && !col.bottom && !col.full) {
        col.bottom = key;
        col.w = Math.max(col.w, p.w);
        placed = true;
        break;
      }
    }
    if (!placed) addCol(key, snap, p.w);
  }

  const isPinned = (key: string) => snaps.get(key)?.pinned ?? false;
  let offset = 0;
  for (let ci = 0; ci < cols.length; ci++) {
    const col = cols[ci];
    const anchorKey = col.full ?? col.top ?? col.bottom ?? '';
    const colPinned = anchorKey ? isPinned(anchorKey) : false;
    const edgeInset = ci === 0 && colPinned ? 0 : m;
    if (ci === 0) offset = edgeInset;
    const anchor: SideSlot = side === 'left'
      ? { left: offset, width: col.w }
      : { right: offset, width: col.w };
    const cornerPinned = (key: string) => isPinned(key);
    const cornerH = (key: string) => (
      cornerPinned(key) ? '50%' : `calc(50% - ${m * 1.5}px)`
    );
    const vert = (key: string) => (isPinned(key) ? 0 : m);
    if (col.full) {
      const k = col.full;
      out.set(k, { ...anchor, top: vert(k), bottom: vert(k) });
    }
    if (col.top) {
      const k = col.top;
      out.set(k, { ...anchor, top: vert(k), height: cornerH(k) });
    }
    if (col.bottom) {
      const k = col.bottom;
      out.set(k, { ...anchor, bottom: vert(k), height: cornerH(k) });
    }
    offset += col.w + gap;
  }
}
/** Раскладка snap-панелей: при занятом слоте — колонка рядом */
export function computeSnapSlots(snaps: Map<string, PanelInfo>): Map<string, SideSlot> {
  const slots = new Map<string, SideSlot>();
  assignSideSlots(snaps, 'left', slots);
  assignSideSlots(snaps, 'right', slots);
  return slots;
}

function getPanelObstructions(
  panels: Map<string, PanelInfo>,
): { left: number; top: number; right: number; bottom: number }[] {
  return [...panels.values()].map(panelRect);
}
function overlapsAnyObstructions(
  tb: ReturnType<typeof toolbarBounds>,
  obstructions: { left: number; top: number; right: number; bottom: number }[],
): boolean {
  return obstructions.some((o) => rectsOverlap(tb, o));
}
function computeToolbarPosition(
  panels: Map<string, PanelInfo>,
  showFilterStats = false,
): ToolbarPosition {
  const obstructions = getPanelObstructions(panels);
  const baseLeft = TOOLBAR_MARGIN;
  const baseTop = TOOLBAR_MARGIN;
  const margin = TOOLBAR_MARGIN;
  const hBase = toolbarBounds(baseLeft, baseTop, 'horizontal', showFilterStats);
  if (!overlapsAnyObstructions(hBase, obstructions) && fitsInViewport(hBase, margin)) {
    return { left: baseLeft, top: baseTop, layout: 'horizontal' };
  }
  const vBase = toolbarBounds(baseLeft, baseTop, 'vertical', showFilterStats);
  if (!overlapsAnyObstructions(vBase, obstructions) && fitsInViewport(vBase, margin)) {
    return { left: baseLeft, top: baseTop, layout: 'vertical' };
  }
  let left = baseLeft;
  let top = baseTop;
  for (const o of obstructions) {
    const h = toolbarBounds(left, top, 'horizontal', showFilterStats);
    if (!rectsOverlap(h, o)) continue;
    if (o.left < h.right) left = Math.max(left, o.right + TOOLBAR_GAP);
    const h2 = toolbarBounds(left, top, 'horizontal', showFilterStats);
    if (rectsOverlap(h2, o)) top = Math.max(top, o.bottom + TOOLBAR_GAP);
  }
  const hDodged = toolbarBounds(left, top, 'horizontal', showFilterStats);
  if (!overlapsAnyObstructions(hDodged, obstructions) && fitsInViewport(hDodged, margin)) {
    return { left, top, layout: 'horizontal' };
  }
  let vTop = baseTop;
  const H = getInnerHeight();
  const vHeight = computeToolbarMetrics('vertical', showFilterStats).height;
  if (vTop + vHeight > H - margin) {
    vTop = Math.max(margin, H - margin - vHeight);
  }
  for (const o of obstructions) {
    const v = toolbarBounds(baseLeft, vTop, 'vertical', showFilterStats);
    if (rectsOverlap(v, o)) vTop = Math.max(vTop, o.bottom + TOOLBAR_GAP);
  }
  vTop = Math.min(vTop, Math.max(margin, H - margin - vHeight));
  return { left: baseLeft, top: vTop, layout: 'vertical' };
}
interface SnapLayoutCtx {
  toolbarPos: ToolbarPosition;
  panels: Map<string, PanelInfo>;
  snapSlots: Map<string, SideSlot>;
  panelStack: string[];
  bringPanelToFront: (key: string) => void;
  registerPanelStack: (key: string) => void;
  unregisterPanelStack: (key: string) => void;
  reportLayout: (snap: SnapEdge, size: PanelSize | null, key: string, pinned?: boolean) => void;
  reportToolbarChrome: (chrome: ToolbarChrome) => void;
}
const Ctx = createContext<SnapLayoutCtx>({
  toolbarPos: { left: TOOLBAR_MARGIN, top: TOOLBAR_MARGIN, layout: 'horizontal' },
  panels: new Map(),
  snapSlots: new Map(),
  panelStack: [],
  bringPanelToFront: () => {},
  registerPanelStack: () => {},
  unregisterPanelStack: () => {},
  reportLayout: () => {},
  reportToolbarChrome: () => {},
});
export function useToolbarPosition() { return useContext(Ctx).toolbarPos; }
export function useReportToolbarChrome() { return useContext(Ctx).reportToolbarChrome; }
export function useRegisteredPanels() { return useContext(Ctx).panels; }
export function useSnapSlot(key: string | undefined, snap: SnapEdge): SideSlot | null {
  const { snapSlots } = useContext(Ctx);
  return useMemo(() => {
    if (!key || !snap) return null;
    return snapSlots.get(key) ?? null;
  }, [snapSlots, key, snap]);
}
export function usePanelStack(storageKey: string | undefined) {
  const {
    panelStack, bringPanelToFront, registerPanelStack, unregisterPanelStack,
  } = useContext(Ctx);
  useEffect(() => {
    if (!storageKey) return;
    registerPanelStack(storageKey);
    return () => unregisterPanelStack(storageKey);
  }, [storageKey, registerPanelStack, unregisterPanelStack]);
  const zIndex = useMemo(() => {
    if (!storageKey) return PANEL_Z_BASE;
    const i = panelStack.indexOf(storageKey);
    return PANEL_Z_BASE + (i >= 0 ? i : 0);
  }, [panelStack, storageKey]);
  const focusPanel = useCallback(() => {
    if (storageKey) bringPanelToFront(storageKey);
  }, [storageKey, bringPanelToFront]);
  return { zIndex, focusPanel };
}
export function useReportLayout() {
  return useContext(Ctx).reportLayout;
}
export function SnapLayoutProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<Map<string, PanelInfo>>(new Map());
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition>(() =>
    computeToolbarPosition(new Map(), DEFAULT_TOOLBAR_CHROME.showFilterStats),
  );
  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const chromeRef = useRef<ToolbarChrome>(DEFAULT_TOOLBAR_CHROME);
  const [snapSlots, setSnapSlots] = useState<Map<string, SideSlot>>(new Map());
  const [panelStack, setPanelStack] = useState<string[]>([]);
  const bringPanelToFront = useCallback((key: string) => {
    setPanelStack((prev) => {
      if (prev[prev.length - 1] === key) return prev;
      return [...prev.filter((k) => k !== key), key];
    });
  }, []);
  const registerPanelStack = useCallback((key: string) => {
    setPanelStack((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);
  const unregisterPanelStack = useCallback((key: string) => {
    setPanelStack((prev) => prev.filter((k) => k !== key));
  }, []);

  const reportToolbarChrome = useCallback((chrome: ToolbarChrome) => {
    const prev = chromeRef.current;
    if (prev.showFilterStats === chrome.showFilterStats) return;
    chromeRef.current = chrome;
    setToolbarPos(computeToolbarPosition(panelsRef.current, chrome.showFilterStats));
  }, []);

  const reportLayout = useCallback((
    snap: SnapEdge,
    size: PanelSize | null,
    key: string,
    pinned = false,
  ) => {
    setPanels((prev) => {
      const next = new Map(prev);
      if (!size) {
        next.delete(key);
      } else {
        next.set(key, {
          snap,
          w: size.w,
          h: size.h,
          left: size.left,
          top: size.top,
          pinned,
        });
      }
      const slots = computeSnapSlots(next);
      setSnapSlots(slots);
      setToolbarPos(computeToolbarPosition(next, chromeRef.current.showFilterStats));
      return next;
    });
  }, []);
  const value = useMemo(
    () => ({
      toolbarPos,
      panels,
      snapSlots,
      panelStack,
      bringPanelToFront,
      registerPanelStack,
      unregisterPanelStack,
      reportLayout,
      reportToolbarChrome,
    }),
    [
      toolbarPos, panels, snapSlots, panelStack,
      bringPanelToFront, registerPanelStack, unregisterPanelStack, reportLayout,
      reportToolbarChrome,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}