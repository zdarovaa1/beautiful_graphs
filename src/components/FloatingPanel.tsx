import {
  createContext,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { IconPin, IconFolder, IconChevronUp, IconMinus } from '@tabler/icons-react'
import { useCollapsedBarLeft, COLLAPSED_BOTTOM } from '../CollapsedPanels'
import { usePanelStack, useRegisteredPanels, useSnapSlot, computeSnapSlots, type SideSlot } from '../SnapLayout'
import { getInnerHeight, getInnerWidth } from '../utils/getRootSizes'
import { getBoundingClientRect } from '../utils/getBoundingClientRect'
import { useGraphTexts } from '../texts/GraphTextsContext'
import { Tooltip } from './Tooltip'
import styles from './FloatingPanel.module.css'

export interface FloatingPanelActions {
  controls: ReactNode
  collapse: () => void
  expand: () => void
}

export const FloatingPanelActionsContext = createContext<FloatingPanelActions | null>(null)

export type SnapEdge =
  'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null
export interface PanelSize {
  w: number
  h: number
  left: number
  top: number
}

interface FloatingPanelProps {
  defaultX: number
  defaultY: number
  defaultWidth: number
  defaultHeight: number
  minWidth?: number
  minHeight?: number
  zIndex?: number
  storageKey?: string
  /** Название панели — отображается в свёрнутом состоянии */
  title?: string
  onLayout?: (snap: SnapEdge, size: PanelSize | null, key: string, pinned?: boolean) => void
  children: ReactNode
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}
type ResizeDir = 'br' | 'tr' | 'bl' | 'tl' | 't' | 'b' | 'l' | 'r'
type Mode = 'drag' | `resize-${ResizeDir}` | null

const SNAP_THRESHOLD = 48
const SNAP_MARGIN = 8

export const SNAP_WIDTH = 360
export const SNAP_HEIGHT = 420
export const SNAP_CORNER_HEIGHT = '50%'

function isCornerSnap(snap: SnapEdge): snap is 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' {
  return snap === 'top-left' || snap === 'top-right' || snap === 'bottom-left' || snap === 'bottom-right'
}

function getSnapPanelStyle(
  snap: NonNullable<SnapEdge>,
  rect: Rect,
  slot: SideSlot | null,
  pinned: boolean,
): CSSProperties {
  if (slot) {
    const style: CSSProperties = { ...slot, width: rect.w }
    if (isCornerSnap(snap) && slot.height != null) {
      style.height = rect.h
      if (snap.startsWith('top')) delete style.bottom
      if (snap.startsWith('bottom')) delete style.top
    }
    return style
  }

  const m = pinned ? 0 : SNAP_MARGIN
  const ch = pinned ? SNAP_CORNER_HEIGHT : `calc(${SNAP_CORNER_HEIGHT} - ${SNAP_MARGIN * 1.5}px)`
  switch (snap) {
    case 'left':
      return { left: m, top: m, bottom: m, width: rect.w }
    case 'right':
      return { right: m, top: m, bottom: m, width: rect.w }

    case 'top':
      return { top: m, left: m, right: m, height: rect.h }
    case 'bottom':
      return { bottom: m, left: m, right: m, height: rect.h }
    case 'top-left':
      return { top: m, left: m, width: rect.w, height: ch }
    case 'top-right':
      return { top: m, right: m, width: rect.w, height: ch }
    case 'bottom-left':
      return { bottom: m, left: m, width: rect.w, height: ch }
    case 'bottom-right':
      return { bottom: m, right: m, width: rect.w, height: ch }
  }
}

function applySnap(snap: SnapEdge, r: Rect, maxW: number, _margin = SNAP_MARGIN): Rect {
  const sw = Math.min(SNAP_WIDTH, maxW)
  const sh = SNAP_HEIGHT
  switch (snap) {
    case 'left':
      return { ...r, w: sw }
    case 'right':
      return { ...r, w: sw }
    case 'top':
      return { ...r, h: sh }
    case 'bottom':
      return { ...r, h: sh }
    case 'top-left':
      return { ...r, w: sw }
    case 'top-right':
      return { ...r, w: sw }
    case 'bottom-left':
      return { ...r, w: sw }
    case 'bottom-right':
      return { ...r, w: sw }
    default:
      return r
  }
}

function maxPanelWidth(minW: number): number {
  return Math.max(minW, Math.floor(getInnerWidth() / 3))
}

function clampRect(r: Rect, minW: number, minH: number, maxW?: number): Rect {
  const W = getInnerWidth()
  const H = getInnerHeight()
  const capW = maxW ?? W
  return {
    x: Math.min(W - minW, Math.max(0, r.x)),
    y: Math.min(H - 40, Math.max(0, r.y)),
    w: Math.max(minW, Math.min(r.w, capW, W)),
    h: Math.max(minH, Math.min(r.h, H)),
  }
}

function detectSnap(x: number, y: number, w: number, h: number): SnapEdge {
  const W = getInnerWidth()
  const H = getInnerHeight()
  const nL = x <= SNAP_THRESHOLD
  const nR = x + w >= W - SNAP_THRESHOLD
  const nT = y <= SNAP_THRESHOLD
  const nB = y + h >= H - SNAP_THRESHOLD
  if (nT && nL) return 'top-left'
  if (nT && nR) return 'top-right'
  if (nB && nL) return 'bottom-left'
  if (nB && nR) return 'bottom-right'
  if (nL) return 'left'
  if (nR) return 'right'

  return null
}

const SNAP_BLOCKED_RESIZE: Record<NonNullable<SnapEdge>, readonly string[]> = {
  left: ['l', 't', 'b'],
  right: ['r', 't', 'b'],
  top: ['t', 'l', 'r'],
  bottom: ['b', 'l', 'r'],
  'top-left': ['t', 'l'],
  'top-right': ['t', 'r'],
  'bottom-left': ['b', 'l'],
  'bottom-right': ['b', 'r'],
}

function isSnapResizeAllowed(snap: SnapEdge, dir: ResizeDir): boolean {
  if (!snap) return true
  return !SNAP_BLOCKED_RESIZE[snap].some((c) => dir.includes(c))
}

function load(key: string | undefined, fallback: Rect, minW: number, minH: number, maxW: number): Rect {
  if (!key) return clampRect(fallback, minW, minH, maxW)
  try {
    const p = JSON.parse(localStorage.getItem(key) || '') as Rect
    if (typeof p.x !== 'number') return clampRect(fallback, minW, minH, maxW)
    return clampRect(p, minW, minH, maxW)
  } catch {
    return clampRect(fallback, minW, minH, maxW)
  }
}

function loadFlag(key: string | undefined, suffix: string): boolean {
  if (!key) return false
  return localStorage.getItem(`${key}${suffix}`) === '1'
}

function loadSnapEdge(key: string | undefined): SnapEdge {
  if (!key) return null
  const saved = localStorage.getItem(`${key}-snap`) ?? ''
  const valid: SnapEdge[] = ['left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
  return valid.includes(saved as SnapEdge) ? (saved as SnapEdge) : null
}

export const FloatingPanel = memo(function FloatingPanel({
  defaultX,
  defaultY,
  defaultWidth,
  defaultHeight,
  minWidth = 260,
  minHeight = 220,
  zIndex = 7,
  storageKey,
  title,
  onLayout,
  children,
}: FloatingPanelProps) {
  const texts = useGraphTexts()
  const registeredPanels = useRegisteredPanels()
  const { zIndex: stackZ, focusPanel } = usePanelStack(storageKey)
  const effectiveZ = storageKey ? stackZ : zIndex
  const maxW = useMemo(() => maxPanelWidth(minWidth), [minWidth])

  const fallback: Rect = {
    x: defaultX,
    y: defaultY,
    w: Math.min(defaultWidth, maxW),
    h: defaultHeight,
  }

  const [rect, setRect] = useState<Rect>(() => load(storageKey, fallback, minWidth, minHeight, maxW))

  const [snapEdge, setSnapEdge] = useState<SnapEdge>(() => loadSnapEdge(storageKey))
  const [snapPreview, setSnapPreview] = useState<SnapEdge>(null)
  const [pinned, setPinned] = useState(() => loadFlag(storageKey, '-pin'))
  const [collapsed, setCollapsed] = useState(() => loadFlag(storageKey, '-col'))
  const [dragging, setDragging] = useState(false)

  const snapRef = useRef<SnapEdge>(snapEdge)
  snapRef.current = snapEdge
  const pinnedRef = useRef(pinned)
  pinnedRef.current = pinned
  const collapsedRef = useRef(collapsed)
  collapsedRef.current = collapsed
  const onLayoutRef = useRef(onLayout)
  onLayoutRef.current = onLayout
  const storageKeyRef = useRef(storageKey)
  storageKeyRef.current = storageKey

  const latestDragRectRef = useRef<Rect | null>(null)
  const latestResizeRectRef = useRef<Rect | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const reportRafRef = useRef<number | null>(null)

  const scheduleLayoutReport = useCallback(() => {
    if (reportRafRef.current != null) return
    reportRafRef.current = requestAnimationFrame(() => {
      reportRafRef.current = null
      const el = panelRef.current
      const key = storageKeyRef.current ?? ''
      if (!el || collapsedRef.current) return
      const box = getBoundingClientRect(el)
      onLayoutRef.current?.(
        snapRef.current,
        { w: box.width, h: box.height, left: box.left, top: box.top },
        key,
        pinnedRef.current,
      )
    })
  }, [])

  const mode = useRef<Mode>(null)
  const start = useRef<{ px: number; py: number; rect: Rect }>({ px: 0, py: 0, rect })

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(rect))
  }, [rect, storageKey])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(`${storageKey}-snap`, snapEdge ?? '')
  }, [snapEdge, storageKey])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(`${storageKey}-pin`, pinned ? '1' : '0')
  }, [pinned, storageKey])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(`${storageKey}-col`, collapsed ? '1' : '0')
  }, [collapsed, storageKey])

  useEffect(() => {
    return () => {
      onLayoutRef.current?.(null, null, storageKeyRef.current ?? '')
    }
  }, [])

  const snapSlot = useSnapSlot(storageKey, snapEdge)

  const previewSlot = useMemo((): SideSlot | null => {
    if (!snapPreview || !storageKey) return null
    const temp = new Map(registeredPanels)
    const sw = Math.min(SNAP_WIDTH, maxW)
    temp.set(storageKey, {
      snap: snapPreview,
      w: sw,
      h: rect.h,
      left: 0,
      top: 0,
      pinned: pinnedRef.current,
    })
    return computeSnapSlots(temp).get(storageKey) ?? null
  }, [snapPreview, registeredPanels, storageKey, maxW, rect.h, pinned])

  useEffect(() => {
    const el = panelRef.current
    const key = storageKeyRef.current ?? ''
    if (!el || collapsed) {
      onLayoutRef.current?.(null, null, key)
      return
    }

    const report = () => {
      const box = getBoundingClientRect(el)
      onLayoutRef.current?.(
        snapRef.current,
        { w: box.width, h: box.height, left: box.left, top: box.top },
        key,
        pinnedRef.current,
      )
    }
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    window.addEventListener('resize', report)
    return () => {
      onLayoutRef.current?.(null, null, key)
      ro.disconnect()
      window.removeEventListener('resize', report)
    }
  }, [snapEdge, collapsed, pinned, rect.x, rect.y, rect.w, rect.h, dragging])

  useEffect(() => {
    const onResize = () => setRect((r) => clampRect(r, minWidth, minHeight, maxW))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [minWidth, minHeight, maxW])

  useEffect(() => {
    setRect((r) => (r.w > maxW ? { ...r, w: maxW } : r))
  }, [maxW])

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (!mode.current) return
      const dx = e.clientX - start.current.px
      const dy = e.clientY - start.current.py
      const s = start.current.rect

      if (mode.current === 'drag') {
        const W = getInnerWidth()
        const H = getInnerHeight()
        const nx = Math.min(W - minWidth, Math.max(0, s.x + dx))
        const ny = Math.min(H - 40, Math.max(0, s.y + dy))
        const next: Rect = { ...s, x: nx, y: ny }
        latestDragRectRef.current = next
        setRect(next)
        setSnapPreview(detectSnap(nx, ny, s.w, s.h))
        scheduleLayoutReport()
        return
      }

      const dir = mode.current.slice('resize-'.length)
      let { x, y, w, h } = s
      const W = getInnerWidth()
      const H = getInnerHeight()
      if (dir.includes('r')) w = Math.max(minWidth, Math.min(s.w + dx, maxW, W - x))
      if (dir.includes('b')) h = Math.max(minHeight, Math.min(s.h + dy, H))
      if (dir.includes('l')) {
        const nw = Math.max(minWidth, Math.min(s.w - dx, maxW))
        x = s.x + (s.w - nw)
        w = nw
      }
      if (dir.includes('t')) {
        const nh = Math.max(minHeight, s.h - dy)
        y = Math.max(0, s.y + (s.h - nh))
        h = nh
      }
      latestResizeRectRef.current = { x, y, w, h }
      setRect((r) => ({ ...r, x, y, w, h }))
      scheduleLayoutReport()
    },
    [minWidth, minHeight, maxW, scheduleLayoutReport],
  )

  const stop = useCallback(() => {
    if (mode.current === 'drag') {
      const r = latestDragRectRef.current ?? rect
      const snap = detectSnap(r.x, r.y, r.w, r.h)
      let snapped = snap ? applySnap(snap, r, maxW) : r
      if (snap && isCornerSnap(snap)) {
        const m = pinnedRef.current ? 0 : SNAP_MARGIN
        const nh = Math.floor(getInnerHeight() / 2) - m * 1.5
        snapped = { ...snapped, h: Math.max(minHeight, nh) }
      }
      setRect(snapped)
      setSnapEdge(snap)
      snapRef.current = snap
      setSnapPreview(null)
      latestDragRectRef.current = null
    } else if (mode.current?.startsWith('resize-')) {
      latestResizeRectRef.current = null
    }

    setDragging(false)
    mode.current = null
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', stop)
  }, [onMove, rect, maxW, minHeight])

  const begin = useCallback(
    (e: React.PointerEvent, m: Exclude<Mode, null>) => {
      mode.current = m

      if (m === 'drag') {
        setDragging(true)
        if (snapRef.current && panelRef.current) {
          const el = panelRef.current
          const box = getBoundingClientRect(el)
          const currentRect: Rect = {
            x: box.left,
            y: box.top,
            w: box.width,
            h: box.height,
          }
          start.current = { px: e.clientX, py: e.clientY, rect: currentRect }
          setRect(currentRect)
          setSnapEdge(null)
          snapRef.current = null
        } else {
          start.current = { px: e.clientX, py: e.clientY, rect }
        }
      } else {
        let r = rect
        if (snapRef.current && panelRef.current) {
          const box = getBoundingClientRect(panelRef.current)
          r = { ...rect, w: box.width, h: box.height }
          setRect(r)
        }
        start.current = { px: e.clientX, py: e.clientY, rect: r }
      }

      document.body.style.userSelect = 'none'
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', stop)
    },
    [rect, onMove, stop],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      focusPanel()
      const t = e.target as HTMLElement
      if (!t.closest('[data-fp-handle]')) return
      if (t.closest('button, a, input, [data-no-drag]')) return
      begin(e, 'drag')
    },
    [begin, focusPanel],
  )

  const togglePin = useCallback(() => {
    if (!snapRef.current) return
    const next = !pinnedRef.current
    setPinned(next)
    pinnedRef.current = next

    const el = panelRef.current
    const key = storageKeyRef.current ?? ''
    if (el && !collapsedRef.current) {
      const box = getBoundingClientRect(el)
      onLayoutRef.current?.(snapRef.current, { w: box.width, h: box.height, left: box.left, top: box.top }, key, next)
    }
  }, [])

  const setCollapsedState = useCallback((next: boolean) => {
    setCollapsed(next)
    collapsedRef.current = next
    const key = storageKeyRef.current ?? ''
    if (next) onLayoutRef.current?.(null, null, key)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsedState(!collapsedRef.current)
  }, [setCollapsedState])

  const collapse = useCallback(() => {
    if (!collapsedRef.current) setCollapsedState(true)
  }, [setCollapsedState])

  const expand = useCallback(() => {
    if (collapsedRef.current) setCollapsedState(false)
  }, [setCollapsedState])

  const ghostStyle = useMemo((): CSSProperties | null => {
    if (!snapPreview) return null
    const sized = applySnap(snapPreview, rect, maxW)
    return getSnapPanelStyle(snapPreview, sized, previewSlot, pinned)
  }, [snapPreview, rect, maxW, previewSlot, pinned])

  const panelStyle = useMemo((): CSSProperties => {
    if (snapEdge && !dragging) {
      return { ...getSnapPanelStyle(snapEdge, rect, snapSlot, pinned), zIndex: effectiveZ }
    }
    return { left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: effectiveZ }
  }, [snapEdge, rect, effectiveZ, dragging, snapSlot, pinned])

  const collapsedLeft = useCollapsedBarLeft(storageKey, collapsed)

  const panelActions = useMemo<FloatingPanelActions>(
    () => ({
      controls: (
        <>
          {snapEdge && (
            <Tooltip title={pinned ? texts.settingsPanel.unpin : texts.settingsPanel.pin}>
              <button
                className={`${styles.ctrlBtn} ${pinned ? styles.ctrlBtnActive : ''}`}
                onClick={togglePin}
                data-no-drag
              >
                <IconPin size={13} />
              </button>
            </Tooltip>
          )}
          <Tooltip title={texts.settingsPanel.collapse}>
            <button className={styles.ctrlBtn} onClick={toggleCollapse} data-no-drag>
              <IconMinus size={13} />
            </button>
          </Tooltip>
        </>
      ),
      collapse,
      expand,
    }),
    [snapEdge, pinned, togglePin, toggleCollapse, collapse, expand],
  )

  const rh = (dir: ResizeDir) => {
    if (snapEdge && !isSnapResizeAllowed(snapEdge, dir)) return null
    return (
      <div
        key={dir}
        className={`${styles.rh} ${styles[`r${dir.toUpperCase() as Uppercase<ResizeDir>}`]}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          begin(e, `resize-${dir}`)
        }}
      />
    )
  }

  const panelClass = [
    styles.panel,
    pinned && snapEdge ? styles.pinned : '',
    pinned && snapEdge ? (styles[`pinned-${snapEdge}`] ?? '') : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (collapsed) {
    return (
      <Tooltip title={texts.settingsPanel.expand}>
        <div
          className={styles.collapsedBar}
          style={{ zIndex: effectiveZ, left: collapsedLeft, bottom: COLLAPSED_BOTTOM }}
          onClick={() => {
            focusPanel()
            toggleCollapse()
          }}
        >
          <IconFolder size={15} className={styles.collapsedIcon} />
          <span className={styles.collapsedTitle}>{title ?? texts.settingsPanel.defaultPanelTitle}</span>
          <IconChevronUp size={14} className={styles.collapsedChevron} />
        </div>
      </Tooltip>
    )
  }

  return (
    <>
      {ghostStyle && <div className={styles.snapGhost} style={ghostStyle} />}
      <div
        ref={panelRef}
        className={panelClass}
        data-snap={snapEdge ?? undefined}
        style={panelStyle}
        onPointerDown={onPointerDown}
      >
        <FloatingPanelActionsContext.Provider value={panelActions}>{children}</FloatingPanelActionsContext.Provider>
        {rh('t')} {rh('b')} {rh('l')} {rh('r')}
        {rh('tl')} {rh('tr')} {rh('bl')} {rh('br')}
      </div>
    </>
  )
})
