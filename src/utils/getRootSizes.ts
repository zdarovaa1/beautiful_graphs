export const GRAPH_ROOT_ID = 'graph-root-container'

function getRootRect(): DOMRect | null {
  return document.getElementById(GRAPH_ROOT_ID)?.getBoundingClientRect() ?? null
}

export function getInnerWidth(): number {
  return getRootRect()?.width ?? window.innerWidth
}

export function getInnerHeight(): number {
  return getRootRect()?.height ?? window.innerHeight
}
