export type ObjectType = 'AC' | 'ФП' | 'Сервис' | 'ИР' | 'Схема' | 'Таблица ФМД'

export const ALL_OBJECT_TYPES: ObjectType[] = ['AC', 'ФП', 'Сервис', 'ИР', 'Схема', 'Таблица ФМД']

export interface Attribute {
  name: string
  value: string
}

export interface UsefulLink {
  label: string
  url: string
}

export interface CommonAdditionalParams {
  color?: string
  width?: number
  height?: number
  background?: string
  borderColor?: string
  titleColor?: string
  badgeColor?: string
  badgeBg?: string
  strokeWidth?: number
  curvature?: number
  animated?: boolean
  /** Градиент на stroke (по умолчанию — сплошной цвет из Figma) */
  edgeGradient?: boolean
  /** Фон карточки в состоянии selected (если не задан — лёгкий тинт от color) */
  selectedBackground?: string
  links?: UsefulLink[]
  [key: string]: unknown
}

export interface GraphNodeDef {
  id: string
  title: string
  /** Краткое описание — выводится прямо на карточке. */
  shortDescription?: string
  /** Полное описание — только в DetailPanel. */
  description: string
  attributes: Attribute[]
  type: ObjectType
  additionalParams: CommonAdditionalParams
  islandIds: string[]
}

export type EdgeType = 'Связь' | 'Поток' | 'Зависимость' | 'Использует'

export interface GraphEdgeDef {
  id: string
  source: string
  target: string
  title: string
  shortDescription?: string
  description: string
  attributes: Attribute[]
  type: EdgeType
  additionalParams: CommonAdditionalParams
}

export type IslandType = 'Домен' | 'Контур' | 'Группа'

export interface IslandDef {
  id: string
  title: string
  /** Краткое описание — выводится в заголовке острова. */
  shortDescription?: string
  /** Полное описание — только в DetailPanel. */
  description: string
  attributes: Attribute[]
  type: IslandType
  additionalParams: CommonAdditionalParams
}

export interface GraphData {
  nodes: GraphNodeDef[]
  edges: GraphEdgeDef[]
  islands: IslandDef[]
}

/** GraphData + координаты узлов после ELK (файл для S3) */
export interface GraphLayoutBundle extends GraphData {
  positions: Record<string, { x: number; y: number }>
}

export type SelectedEntity =
  { kind: 'node'; data: GraphNodeDef } | { kind: 'edge'; data: GraphEdgeDef } | { kind: 'island'; data: IslandDef }

export interface DisplaySettings {
  onlySelectedAndNeighbors: boolean
  hideAllIslands: boolean
  showEdgeLabels: boolean
  objectTypes: Record<ObjectType, boolean>
  edgeTypes: Record<EdgeType, boolean>
  islandTypes: Record<IslandType, boolean>
  nodeNames: Record<string, boolean>
  edgeNames: Record<string, boolean>
  islandNames: Record<string, boolean>
  islandTypeCascade: Record<IslandType, boolean>
  islandNameCascade: Record<string, boolean>
}

export type InteractionMode = 'hand' | 'cursor'
