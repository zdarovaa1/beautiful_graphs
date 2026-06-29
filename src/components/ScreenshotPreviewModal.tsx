import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import { IconX } from '@tabler/icons-react';
import '@xyflow/react/dist/style.css';
import { captureFlowRaster, waitForFlowPaint, type RasterFormat } from '../utils/screenshotCapture';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { IslandNode } from './IslandNode';
import { ZoomTierContext } from '../utils/zoomTier';
import { Tooltip } from './Tooltip';
import styles from './ScreenshotPreviewModal.module.css';

const PREVIEW_NODE_TYPES = { graph: CustomNode, island: IslandNode };
const PREVIEW_EDGE_TYPES = { custom: CustomEdge };

const SCREENSHOT_BG = '#d8ebff';
const JPEG_QUALITY = 1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const BG_GAP = 22;
const BG_DOT_SIZE = 1.4;
const BG_DOT_COLOR = '#c7d2e0';
const EXPORT_FIT_PAD = 0.04;

function buildPreviewGraph(allNodes: Node[], allEdges: Edge[], selectedIds: string[]) {
  const selSet = new Set(selectedIds);
  const nodes = allNodes
    .filter((n) => selSet.has(n.id))
    .map((n) => ({ ...n, selected: false, draggable: false }))
    .sort((a, b) => {
      if (a.type === 'island' && b.type !== 'island') return -1;
      if (a.type !== 'island' && b.type === 'island') return 1;
      return 0;
    });
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = allEdges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => ({ ...e, selected: false }));
  return { nodes, edges };
}

function countPreviewItems(nodes: Node[]) {
  const islands = nodes.filter((n) => n.type === 'island').length;
  const graphs = nodes.filter((n) => n.type === 'graph').length;
  return { islands, graphs };
}

function FitViewOnMount() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void fitView({ padding: EXPORT_FIT_PAD, duration: 0 });
    });
    return () => cancelAnimationFrame(id);
  }, [fitView]);
  return null;
}

export interface PreviewExportHandle {
  capture(format: RasterFormat, transparent: boolean): Promise<string | undefined>;
}

interface PreviewExportBridgeProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const PreviewExportBridge = forwardRef<PreviewExportHandle, PreviewExportBridgeProps>(
  function PreviewExportBridge({ containerRef }, ref) {
    const { fitView } = useReactFlow();

    useImperativeHandle(ref, () => ({
      async capture(format, transparent) {
        const container = containerRef.current;
        if (!container) return undefined;

        await fitView({ padding: EXPORT_FIT_PAD, duration: 0 });
        await waitForFlowPaint();

        return captureFlowRaster(container, format, SCREENSHOT_BG, JPEG_QUALITY, transparent);
      },
    }), [containerRef, fitView]);

    return null;
  },
);

interface PreviewCanvasProps {
  nodes: Node[];
  edges: Edge[];
  flowRef: React.RefObject<HTMLDivElement | null>;
  exportRef: React.RefObject<PreviewExportHandle | null>;
  transparent: boolean;
}

const PreviewCanvas = memo(function PreviewCanvas({
  nodes, edges, flowRef, exportRef, transparent,
}: PreviewCanvasProps) {
  return (
    <div
      className={`${styles.previewWrap} ${transparent ? styles.previewWrapTransparent : ''}`}
      ref={flowRef}
    >
      <ZoomTierContext.Provider value={2}>
        <ReactFlow
          className={styles.flow}
          style={transparent ? { background: 'transparent' } : undefined}
          nodes={nodes}
          edges={edges}
          nodeTypes={PREVIEW_NODE_TYPES}
          edgeTypes={PREVIEW_EDGE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          selectNodesOnDrag={false}
          preventScrolling
          fitView
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          proOptions={{ hideAttribution: true }}
        >
          {!transparent && (
            <Background variant={BackgroundVariant.Dots} gap={BG_GAP} size={BG_DOT_SIZE} color={BG_DOT_COLOR} />
          )}
          <FitViewOnMount />
          <PreviewExportBridge ref={exportRef} containerRef={flowRef} />
        </ReactFlow>
      </ZoomTierContext.Provider>
    </div>
  );
});

export interface ScreenshotPreviewModalProps {
  selectedIds: string[];
  allNodes: Node[];
  allEdges: Edge[];
  onClose: () => void;
}

export const ScreenshotPreviewModal = memo(function ScreenshotPreviewModal({
  selectedIds, allNodes, allEdges, onClose,
}: ScreenshotPreviewModalProps) {
  const flowRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<PreviewExportHandle>(null);
  const [saving, setSaving] = useState<RasterFormat | null>(null);
  const [transparent, setTransparent] = useState(false);

  const { nodes, edges } = useMemo(
    () => buildPreviewGraph(allNodes, allEdges, selectedIds),
    [allNodes, allEdges, selectedIds],
  );

  const counts = useMemo(() => countPreviewItems(nodes), [nodes]);

  const save = useCallback(async (format: RasterFormat) => {
    if (saving) return;

    setSaving(format);
    try {
      const dataUrl = await exportRef.current?.capture(format, transparent);
      if (!dataUrl) return;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `graph.${transparent ? 'png' : format}`;
      a.click();
    } catch (err) {
      console.error('Screenshot save failed', err);
    } finally {
      setSaving(null);
    }
  }, [saving, transparent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="screenshot-preview-title" className={styles.title}>Предпросмотр скриншота</h2>
          <Tooltip title="Закрыть">
            <button type="button" className={styles.closeBtn} onClick={onClose}>
              <IconX size={18} />
            </button>
          </Tooltip>
        </header>

        <ReactFlowProvider>
          <PreviewCanvas
            nodes={nodes}
            edges={edges}
            flowRef={flowRef}
            exportRef={exportRef}
            transparent={transparent}
          />
        </ReactFlowProvider>

        <footer className={styles.footer}>
          <span className={styles.hint}>
            {counts.graphs} узл., {counts.islands} остр., {edges.length} связ.
          </span>
          <label className={styles.bgToggle}>
            <input
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
            />
            Без фона
          </label>
          <button type="button" className={styles.btn} onClick={onClose}>Отмена</button>
          <button type="button" className={styles.btnPrimary} disabled={!!saving} onClick={() => save('png')}>
            {saving === 'png' ? 'Сохранение…' : 'PNG'}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!!saving || transparent}
            onClick={() => save('jpeg')}
          >
            {saving === 'jpeg' ? 'Сохранение…' : 'JPEG'}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!!saving || transparent}
            onClick={() => save('webp')}
          >
            {saving === 'webp' ? 'Сохранение…' : 'WebP'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
});
