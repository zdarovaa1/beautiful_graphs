import { memo, useCallback, useEffect, useMemo, useRef, startTransition, useState, type Dispatch, type SetStateAction } from 'react';
import { ReactFlowProvider, type Edge, type Node, type NodeMouseHandler, type EdgeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GraphOverlay } from './components/GraphOverlay';
import { FlowCanvas } from './components/FlowCanvas';
import type { LaidOutNode } from './layout/elkLayout';
import styles from './GraphView.module.css';
import { useReportLayout, useToolbarPosition } from './SnapLayout';
import type {
  DisplaySettings,
  GraphEdgeDef,
  GraphNodeDef,
  GraphLayoutBundle,
  InteractionMode,
  IslandDef,
  SelectedEntity,
} from './types';
import { GRAPH_ROOT_ID } from './utils/getRootSizes';
import { applyGraphLayoutBundle } from './utils/graphRegistry';
import { bundleToLayoutMap, loadGraphBundle } from './utils/loadGraphBundle';
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

export type { InteractionMode } from './types';

const STORAGE_KEY_SETTINGS = 'graph-display-settings';
const STORAGE_KEY_POSITIONS = 'graph-node-positions';

function loadPositions(): PosMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_POSITIONS) || '{}') as PosMap; }
  catch { return {}; }
}

function mergeDisplaySettings(
  saved: Partial<DisplaySettings> | null,
  defaults: DisplaySettings,
): DisplaySettings {
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    nodeNames: { ...defaults.nodeNames, ...(saved.nodeNames ?? {}) },
    islandNames: { ...defaults.islandNames, ...(saved.islandNames ?? {}) },
    islandTypeCascade: {
      ...defaults.islandTypeCascade,
      ...(saved.islandTypeCascade ?? {}),
    },
    islandNameCascade: {
      ...defaults.islandNameCascade,
      ...(saved.islandNameCascade ?? {}),
    },
  };
}

interface GraphCanvasHostProps {
  nodeDefs: GraphNodeDef[];
  edgeDefs: GraphEdgeDef[];
  islandDefs: IslandDef[];
  positions: Map<string, LaidOutNode>;
  savedPositions: PosMap;
  settings: DisplaySettings;
  defaultSettings: DisplaySettings;
  focusNodeId: string | null;
  editMode: boolean;
  interactionMode: InteractionMode;
  onNodeClick: NodeMouseHandler;
  onEdgeClick: EdgeMouseHandler;
  onPaneClick: () => void;
  onNodeDragStop: (e: unknown, node: Node, draggedNodes: Node[]) => void;
  setNodesExternal: (setter: (payload: Node[] | ((ns: Node[]) => Node[])) => void) => void;
  onAlignH: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => void;
  onAlignV: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => void;
  onElkLayout: (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => Promise<void>;
  onFocusReady: (focus: (entity: SelectedEntity) => void) => void;
  onFilterStats: (stats: {
    changed: boolean;
    nodes: [number, number];
    edges: [number, number];
    islands: [number, number];
  }) => void;
}

const GraphCanvasHost = memo(function GraphCanvasHost({
  nodeDefs,
  edgeDefs,
  islandDefs,
  positions,
  savedPositions,
  settings,
  defaultSettings,
  focusNodeId,
  editMode,
  interactionMode,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onNodeDragStop,
  setNodesExternal,
  onAlignH,
  onAlignV,
  onElkLayout,
  onFocusReady,
  onFilterStats,
}: GraphCanvasHostProps) {
  const visibleNodeIds = useMemo(
    () => computeVisibleNodeIds(nodeDefs, edgeDefs, islandDefs, settings, focusNodeId),
    [nodeDefs, edgeDefs, islandDefs, settings, focusNodeId],
  );

  const islandRfNodes = useMemo<Node[]>(
    () => computeIslandNodes(nodeDefs, islandDefs, positions, visibleNodeIds, settings, savedPositions),
    [nodeDefs, islandDefs, positions, visibleNodeIds, settings, savedPositions],
  );

  const graphRfNodes = useMemo<Node[]>(
    () => computeGraphNodes(nodeDefs, positions, visibleNodeIds, savedPositions),
    [nodeDefs, positions, visibleNodeIds, savedPositions],
  );

  const rfNodes = useMemo(() => [...islandRfNodes, ...graphRfNodes], [islandRfNodes, graphRfNodes]);

  const rfEdges = useMemo<Edge[]>(
    () => computeEdges(edgeDefs, settings, visibleNodeIds, positions, savedPositions),
    [edgeDefs, settings, visibleNodeIds, positions, savedPositions],
  );

  const filterStats = useMemo(() => ({
    changed: isFiltersChanged(settings, defaultSettings),
    nodes: [visibleNodeIds.size, nodeDefs.length] as [number, number],
    edges: [rfEdges.length, edgeDefs.length] as [number, number],
    islands: [islandRfNodes.length, islandDefs.length] as [number, number],
  }), [settings, defaultSettings, visibleNodeIds, rfEdges, islandRfNodes, nodeDefs.length, edgeDefs.length, islandDefs.length]);

  useEffect(() => {
    onFilterStats(filterStats);
  }, [filterStats, onFilterStats]);

  return (
    <FlowCanvas
      derivedNodes={rfNodes}
      edges={rfEdges}
      isEditMode={editMode}
      interactionMode={interactionMode}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      onNodeDragStop={onNodeDragStop}
      setNodesExternal={setNodesExternal}
      onAlignH={onAlignH}
      onAlignV={onAlignV}
      onElkLayout={onElkLayout}
      onFocusReady={onFocusReady}
    />
  );
});

function GraphInner() {
  const [graphBundle, setGraphBundle] = useState<GraphLayoutBundle | null>(null);
  const [graphEpoch, setGraphEpoch] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, LaidOutNode> | null>(null);
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('hand');
  const [savedPositions, setSavedPositions] = useState<PosMap>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [filterStats, setFilterStats] = useState({
    changed: false,
    nodes: [0, 0] as [number, number],
    edges: [0, 0] as [number, number],
    islands: [0, 0] as [number, number],
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const flowSetNodesRef = useRef<((payload: Node[] | ((ns: Node[]) => Node[])) => void) | null>(null);
  const focusEntityRef = useRef<(entity: SelectedEntity) => void>(() => {});
  const settingsRef = useRef<DisplaySettings | null>(null);
  settingsRef.current = settings;

  const nodeDefs = graphBundle?.nodes ?? [];
  const edgeDefs = graphBundle?.edges ?? [];
  const islandDefs = graphBundle?.islands ?? [];

  const defaultSettings = useMemo(
    () => (graphBundle
      ? buildInitialSettings(graphBundle.nodes, graphBundle.edges, graphBundle.islands)
      : null),
    [graphBundle],
  );

  const toolbarPos = useToolbarPosition();
  const reportLayout = useReportLayout();

  const graphLoading = graphBundle === null && loadError === null;

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;

    (async () => {
      try {
        const bundle = await loadGraphBundle(ac.signal);
        if (!alive) return;

        applyGraphLayoutBundle(bundle);
        const defaults = buildInitialSettings(bundle.nodes, bundle.edges, bundle.islands);

        let savedSettings: Partial<DisplaySettings> | null = null;
        try {
          const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
          if (raw) savedSettings = JSON.parse(raw) as Partial<DisplaySettings>;
        } catch { /* ignore */ }

        setGraphBundle(bundle);
        setPositions(bundleToLayoutMap(bundle));
        setSavedPositions(loadPositions());
        setSettings(mergeDisplaySettings(savedSettings, defaults));
        setGraphEpoch((n) => n + 1);
        setSelected(null);
        setFocusNodeId(null);
        setLoadError(null);
      } catch (err) {
        if (!alive || ac.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'Не удалось загрузить граф';
        setLoadError(msg);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!settings?.onlySelectedAndNeighbors) {
      setFocusNodeId(null);
    }
  }, [settings?.onlySelectedAndNeighbors]);

  const onFilterStats = useCallback((stats: {
    changed: boolean;
    nodes: [number, number];
    edges: [number, number];
    islands: [number, number];
  }) => {
    setFilterStats((prev) => (
      prev.changed === stats.changed
      && prev.nodes[0] === stats.nodes[0]
      && prev.nodes[1] === stats.nodes[1]
      && prev.edges[0] === stats.edges[0]
      && prev.edges[1] === stats.edges[1]
      && prev.islands[0] === stats.islands[0]
      && prev.islands[1] === stats.islands[1]
        ? prev
        : stats
    ));
  }, []);

  const onNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    setShowDetailPanel(true);
    if (node.type === 'island') {
      const def = islandDefs.find((i) => `island-${i.id}` === node.id);
      if (def) setSelected({ kind: 'island', data: def });
      return;
    }
    if (settingsRef.current?.onlySelectedAndNeighbors) {
      setFocusNodeId(node.id);
    }
    const def = nodeDefs.find((n) => n.id === node.id);
    if (def) setSelected({ kind: 'node', data: def });
  }, [nodeDefs, islandDefs]);

  const onEdgeClick = useCallback<EdgeMouseHandler>((_, edge) => {
    setShowDetailPanel(true);
    const def = edgeDefs.find((e) => e.id === edge.id);
    if (def) setSelected({ kind: 'edge', data: def });
  }, [edgeDefs]);

  const onFocusReady = useCallback((focus: (entity: SelectedEntity) => void) => {
    focusEntityRef.current = focus;
  }, []);

  const onSelectEntity = useCallback((entity: SelectedEntity) => {
    setSelected(entity);
    setShowDetailPanel(true);
    if (entity.kind === 'node' && settingsRef.current?.onlySelectedAndNeighbors) {
      setFocusNodeId(entity.data.id);
    }
    focusEntityRef.current(entity);
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
      if (!positions) return;
      applyAlignment('h', ids, nodeDefs, positions, savedPositions, setSavedPositions, setNodes);
    },
    [nodeDefs, positions, savedPositions],
  );

  const onAlignV = useCallback(
    (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => {
      if (!positions) return;
      applyAlignment('v', ids, nodeDefs, positions, savedPositions, setSavedPositions, setNodes);
    },
    [nodeDefs, positions, savedPositions],
  );

  const onElkLayout = useCallback(
    (ids: string[], setNodes: (fn: (ns: Node[]) => Node[]) => void) => {
      if (!positions) return Promise.resolve();
      return applyElkLayoutToSelection(
        ids, nodeDefs, edgeDefs, positions, savedPositions, setSavedPositions, setNodes,
      );
    },
    [nodeDefs, edgeDefs, positions, savedPositions],
  );

  const onResetFilters = useCallback(() => {
    if (!defaultSettings) return;
    startTransition(() => setSettings(defaultSettings));
  }, [defaultSettings]);

  const handleSettingsChange: Dispatch<SetStateAction<DisplaySettings>> = useCallback((s) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return typeof s === 'function' ? s(prev) : s;
    });
  }, []);

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

  const settingsItems = useMemo(() => {
    if (!defaultSettings) {
      return {
        objectTypeItems: [],
        edgeTypeItems: [],
        islandTypeItems: [],
        nodeNameItems: [],
        islandNameItems: [],
      };
    }
    return {
      objectTypeItems: Object.keys(defaultSettings.objectTypes).map((t) => ({ key: t, label: t })),
      edgeTypeItems: [...new Set(edgeDefs.map((e) => e.type))].map((t) => ({ key: t, label: t })),
      islandTypeItems: [...new Set(islandDefs.map((i) => i.type))].map((t) => ({ key: t, label: t })),
      nodeNameItems: nodeDefs.map((n) => ({ key: n.id, label: n.title })),
      islandNameItems: islandDefs.map((i) => ({ key: i.id, label: i.title })),
    };
  }, [defaultSettings, edgeDefs, islandDefs, nodeDefs]);

  const toolbarStyle = useMemo(() => ({
    left: toolbarPos.left,
    top: toolbarPos.top,
  }), [toolbarPos.left, toolbarPos.top]);

  const hasSavedPositions = useMemo(
    () => Object.keys(savedPositions).length > 0,
    [savedPositions],
  );

  return (
    <div id={GRAPH_ROOT_ID} className={styles.root} ref={wrapperRef}>
      {(graphLoading || (graphBundle && !positions)) && (
        <div className={styles.layoutOverlay}>
          <div className={styles.layoutSpinner} />
          <span>Загрузка графа…</span>
        </div>
      )}
      {loadError && (
        <div className={styles.layoutOverlay}>
          <span>{loadError}</span>
        </div>
      )}
      <div className={styles.canvasHost}>
        {graphBundle && positions && settings && defaultSettings && (
          <GraphCanvasHost
            nodeDefs={nodeDefs}
            edgeDefs={edgeDefs}
            islandDefs={islandDefs}
            positions={positions}
            savedPositions={savedPositions}
            settings={settings}
            defaultSettings={defaultSettings}
            focusNodeId={focusNodeId}
            editMode={editMode}
            interactionMode={interactionMode}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={onNodeDragStop}
            setNodesExternal={onSetFlowNodes}
            onAlignH={onAlignH}
            onAlignV={onAlignV}
            onElkLayout={onElkLayout}
            onFocusReady={onFocusReady}
            onFilterStats={onFilterStats}
          />
        )}
      </div>

      {settings && (
        <GraphOverlay
          toolbarStyle={toolbarStyle}
          toolbarLayout={toolbarPos.layout}
          showSettings={showSettings}
          showDetailPanel={showDetailPanel}
          settings={settings}
          selected={selected}
          graphEpoch={graphEpoch}
          editMode={editMode}
          interactionMode={interactionMode}
          isFullscreen={isFullscreen}
          filterStats={filterStats}
          hasSavedPositions={hasSavedPositions}
          settingsItems={settingsItems}
          onToggleSettings={onToggleSettings}
          onFullscreen={onFullscreen}
          onToggleEdit={onToggleEdit}
          onSetInteractionMode={setInteractionMode}
          onResetPositions={onResetPositions}
          onImportPositions={onImportPositions}
          getSavedPositions={getSavedPositions}
          onSettingsChange={handleSettingsChange}
          onSettingsClose={onSettingsClose}
          onResetFilters={onResetFilters}
          onDetailClose={onDetailClose}
          onSelectEntity={onSelectEntity}
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
