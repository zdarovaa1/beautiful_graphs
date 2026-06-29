/**
 * Работа с цветами из Figma.
 *
 * — Сплошной #RRGGBB / rgb — используется как есть.
 * — #RRGGBBAA или rgba() из Figma — тоже как есть.
 * — Авто-тинты (бейдж, фон острова) — rgba с явной прозрачностью
 *   или предварительное смешивание с фоном (для непрозрачных поверхностей).
 */

/** Фон карточки узла по умолчанию */
export const NODE_SURFACE = '#ffffff';

/** Усреднённый фон холста (градиент GraphView.module.css) — для подбора тинтов под Figma */
export const GRAPH_SURFACE = '#ddf5f5';

/** Прозрачности дефолтных тинтов (если в additionalParams не задан свой цвет) */
export const COLOR_TINT_ALPHA = {
  badgeBg: 0.1,
  islandBg: 0.08,
  islandBorder: 0.4,
  detailBadgeBg: 0.12,
  nodeSelectedBg: 0.12,
  nodeSelectRing: 0.3,
} as const;

export interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(input: string): Rgb | null {
  const s = input.trim();

  if (/^#[0-9a-fA-F]{8}$/.test(s)) {
    return {
      r: parseInt(s.slice(1, 3), 16),
      g: parseInt(s.slice(3, 5), 16),
      b: parseInt(s.slice(5, 7), 16),
      a: parseInt(s.slice(7, 9), 16) / 255,
    };
  }

  if (/^#[0-9a-fA-F]{6}$/.test(s)) {
    return {
      r: parseInt(s.slice(1, 3), 16),
      g: parseInt(s.slice(3, 5), 16),
      b: parseInt(s.slice(5, 7), 16),
      a: 1,
    };
  }

  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const [, r, g, b] = s;
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
      a: 1,
    };
  }

  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] !== undefined ? Number(rgb[4]) : 1,
    };
  }

  return null;
}

function clampByte(n: number): number {
  return Math.round(Math.max(0, Math.min(255, n)));
}

export function toHex(rgb: Rgb): string {
  const r = clampByte(rgb.r).toString(16).padStart(2, '0');
  const g = clampByte(rgb.g).toString(16).padStart(2, '0');
  const b = clampByte(rgb.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/** Цвет из данных / Figma без модификаций */
export function resolveColor(explicit: string | undefined, fallback: string): string {
  return explicit?.trim() || fallback;
}

/** rgba поверх непрозрачного слоя — для полупрозрачных заливок (острова на холсте) */
export function rgbaOnSurface(fg: string, alpha: number): string {
  const c = parseColor(fg);
  if (!c) return fg;
  const a = Math.max(0, Math.min(1, alpha * c.a));
  return `rgba(${clampByte(c.r)}, ${clampByte(c.g)}, ${clampByte(c.b)}, ${a})`;
}

/**
 * Сплошной hex: как выглядит fg с прозрачностью alpha на фоне bg.
 * Удобно для бейджей на белой карточке — совпадает с «Copy as CSS» Figma на том же фоне.
 */
export function tintOnBackground(fg: string, alpha: number, background: string): string {
  const f = parseColor(fg);
  const b = parseColor(background);
  if (!f || !b) return fg;

  const a = Math.max(0, Math.min(1, alpha * f.a));
  return toHex({
    r: f.r * a + b.r * (1 - a),
    g: f.g * a + b.g * (1 - a),
    b: f.b * a + b.b * (1 - a),
    a: 1,
  });
}

/** @deprecated используйте rgbaOnSurface / tintOnBackground */
export function colorWithAlpha(color: string, alpha: number): string {
  return rgbaOnSurface(color, alpha);
}

/** Дефолтный фон бейджа на белой карточке узла */
export function defaultBadgeBg(base: string): string {
  return rgbaOnSurface(base, COLOR_TINT_ALPHA.badgeBg);
}

/** Дефолтный фон бейджа в DetailPanel (белая панель) */
export function defaultDetailBadgeBg(accent: string): string {
  return tintOnBackground(accent, COLOR_TINT_ALPHA.detailBadgeBg, NODE_SURFACE);
}

/** Дефолтная заливка острова — полупрозрачная на холсте */
export function defaultIslandBg(accent: string): string {
  return rgbaOnSurface(accent, COLOR_TINT_ALPHA.islandBg);
}

/** Дефолтная рамка острова */
export function defaultIslandBorder(accent: string): string {
  return rgbaOnSurface(accent, COLOR_TINT_ALPHA.islandBorder);
}

/** Подсветка выбранного узла — производная от accent-полоски */
export function nodeSelectionColors(strip: string, overrides?: {
  selectedBackground?: string;
  borderColor?: string;
}) {
  return {
    border: resolveColor(overrides?.borderColor, rgbaOnSurface(strip, 0.55)),
    background: resolveColor(
      overrides?.selectedBackground,
      tintOnBackground(strip, COLOR_TINT_ALPHA.nodeSelectedBg, NODE_SURFACE),
    ),
    ring: rgbaOnSurface(strip, COLOR_TINT_ALPHA.nodeSelectRing),
  };
}
