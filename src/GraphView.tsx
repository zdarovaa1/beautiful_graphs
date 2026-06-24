import { createContext, memo, useCallback, useEffect, useMemo, useRef, startTransition, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesState,
  useStore,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import { shallow } from 'zustand/shallow';
import '@xyflow/react/dist/style.css';

// ── источник данных ───────────────────────────────────────────────────────
// Вариант 1 (по умолчанию): оригинальные данные
import { edges as edgeDefs, islands as islandDefs, nodes as nodeDefs } from './data/graphData';
const PRESET_POSITIONS: PosMap = {};

// Вариант 2: сгенерированные моки (сначала запусти: node scripts/generateMocks.mjs)
// import { mockNodes as nodeDefs, mockEdges as edgeDefs, mockIslands as islandDefs, mockPositions } from './data/generatedMockData';
// const PRESET_POSITIONS: PosMap = mockPositions;

import { runElkLayout, type LaidOutNode } from './layout/elkLayout';
import styles from './GraphView.module.css';
import { useReportLayout, useToolbarPosition } from './SnapLayout';
import { CustomNode } from './components/CustomNode';
import { CustomEdge } from './components/CustomEdge';
import { IslandNode } from './components/IslandNode';
import { DetailPanel } from './components/DetailPanel';
import { Toolbar } from './components/Toolbar';
import { SettingsPanel } from './components/SettingsPanel';
import { SelectionToolbar } from './components/SelectionToolbar';
import type { DisplaySettings, SelectedEntity } from './types';
import {
  buildInitialSettings,
  isFiltersChanged,
  computeVisibleNodeIds,
  computeIslandNodes,
  computeGraphNodes,
  computeEdges,
  applyAlignment,
  applyElkLayoutToSelection,
  type PosMap,
} from './utils/graphHelpers';

const RF_NODE_TYPES = { graph: CustomNode, island: IslandNode };
const RF_EDGE_TYPES = { custom: CustomEdge };

/**
 * Уровни детализации нод в зависимости от зума:
 *   0 — zoom < 0.2 → крошечный цветной прямоугольник
 *   1 — zoom < 0.5 → только заголовок
 *   2 — zoom ≥ 0.5 → полная детализация
 * Контекст обновляется только при пересечении порогов — не на каждый тик.
 */
export const ZoomTierContext = createContext<0 | 1 | 2>(2);

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const BG_GAP = 22;
const BG_DOT_SIZE = 1.4;
const BG_DOT_COLOR = '#c7d2e0';

const STORAGE_KEY_SETTINGS = 'graph-display-settings';
const STORAGE_KEY_POSITIONS = 'graph-node-positions';

export type InteractionMode = 'hand' | 'cursor';

function loadPositions(): PosMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_POSITIONS) || '{}') as PosMap; }
  catch { return {}; }
}

interface FlowCanvasProps {
  derivedNodes: Node[];
  edges: Edge[];
  isEditMode: boolean;
  interactionMode: InteractionMode;
  onNodeClick: NodeMouseHandler;
  onEdgeClick: EdgeMouseHandler;
  onPaneClick: () => void;
  onNodeDragStop: (e: unknown, node: Node, draggedNodes: Node[]) => void;
  /** Передаёт setNodes из useNodesState родителю (нужен для скриншота). */
  setNodesExternal: (setter: (payload: Node[] | ((ns: Node[]) => Node[])) => void) => void;
  onAlignH: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => void;
  onAlignV: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => void;
  onElkLayout: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => Promise<void>;
}

const FlowCanvas = memo(function FlowCanvas({
  derivedNodes, edges, isEditMode, interactionMode,
  onNodeClick, onEdgeClick, onPaneClick, onNodeDragStop,
  setNodesExternal, onAlignH, onAlignV, onElkLayout,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);

  useEffect(() => {
    setNodes((current) => {
      const selected = new Map(current.map((n) => [n.id, n.selected]));
      return derivedNodes.map((n) => ({
        ...n,
        selected: selected.get(n.id) ?? false,
      }));
    });
  }, [derivedNodes, setNodes]);

  const setNodesExternalRef = useRef(setNodesExternal);
  setNodesExternalRef.current = setNodesExternal;
  useEffect(() => { setNodesExternalRef.current(setNodes); }, [setNodes]);

  const isHand = interactionMode === 'hand';

  // Квантизованный уровень зума: селектор возвращает примитив (0|1|2), поэтому
  // Zustand сравнивает через Object.is и не триггерит ре-рендер при пане/зуме
  // внутри того же порога. При переходе порога все CustomNode ре-рендерятся
  // через контекст — это дёшево и случается редко.
  const zoomTier = useStore(
    (s: { transform: [number, number, number] }) => {
      const z = s.transform[2];
      return z < 0.2 ? 0 : z < 0.5 ? 1 : 2;
    },
  ) as 0 | 1 | 2;

  // Получаем ID выбранных узлов через store-селектор с shallow-сравнением.
  // В отличие от nodes.filter(), это НЕ пересчитывается при каждом drag-событии —
  // только когда набор выбранных узлов реально изменился.
  // shallow передаётся вторым аргументом — это equalityFn.
  // Правильный способ для useStore из @xyflow/react: selector + equalityFn.
  // useShallow в качестве selector (а не equalityFn) создаёт новую функцию
  // на каждый рендер и не гарантирует стабильность при частых store-обновлениях.
  const selectedIds = useStore(
    (s: { nodeLookup: Map<string, Node> }) =>
      [...s.nodeLookup.values()]
        .filter((n) => n.selected)
        .map((n) => n.id),
    shallow,
  );

  const selectedGraphIds = useStore(
    (s: { nodeLookup: Map<string, Node> }) =>
      [...s.nodeLookup.values()]
        .filter((n) => n.selected && n.type === 'graph')
        .map((n) => n.id),
    shallow,
  );

  const [selectionLayoutTick, setSelectionLayoutTick] = useState(0);
  const bumpSelectionLayout = useCallback(() => {
    setSelectionLayoutTick((t) => t + 1);
  }, []);

  return (
    <ZoomTierContext.Provider value={zoomTier}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={RF_NODE_TYPES}
        edgeTypes={RF_EDGE_TYPES}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeDrag={bumpSelectionLayout}
        onMove={bumpSelectionLayout}
        nodesDraggable={isEditMode}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={!isHand}
        panOnDrag={isHand ? true : [1, 2]}
        panOnScroll={false}
        selectNodesOnDrag={!isHand && isEditMode ? false : !isHand}
        elevateNodesOnSelect={false}
        multiSelectionKeyCode={null}
        deleteKeyCode={null}
        fitView
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        proOptions={{ hideAttribution: true }}
        // ── Оптимизации производительности ──────────────────────────────────
        // onlyRenderVisibleElements намеренно отключён: при пане узлы на границе
        // viewport постоянно монтируются/размонтируются → видимое мигание.
        // Вместо этого держим все узлы в DOM, но с React.memo — они не
        // перерисовываются при пане (RF меняет только CSS-трансформ контейнера).
        nodesConnectable={false}    // нет динамического соединения узлов
        nodesFocusable={false}      // нет клавиатурной навигации по узлам
      >
        <Background variant={BackgroundVariant.Dots} gap={BG_GAP} size={BG_DOT_SIZE} color={BG_DOT_COLOR} />
      </ReactFlow>
      <SelectionToolbar
        selectedIds={selectedIds}
        isEditMode={isEditMode}
        onAlignH={() => onAlignH(selectedGraphIds, setNodes)}
        onAlignV={() => onAlignV(selectedGraphIds, setNodes)}
        onElkLayout={() => onElkLayout(selectedGraphIds, setNodes)}
        layoutTick={selectionLayoutTick}
        onLayoutBump={bumpSelectionLayout}
      />
    </ZoomTierContext.Provider>
  );
});

function GraphInner() {
  const [positions, setPositions] = useState<Map<string, LaidOutNode> | null>(null);
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('hand');
  const [savedPositions, setSavedPositions] = useState<PosMap>(loadPositions);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const defaultSettings = useMemo(
    () => buildInitialSettings(nodeDefs, edgeDefs, islandDefs),
    [],
  );

  const [settings, setSettings] = useState<DisplaySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<DisplaySettings>;
        // nodeNames и islandNames мёрджим: дефолт (все видимы) + сохранённые
        // скрытия. Это позволяет безболезненно переключаться между наборами данных.
        return {
          ...defaultSettings,
          ...parsed,
          nodeNames: { ...defaultSettings.nodeNames, ...(parsed.nodeNames ?? {}) },
          islandNames: { ...defaultSettings.islandNames, ...(parsed.islandNames ?? {}) },
        };
      } catch { /* повреждённые данные */ }
    }
    return defaultSettings;
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const flowSetNodesRef = useRef<((payload: Node[] | ((ns: Node[]) => Node[])) => void) | null>(null);
  const toolbarPos = useToolbarPosition();
  const reportLayout = useReportLayout();

  const layoutLoading = positions === null;

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    // Если есть пресет-позиции (из сгенерированного файла) — ELK не нужен
    if (Object.keys(PRESET_POSITIONS).length > 0) {
      setPositions(
        new Map(Object.entries(PRESET_POSITIONS).map(([id, p]) => [id, { id, x: p.x, y: p.y }])),
      );
      return;
    }
    let alive = true;
    runElkLayout(nodeDefs, edgeDefs).then((map) => { if (alive) setPositions(map); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const visibleNodeIds = useMemo(
    () => computeVisibleNodeIds(nodeDefs, edgeDefs, settings, selected),
    [settings, selected],
  );

  const islandRfNodes = useMemo<Node[]>(
    () => positions
      ? computeIslandNodes(nodeDefs, islandDefs, positions, visibleNodeIds, settings, selected, savedPositions)
      : [],
    [positions, visibleNodeIds, settings, selected, savedPositions],
  );

  // selected намеренно исключён из зависимостей — React Flow сам управляет
  // visual-selection через NodeProps.selected. Это предотвращает пересчёт
  // тысяч нод/рёбер при каждом клике.
  const graphRfNodes = useMemo<Node[]>(
    () => positions
      ? computeGraphNodes(nodeDefs, positions, visibleNodeIds, savedPositions)
      : [],
    [positions, visibleNodeIds, savedPositions],
  );

  const rfNodes = useMemo(() => [...islandRfNodes, ...graphRfNodes], [islandRfNodes, graphRfNodes]);

  const rfEdges = useMemo<Edge[]>(
    () => computeEdges(edgeDefs, settings, visibleNodeIds, positions, savedPositions),
    [settings, visibleNodeIds, positions, savedPositions],
  );

  const filterStats = useMemo(() => ({
    changed: isFiltersChanged(settings, defaultSettings),
    nodes: [visibleNodeIds.size, nodeDefs.length] as [number, number],
    edges: [rfEdges.length, edgeDefs.length] as [number, number],
    islands: [islandRfNodes.length, islandDefs.length] as [number, number],
  }), [settings, defaultSettings, visibleNodeIds, rfEdges, islandRfNodes]);

  const onNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    setShowDetailPanel(true);
    if (node.type === 'island') {
      const def = islandDefs.find((i) => `island-${i.id}` === node.id);
      if (def) setSelected({ kind: 'island', data: def });
      return;
    }
    const def = nodeDefs.find((n) => n.id === node.id);
    if (def) setSelected({ kind: 'node', data: def });
  }, []);

  const onEdgeClick = useCallback<EdgeMouseHandler>((_, edge) => {
    setShowDetailPanel(true);
    const def = edgeDefs.find((e) => e.id === edge.id);
    if (def) setSelected({ kind: 'edge', data: def });
  }, []);

  const onNodeDragStop = useCallback((_: unknown, _node: Node, draggedNodes: Node[]) => {
    setSavedPositions((prev) => {
      const next = { ...prev };
      draggedNodes.forEach((n) => {
        if (n.type !== 'island') next[n.id] = { x: n.position.x, y: n.position.y };
      });
      localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(next));
      return next;
    });
  }, []);

  const onResetPositions = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_POSITIONS);
    setSavedPositions({});
  }, []);

  const onImportPositions = useCallback((pos: PosMap) => {
    localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(pos));
    setSavedPositions(pos);
  }, []);

  const getSavedPositions = useCallback(() => savedPositions, [savedPositions]);

  const onAlignH = useCallback(
    (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => {
      applyAlignment('h', ids, nodeDefs, positions, savedPositions, setSavedPositions, setNodes);
    },
    [positions, savedPositions],
  );

  const onAlignV = useCallback(
    (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => {
      applyAlignment('v', ids, nodeDefs, positions, savedPositions, setSavedPositions, setNodes);
    },
    [positions, savedPositions],
  );

  const onElkLayout = useCallback(
    (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) =>
      applyElkLayoutToSelection(
        ids, nodeDefs, edgeDefs, positions, savedPositions, setSavedPositions, setNodes,
      ),
    [positions, savedPositions],
  );

  const onResetFilters = useCallback(() => {
    startTransition(() => setSettings(defaultSettings));
  }, [defaultSettings]);

  const onPaneClick = useCallback(() => {}, []);
  const onToggleSettings = useCallback(() => setShowSettings((s) => !s), []);
  const onSettingsClose = useCallback(() => setShowSettings(false), []);
  const onDetailClose = useCallback(() => {
    setSelected(null);
    setShowDetailPanel(false);
  }, []);
  const onToggleEdit = useCallback(() => setEditMode((e) => !e), []);

  const onSetFlowNodes = useCallback(
    (setter: (payload: Node[] | ((ns: Node[]) => Node[])) => void) => { flowSetNodesRef.current = setter; },
    [],
  );

  const onFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const settingsItems = useMemo(() => ({
    objectTypeItems: defaultSettings
      ? Object.keys(defaultSettings.objectTypes).map((t) => ({ key: t, label: t }))
      : [],
    edgeTypeItems: [...new Set(edgeDefs.map((e) => e.type))].map((t) => ({ key: t, label: t })),
    islandTypeItems: [...new Set(islandDefs.map((i) => i.type))].map((t) => ({ key: t, label: t })),
    nodeNameItems: nodeDefs.map((n) => ({ key: n.id, label: n.title })),
    islandNameItems: islandDefs.map((i) => ({ key: i.id, label: i.title })),
  }), [defaultSettings]);

  const canvasStyle = useMemo(() => ({
    position: 'absolute' as const,
    inset: 0,
  }), []);

  return (
    <div className={styles.root} ref={wrapperRef}>
      {layoutLoading && (
        <div className={styles.layoutOverlay}>
          <div className={styles.layoutSpinner} />
          <span>Расчёт компоновки…</span>
        </div>
      )}
      <div style={canvasStyle}>
        <FlowCanvas
          derivedNodes={rfNodes}
          edges={rfEdges}
          isEditMode={editMode}
          interactionMode={interactionMode}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          setNodesExternal={onSetFlowNodes}
          onAlignH={onAlignH}
          onAlignV={onAlignV}
          onElkLayout={onElkLayout}
        />
      </div>

      <Toolbar
        style={{ left: toolbarPos.left, top: toolbarPos.top }}
        layout={toolbarPos.layout}
        onToggleSettings={onToggleSettings}
        settingsActive={showSettings}
        onFullscreen={onFullscreen}
        isFullscreen={isFullscreen}
        editMode={editMode}
        onToggleEdit={onToggleEdit}
        interactionMode={interactionMode}
        effectiveMode={interactionMode}
        onSetInteractionMode={setInteractionMode}
        filtersChanged={filterStats.changed}
        filterStats={filterStats}
        hasSavedPositions={Object.keys(savedPositions).length > 0}
        onResetPositions={onResetPositions}
        onImportPositions={onImportPositions}
        getSavedPositions={getSavedPositions}
      />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={(s) => startTransition(() => setSettings(s))}
          onClose={onSettingsClose}
          onReset={onResetFilters}
          onLayout={reportLayout}
          {...settingsItems}
        />
      )}

      {showDetailPanel && (
        <DetailPanel
          selected={selected}
          settings={settings}
          onChange={(s) => startTransition(() => setSettings(s))}
          onClose={onDetailClose}
          onLayout={reportLayout}
        />
      )}
    </div>
  );
}

export function GraphView() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  );
}
