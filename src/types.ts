// Single shared type layer for the whole graph domain.

export type ObjectType = 'AC' | 'ФП' | 'Сервис' | 'ИР' | 'Схема' | 'Таблица ФМД';

export interface Attribute {
  name: string;
  value: string;
}

export interface UsefulLink {
  label: string;
  url: string;
}

/**
 * Точечная кастомизация одного объекта. Любое поле необязательно —
 * если не задано, берётся значение из `theme.ts`. Сюда складываем ВСЁ,
 * что хочется уметь менять без правки компонентов.
 */
export interface CommonAdditionalParams {
  /** Боковая цветная полоса узла / акцент острова и связи. */
  color?: string;

  // ── карточка (узел/остров) ──────────────────────────────────────────────
  /** Ширина карточки, px. */
  width?: number;
  /** Высота карточки, px. */
  height?: number;
  /** Фон карточки (CSS color). */
  background?: string;
  /** Цвет рамки карточки. */
  borderColor?: string;
  /** Цвет заголовка. */
  titleColor?: string;

  // ── бейдж типа (правый верхний угол) ──────────────────────────────────────
  /** Цвет текста бейджа типа. */
  badgeColor?: string;
  /** Фон бейджа типа. */
  badgeBg?: string;

  // ── связь ────────────────────────────────────────────────────────────────
  /** Толщина линии связи, px. */
  strokeWidth?: number;
  /** Кривизна безье-связи (0..1). */
  curvature?: number;
  /** Анимированный «поток» (бегущий пунктир). */
  animated?: boolean;

  /** Полезные ссылки в попапе. */
  links?: UsefulLink[];

  [key: string]: unknown;
}

/** A graph object ("граф" in the task). */
export interface GraphNodeDef {
  id: string;
  title: string;
  description: string;
  attributes: Attribute[];
  type: ObjectType;
  additionalParams: CommonAdditionalParams;
  /** A node may live inside several islands at once. */
  islandIds: string[];
}

export type EdgeType = 'Связь' | 'Поток' | 'Зависимость' | 'Использует';

export interface GraphEdgeDef {
  id: string;
  source: string;
  target: string;
  title: string;
  description: string;
  attributes: Attribute[];
  type: EdgeType;
  additionalParams: CommonAdditionalParams;
}

export type IslandType = 'Домен' | 'Контур' | 'Группа';

export interface IslandDef {
  id: string;
  title: string;
  description: string;
  attributes: Attribute[];
  type: IslandType;
  additionalParams: CommonAdditionalParams;
}

/** What the right side panel renders. */
export type SelectedEntity =
  | { kind: 'node'; data: GraphNodeDef }
  | { kind: 'edge'; data: GraphEdgeDef }
  | { kind: 'island'; data: IslandDef };

/** Display settings driven by the settings panel. */
export interface DisplaySettings {
  onlySelectedAndNeighbors: boolean;
  onlyFirst10PerIsland: boolean;
  hideAllIslands: boolean;
  objectTypes: Record<ObjectType, boolean>;
  edgeTypes: Record<EdgeType, boolean>;
  islandTypes: Record<IslandType, boolean>;
  nodeNames: Record<string, boolean>;
  islandNames: Record<string, boolean>;
}
