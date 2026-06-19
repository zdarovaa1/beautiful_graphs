import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { edges as edgeDefs, islands as islandDefs, nodes as nodeDefs } from './data/graphData';
import { runElkLayout, type LaidOutNode } from './layout/elkLayout';
import { getNodeSize } from './theme';
import styles from './GraphView.module.css';
import { CustomNode } from './components/CustomNode';
import { CustomEdge } from './components/CustomEdge';
import { IslandNode } from './components/IslandNode';
import { DetailPanel } from './components/DetailPanel';
import { Toolbar } from './components/Toolbar';
import { SettingsPanel } from './components/SettingsPanel';
import type {
  DisplaySettings,
  EdgeType,
  IslandType,
  ObjectType,
  SelectedEntity,
} from './types';

const nodeTypes = { graph: CustomNode, island: IslandNode };
const edgeTypes = { custom: CustomEdge };

const ISLAND_PAD = 26;
const ISLAND_HEADER = 30;

// слои по оси Z: острова < выбранный остров < связи < узлы,
// чтобы стрелки и внутренние элементы всегда были выше островов
const Z_ISLAND = 0;
const Z_ISLAND_SELECTED = 4;
const Z_EDGE = 5;
const Z_NODE = 6;

const ALL_OBJECT_TYPES: ObjectType[] = ['AC', 'ФП', 'Сервис', 'ИР', 'Схема', 'Таблица ФМД'];

function buildInitialSettings(): DisplaySettings {
  const objectTypes = Object.fromEntries(ALL_OBJECT_TYPES.map((t) => [t, true])) as Record<ObjectType, boolean>;
  const edgeTypes = Object.fromEntries(
    [...new Set(edgeDefs.map((e) => e.type))].map((t) => [t, true]),
  ) as Record<EdgeType, boolean>;
  const islandTypes = Object.fromEntries(
    [...new Set(islandDefs.map((i) => i.type))].map((t) => [t, true]),
  ) as Record<IslandType, boolean>;
  const nodeNames = Object.fromEntries(nodeDefs.map((n) => [n.id, true]));
  const islandNames = Object.fromEntries(islandDefs.map((i) => [i.id, true]));
  return {
    onlySelectedAndNeighbors: false,
    onlyFirst10PerIsland: false,
    hideAllIslands: false,
    objectTypes,
    edgeTypes,
    islandTypes,
    nodeNames,
    islandNames,
  };
}

const STORAGE_KEY = 'graph-display-settings';
const POS_KEY = 'graph-node-positions';

interface FlowCanvasProps {
  derivedNodes: Node[];
  edges: Edge[];
  nodesDraggable: boolean;
  onNodeClick: NodeMouseHandler;
  onEdgeClick: EdgeMouseHandler;
  onPaneClick: () => void;
  onNodeDragStop: (e: unknown, node: Node) => void;
}

/**
 * Холст с СОБСТВЕННЫМ состоянием узлов (useNodesState). Живое перетаскивание
 * меняет только это состояние → родитель (панели/тулбар) не перерисовывается.
 * Структурные изменения (фильтры/выбор/сброс) приходят через derivedNodes.
 */
function FlowCanvas({
  derivedNodes,
  edges,
  nodesDraggable,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onNodeDragStop,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);

  useEffect(() => {
    setNodes(derivedNodes);
  }, [derivedNodes, setNodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      onNodesChange={onNodesChange}
      onNodeDragStop={onNodeDragStop}
      nodesDraggable={nodesDraggable}
      selectNodesOnDrag={false}
      elevateNodesOnSelect={false}
      fitView
      minZoom={0.2}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#c7d2e0" />
    </ReactFlow>
  );
}

type PosMap = Record<string, { x: number; y: number }>;

function loadPositions(): PosMap {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || '{}') as PosMap;
  } catch {
    return {};
  }
}

function GraphInner() {
  const [positions, setPositions] = useState<Map<string, LaidOutNode> | null>(null);
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [savedPositions, setSavedPositions] = useState<PosMap>(loadPositions);
  const [settings, setSettings] = useState<DisplaySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...buildInitialSettings(), ...JSON.parse(saved) };
      } catch {
        /* ignore */
      }
    }
    return buildInitialSettings();
  });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    runElkLayout(nodeDefs, edgeDefs).then((map) => {
      if (alive) setPositions(map);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ── видимость узлов по фильтрам ───────────────────────────────────────────
  const visibleNodeIds = useMemo(() => {
    let ids = nodeDefs
      .filter((n) => settings.objectTypes[n.type] && settings.nodeNames[n.id])
      .map((n) => n.id);

    if (settings.onlyFirst10PerIsland && positions) {
      const allow = new Set<string>();
      for (const island of islandDefs) {
        const members = nodeDefs
          .filter((n) => n.islandIds.includes(island.id) && ids.includes(n.id))
          .sort((a, b) => {
            const pa = positions.get(a.id);
            const pb = positions.get(b.id);
            return (pa?.y ?? 0) - (pb?.y ?? 0) || (pa?.x ?? 0) - (pb?.x ?? 0);
          })
          .slice(0, 10);
        members.forEach((m) => allow.add(m.id));
      }
      nodeDefs.filter((n) => n.islandIds.length === 0).forEach((n) => allow.add(n.id));
      ids = ids.filter((id) => allow.has(id));
    }

    if (settings.onlySelectedAndNeighbors && selected?.kind === 'node') {
      const focus = selected.data.id;
      const keep = new Set<string>([focus]);
      edgeDefs.forEach((e) => {
        if (e.source === focus) keep.add(e.target);
        if (e.target === focus) keep.add(e.source);
      });
      ids = ids.filter((id) => keep.has(id));
    }

    return new Set(ids);
  }, [settings, positions, selected]);

  // ── узлы островов (фон) ───────────────────────────────────────────────────
  const islandRfNodes = useMemo<Node[]>(() => {
    if (!positions || settings.hideAllIslands) return [];
    const out: Node[] = [];
    for (const island of islandDefs) {
      if (!settings.islandTypes[island.type] || !settings.islandNames[island.id]) continue;
      const members = nodeDefs.filter(
        (n) => n.islandIds.includes(island.id) && visibleNodeIds.has(n.id),
      );
      if (members.length === 0) continue;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const m of members) {
        const base = positions.get(m.id);
        if (!base) continue;
        const p = savedPositions[m.id] ?? base;
        const { width: mw, height: mh } = getNodeSize(m.additionalParams);
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + mw);
        maxY = Math.max(maxY, p.y + mh);
      }
      const x = minX - ISLAND_PAD;
      const y = minY - ISLAND_PAD - ISLAND_HEADER;
      const width = maxX - minX + ISLAND_PAD * 2;
      const height = maxY - minY + ISLAND_PAD * 2 + ISLAND_HEADER;
      out.push({
        id: `island-${island.id}`,
        type: 'island',
        position: { x, y },
        data: { def: island, width, height },
        draggable: false,
        selectable: true,
        selected: selected?.kind === 'island' && selected.data.id === island.id,
        zIndex: selected?.kind === 'island' && selected.data.id === island.id ? Z_ISLAND_SELECTED : Z_ISLAND,
        style: { width, height },
      });
    }
    return out;
  }, [positions, visibleNodeIds, settings, selected, savedPositions]);

  // ── узлы графов ──────────────────────────────────────────────────────────
  const graphRfNodes = useMemo<Node[]>(() => {
    if (!positions) return [];
    return nodeDefs
      .filter((n) => visibleNodeIds.has(n.id))
      .map((n) => {
        const base = positions.get(n.id);
        const p = savedPositions[n.id] ?? base;
        return {
          id: n.id,
          type: 'graph',
          position: { x: p?.x ?? 0, y: p?.y ?? 0 },
          data: { def: n },
          selected: selected?.kind === 'node' && selected.data.id === n.id,
          zIndex: Z_NODE,
        } satisfies Node;
      });
  }, [positions, visibleNodeIds, selected, savedPositions]);

  const rfNodes = useMemo(() => [...islandRfNodes, ...graphRfNodes], [islandRfNodes, graphRfNodes]);

  const rfEdges = useMemo<Edge[]>(() => {
    return edgeDefs
      .filter(
        (e) =>
          settings.edgeTypes[e.type] &&
          visibleNodeIds.has(e.source) &&
          visibleNodeIds.has(e.target),
      )
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: 'l',
        targetHandle: 'r',
        type: 'custom',
        data: { def: e },
        zIndex: Z_EDGE,
        selected: selected?.kind === 'edge' && selected.data.id === e.id,
      }));
  }, [settings, visibleNodeIds, selected]);

  const onNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    if (node.type === 'island') {
      const def = islandDefs.find((i) => `island-${i.id}` === node.id);
      if (def) setSelected({ kind: 'island', data: def });
      return;
    }
    const def = nodeDefs.find((n) => n.id === node.id);
    if (def) setSelected({ kind: 'node', data: def });
  }, []);

  const onEdgeClick = useCallback<EdgeMouseHandler>((_, edge) => {
    const def = edgeDefs.find((e) => e.id === edge.id);
    if (def) setSelected({ kind: 'edge', data: def });
  }, []);

  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    if (node.type === 'island') return;
    setSavedPositions((prev) => {
      const next = { ...prev, [node.id]: { x: node.position.x, y: node.position.y } };
      localStorage.setItem(POS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const onResetPositions = useCallback(() => {
    localStorage.removeItem(POS_KEY);
    setSavedPositions({});
  }, []);

  const onFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  // ── элементы для панели настроек ──────────────────────────────────────────
  const objectTypeItems = ALL_OBJECT_TYPES.map((t) => ({ key: t, label: t }));
  const edgeTypeItems = [...new Set(edgeDefs.map((e) => e.type))].map((t) => ({ key: t, label: t }));
  const islandTypeItems = [...new Set(islandDefs.map((i) => i.type))].map((t) => ({ key: t, label: t }));
  const nodeNameItems = nodeDefs.map((n) => ({ key: n.id, label: n.title }));
  const islandNameItems = islandDefs.map((i) => ({ key: i.id, label: i.title }));

  return (
    <div className={styles.root} ref={wrapperRef}>
      <FlowCanvas
        derivedNodes={rfNodes}
        edges={rfEdges}
        nodesDraggable={editMode}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => setSelected(null)}
        onNodeDragStop={onNodeDragStop}
      />

      <Toolbar
        onToggleSettings={() => setShowSettings((s) => !s)}
        settingsActive={showSettings}
        onFullscreen={onFullscreen}
        editMode={editMode}
        onToggleEdit={() => setEditMode((e) => !e)}
        hasSavedPositions={Object.keys(savedPositions).length > 0}
        onResetPositions={onResetPositions}
      />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
          onRemember={() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            setShowSettings(false);
          }}
          objectTypeItems={objectTypeItems}
          edgeTypeItems={edgeTypeItems}
          islandTypeItems={islandTypeItems}
          nodeNameItems={nodeNameItems}
          islandNameItems={islandNameItems}
        />
      )}

      <DetailPanel selected={selected} onClose={() => setSelected(null)} />
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
