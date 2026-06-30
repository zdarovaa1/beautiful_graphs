export interface Attribute {
  name: string
  value: string
}

export interface UsefulLink {
  label: string
  url: string
}

/**
 * Дополнительные параметры отображения. Один набор полей для узлов, связей и островов —
 * но не каждое поле имеет смысл для всех типов. Незаданные цвета на входе нормализуются
 * в normalizeGraphColors (hex -> css/rgba, дефолты от color / badgeColor).
 */
export interface CommonAdditionalParams {
  /**
   * Главный акцентный цвет.
   * Узел (CustomNode): полоска слева; при сильном отдалении — заливка всей карточки.
   * Связь (CustomEdge, SharedEdgeDefs): цвет линии, стрелки и обводки подписи.
   * Остров: база для background / borderColor / badgeColor, если их не передали.
   */
  color?: string
  /** Ширина карточки узла в px. ELK-layout и расчёт островов (graphHelpers, elkLayout). */
  width?: number
  /** Высота карточки узла в px. То же, что width. */
  height?: number
  /**
   * Фон карточки.
   * Узел: фон тела карточки (--node-bg), по умолчанию #fff.
   * Остров (IslandNode): заливка области (--island-bg); если нет — лёгкий тинт от color.
   */
  background?: string
  /**
   * Цвет рамки.
   * Узел: обводка карточки (--node-border); при selected/hover та же рамка, если не считаем от color.
   * Остров: пунктирная граница (--island-border); если нет — полупрозрачный color.
   */
  borderColor?: string
  /** Цвет текста заголовка на карточке узла (--title-color в CustomNode). На острове не используется. */
  titleColor?: string
  /**
   * Цвет текста типа (тега).
   * Узел и остров: подпись type в правом верхнем углу (--badge-color).
   * DetailPanel: accent/meta для узлов и островов. Если нет — берётся color.
   */
  badgeColor?: string
  /**
   * Фон тега с типом.
   * Узел и остров: подложка под type (--badge-bg).
   * DetailPanel: фон meta-бейджей считается от badgeColor/color через withAlpha, если не задан.
   * Если нет — лёгкий тинт от badgeColor.
   */
  badgeBg?: string
  /** Толщина линии связи в px (CustomEdge). По умолчанию — theme.DEFAULT_EDGE_WIDTH. */
  strokeWidth?: number
  /** Изгиб bezier-связи 0…1 (CustomEdge, edgePath). По умолчанию — theme.DEFAULT_EDGE_CURVATURE. */
  curvature?: number
  /** Анимация "потока" по связи (CustomEdge). По умолчанию true. */
  animated?: boolean
  /** Градиент на stroke связи вместо сплошного color (CustomEdge). По умолчанию false. */
  edgeGradient?: boolean
  /** Полезные ссылки в DetailPanel (блок "Полезные ссылки"). */
  links?: UsefulLink[]
  [key: string]: unknown
}

export interface GraphNodeDef {
  id: string
  title: string
  /** Краткое описание — на карточке узла (CustomNode), если zoom достаточный. */
  shortDescription?: string
  /** Полное описание — только в DetailPanel. */
  description: string
  attributes: Attribute[]
  /** Тип объекта; текст на теге карточки и в фильтрах SettingsPanel. */
  type: string
  additionalParams: CommonAdditionalParams
  /** id островов, в которых лежит узел; DetailPanel, расчёт островов. */
  islandIds: string[]
}

export interface GraphEdgeDef {
  id: string
  source: string
  target: string
  title: string
  /** Краткое описание — подпись на связи при достаточном zoom. */
  shortDescription?: string
  /** Полное описание — DetailPanel. */
  description: string
  attributes: Attribute[]
  /** Тип связи; подпись на edge-label и фильтры. */
  type: string
  additionalParams: CommonAdditionalParams
}

export interface IslandDef {
  id: string
  title: string
  /** Краткое описание — под заголовком острова (IslandNode). */
  shortDescription?: string
  /** Полное описание — DetailPanel. */
  description: string
  attributes: Attribute[]
  /** Тип острова; тег в углу и фильтры. */
  type: string
  additionalParams: CommonAdditionalParams
}

export interface GraphData {
  nodes: GraphNodeDef[]
  edges: GraphEdgeDef[]
  islands: IslandDef[]
}

/** GraphData + координаты узлов после ELK; prop graph у GraphView. */
export interface GraphLayoutBundle extends GraphData {
  positions: Record<string, { x: number; y: number }>
}

export type SelectedEntity =
  | { kind: 'node'; data: GraphNodeDef }
  | { kind: 'edge'; data: GraphEdgeDef }
  | { kind: 'island'; data: IslandDef }

/** Настройки видимости и фильтров; SettingsPanel + DetailPanel toggles; per-graph в localStorage. */
export interface DisplaySettings {
  /** Показывать только выбранный узел и его соседей. */
  onlySelectedAndNeighbors: boolean
  /** Скрыть все острова на canvas. */
  hideAllIslands: boolean
  /** Подписи на связях (CustomEdge). */
  showEdgeLabels: boolean
  /** Фильтр по типу узла (SettingsPanel -> "Тип объекта"). */
  objectTypes: Record<string, boolean>
  /** Фильтр по типу связи. */
  edgeTypes: Record<string, boolean>
  /** Фильтр по типу острова. */
  islandTypes: Record<string, boolean>
  /** Видимость конкретных узлов по id. */
  nodeNames: Record<string, boolean>
  /** Видимость конкретных связей по id. */
  edgeNames: Record<string, boolean>
  /** Видимость конкретных островов по id. */
  islandNames: Record<string, boolean>
  /** Скрывать узлы вместе с типом острова (каскад по типу). */
  islandTypeCascade: Record<string, boolean>
  /** Скрывать узлы вместе с конкретным островом (каскад по id). */
  islandNameCascade: Record<string, boolean>
}

/** Режим взаимодействия с canvas: рука (pan) или курсор (выделение). Toolbar -> FlowCanvas. */
export type InteractionMode = 'hand' | 'cursor'
