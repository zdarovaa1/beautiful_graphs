import { GRAPH_ROOT_ID } from './getRootSizes';

export interface RootRelativeRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export function getBoundingClientRect(element: Element): RootRelativeRect {
  const rect = element.getBoundingClientRect();
  const root = document.getElementById(GRAPH_ROOT_ID)?.getBoundingClientRect();
  const rootLeft = root?.left ?? 0;
  const rootTop = root?.top ?? 0;
  const left = rect.left - rootLeft;
  const top = rect.top - rootTop;

  return {
    left,
    top,
    width: rect.width,
    height: rect.height,
    right: left + rect.width,
    bottom: top + rect.height,
  };
}
