import type { CommonAdditionalParams, EdgeType, IslandType, ObjectType } from './types'

export const objectTypeColors: Record<ObjectType, string> = {
  AC: '#3b82f6',
  ФП: '#8b5cf6',
  Сервис: '#0ea5e9',
  ИР: '#ef4444',
  Схема: '#06b6d4',
  'Таблица ФМД': '#f59e0b',
}

export const islandTypeColors: Record<IslandType, string> = {
  Домен: '#5b8def',
  Контур: '#22c55e',
  Группа: '#f59e0b',
}

export const edgeTypeColors: Record<EdgeType, string> = {
  Связь: '#7c8db5',
  Поток: '#22c55e',
  Зависимость: '#f59e0b',
  Использует: '#8b5cf6',
}

export const DEFAULT_NODE_WIDTH = 220
export const DEFAULT_NODE_HEIGHT = 76

export const FALLBACK_STRIP = '#94a3b8'
export const FALLBACK_BADGE = '#64748b'
export const FALLBACK_ISLAND = '#5b8def'
export const FALLBACK_EDGE = '#7c8db5'

export const DEFAULT_EDGE_WIDTH = 2
export const DEFAULT_EDGE_WIDTH_SELECTED = 3.5
export const DEFAULT_EDGE_CURVATURE = 0.35

export function getNodeSize(params: CommonAdditionalParams): { width: number; height: number } {
  return {
    width: params.width ?? DEFAULT_NODE_WIDTH,
    height: params.height ?? DEFAULT_NODE_HEIGHT,
  }
}
