import {
  memo, useCallback, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import {
  IconCamera, IconLayoutAlignMiddle, IconLayoutAlignCenter, IconTopologyStar3,
} from '@tabler/icons-react';
import { ScreenshotPreviewModal } from './ScreenshotPreviewModal';
import styles from './SelectionToolbar.module.css';

const GAP = 10;
const MARGIN = 8;

interface SelectionToolbarProps {
  selectedIds: string[];
  isEditMode: boolean;
  onAlignH: () => void;
  onAlignV: () => void;
  onElkLayout: () => Promise<void>;
  layoutTick: number;
  onLayoutBump: () => void;
}

function measureSelectionBounds(flowRoot: Element, container: Element) {
  const nodes = flowRoot.querySelectorAll<HTMLElement>('.react-flow__node.selected');
  if (nodes.length === 0) return null;

  const containerRect = container.getBoundingClientRect();
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  nodes.forEach((n) => {
    const b = n.getBoundingClientRect();
    left = Math.min(left, b.left);
    top = Math.min(top, b.top);
    right = Math.max(right, b.right);
    bottom = Math.max(bottom, b.bottom);
  });

  return {
    cx: (left + right) / 2 - containerRect.left,
    top: top - containerRect.top,
    bottom: bottom - containerRect.top,
    containerW: containerRect.width,
    containerH: containerRect.height,
  };
}

const ToolBtn = memo(function ToolBtn({
  title, onClick, disabled, children, className,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${className ?? ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
});

export const SelectionToolbar = memo(function SelectionToolbar({
  selectedIds, isEditMode, onAlignH, onAlignV, onElkLayout, layoutTick, onLayoutBump,
}: SelectionToolbarProps) {
  const { getNodes, getEdges } = useReactFlow();
  const transform = useStore((s) => s.transform);
  const graphSelectedCount = useStore(
    (s: { nodeLookup: Map<string, import('@xyflow/react').Node> }) =>
      [...s.nodeLookup.values()].filter((n) => n.selected && n.type === 'graph').length,
  );
  const barRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [elkBusy, setElkBusy] = useState(false);

  const openPreview = useCallback(() => {
    if (selectedIds.length === 0) return;
    setPreviewOpen(true);
  }, [selectedIds.length]);

  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const handleAlignH = useCallback(() => {
    onAlignH();
    onLayoutBump();
  }, [onAlignH, onLayoutBump]);

  const handleAlignV = useCallback(() => {
    onAlignV();
    onLayoutBump();
  }, [onAlignV, onLayoutBump]);

  const handleElk = useCallback(async () => {
    if (elkBusy) return;
    setElkBusy(true);
    try {
      await onElkLayout();
      onLayoutBump();
    } finally {
      setElkBusy(false);
    }
  }, [elkBusy, onElkLayout, onLayoutBump]);

  const updatePosition = useCallback(() => {
    if (selectedIds.length === 0) {
      setPos(null);
      return;
    }

    const bar = barRef.current;
    if (!bar) return;

    const container = bar.offsetParent as HTMLElement | null;
    const flowRoot = container?.querySelector('.react-flow');
    if (!container || !flowRoot) return;

    const bounds = measureSelectionBounds(flowRoot, container);
    if (!bounds) {
      setPos(null);
      return;
    }

    const barH = bar.offsetHeight || 42;
    let top = bounds.top - GAP - barH;
    if (top < MARGIN) {
      top = bounds.bottom + GAP;
    }
    top = Math.min(top, bounds.containerH - barH - MARGIN);

    const left = Math.max(
      MARGIN,
      Math.min(bounds.containerW - MARGIN, bounds.cx),
    );

    setPos({ left, top });
  }, [selectedIds]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, transform, layoutTick, selectedIds]);

  const barStyle = useMemo((): CSSProperties | undefined => (
    pos ? { left: pos.left, top: pos.top } : undefined
  ), [pos]);

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div ref={barRef} className={styles.bar} style={barStyle}>
        {isEditMode && graphSelectedCount >= 2 && (
          <>
            <ToolBtn title="Выровнять по горизонтали" onClick={handleAlignH}>
              <IconLayoutAlignMiddle size={16} />
            </ToolBtn>
            <ToolBtn title="Выровнять по вертикали" onClick={handleAlignV}>
              <IconLayoutAlignCenter size={16} />
            </ToolBtn>
            <ToolBtn
              title="Автоукладка ELK"
              onClick={() => { void handleElk(); }}
              disabled={elkBusy}
              className={elkBusy ? styles.btnBusy : ''}
            >
              <IconTopologyStar3 size={16} className={elkBusy ? styles.spin : undefined} />
            </ToolBtn>
            <div className={styles.sep} />
          </>
        )}
        <ToolBtn title="Предпросмотр скриншота" onClick={openPreview}>
          <IconCamera size={16} />
        </ToolBtn>
      </div>

      {previewOpen && (
        <ScreenshotPreviewModal
          selectedIds={selectedIds}
          allNodes={getNodes()}
          allEdges={getEdges()}
          onClose={closePreview}
        />
      )}
    </>
  );
});
