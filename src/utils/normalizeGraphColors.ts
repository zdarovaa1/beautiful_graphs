import type { CommonAdditionalParams, GraphEdgeDef, GraphNodeDef, GraphLayoutBundle, IslandDef } from '../types'
import { FALLBACK_EDGE, FALLBACK_ISLAND, FALLBACK_STRIP } from '../theme'

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

const COLOR_FIELDS = ['color', 'badgeColor', 'background', 'borderColor', 'titleColor', 'badgeBg'] as const

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function parseHexPair(hex: string, start: number): number {
  return parseInt(hex.slice(start, start + 2), 16)
}

function parseColor(input: string): Rgba | null {
  const value = input.trim()
  if (!value) return null

  if (value.startsWith('#')) {
    const hex = value.slice(1)
    if (hex.length === 3) {
      const expanded = hex
        .split('')
        .map((c) => c + c)
        .join('')
      return {
        r: parseHexPair(expanded, 0),
        g: parseHexPair(expanded, 2),
        b: parseHexPair(expanded, 4),
        a: 1,
      }
    }
    if (hex.length === 6) {
      return {
        r: parseHexPair(hex, 0),
        g: parseHexPair(hex, 2),
        b: parseHexPair(hex, 4),
        a: 1,
      }
    }
    if (hex.length === 8) {
      return {
        r: parseHexPair(hex, 0),
        g: parseHexPair(hex, 2),
        b: parseHexPair(hex, 4),
        a: parseHexPair(hex, 6) / 255,
      }
    }
    return null
  }

  const rgbMatch = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i)
  if (rgbMatch) {
    return {
      r: clampByte(Number(rgbMatch[1])),
      g: clampByte(Number(rgbMatch[2])),
      b: clampByte(Number(rgbMatch[3])),
      a: rgbMatch[4] !== undefined ? Math.max(0, Math.min(1, Number(rgbMatch[4]))) : 1,
    }
  }

  return null
}

function normalizeColor(input: string): string {
  const parsed = parseColor(input)
  if (!parsed) return input
  if (parsed.a >= 1) {
    return `#${parsed.r.toString(16).padStart(2, '0')}${parsed.g.toString(16).padStart(2, '0')}${parsed.b.toString(16).padStart(2, '0')}`
  }
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${parsed.a})`
}

export function withAlpha(input: string | undefined | null, alpha: number): string {
  if (!input) return `rgba(0,0,0,${Math.max(0, Math.min(1, alpha))})`
  const parsed = parseColor(input)
  if (!parsed) return input
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${a})`
}

function normalizeColorFields(params: CommonAdditionalParams): CommonAdditionalParams {
  const next = { ...params }
  for (const key of COLOR_FIELDS) {
    const value = next[key]
    if (typeof value === 'string') next[key] = normalizeColor(value)
  }
  return next
}

function finalizeNodeParams(raw: CommonAdditionalParams): CommonAdditionalParams {
  const p = normalizeColorFields(raw)
  const color = p.color ?? FALLBACK_STRIP
  const badgeColor = p.badgeColor ?? color

  return {
    ...p,
    color,
    badgeColor,
    badgeBg: p.badgeBg ?? withAlpha(badgeColor, 0.1),
  }
}

function finalizeEdgeParams(raw: CommonAdditionalParams): CommonAdditionalParams {
  const p = normalizeColorFields(raw)
  const color = p.color ?? FALLBACK_EDGE

  return {
    ...p,
    color,
  }
}

function finalizeIslandParams(raw: CommonAdditionalParams): CommonAdditionalParams {
  const p = normalizeColorFields(raw)
  const color = p.color ?? FALLBACK_ISLAND
  const badgeColor = p.badgeColor ?? color

  return {
    ...p,
    color,
    badgeColor,
    background: p.background ?? withAlpha(color, 0.08),
    borderColor: p.borderColor ?? withAlpha(color, 0.4),
    badgeBg: p.badgeBg ?? withAlpha(badgeColor, 0.12),
  }
}

export function normalizeNode(node: GraphNodeDef): GraphNodeDef {
  return { ...node, additionalParams: finalizeNodeParams(node.additionalParams) }
}

export function normalizeEdge(edge: GraphEdgeDef): GraphEdgeDef {
  return { ...edge, additionalParams: finalizeEdgeParams(edge.additionalParams) }
}

export function normalizeIsland(island: IslandDef): IslandDef {
  return { ...island, additionalParams: finalizeIslandParams(island.additionalParams) }
}

export function normalizeGraphLayoutBundle(bundle: GraphLayoutBundle): GraphLayoutBundle {
  return {
    ...bundle,
    nodes: bundle.nodes.map(normalizeNode),
    edges: bundle.edges.map(normalizeEdge),
    islands: bundle.islands.map(normalizeIsland),
  }
}

export function normalizeGraphData(data: { nodes: GraphNodeDef[]; edges: GraphEdgeDef[]; islands: IslandDef[] }): {
  nodes: GraphNodeDef[]
  edges: GraphEdgeDef[]
  islands: IslandDef[]
} {
  return {
    nodes: data.nodes.map(normalizeNode),
    edges: data.edges.map(normalizeEdge),
    islands: data.islands.map(normalizeIsland),
  }
}
