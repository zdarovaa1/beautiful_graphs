import type { Node } from '@xyflow/react';

function nodeStructureEqual(a: Node, b: Node): boolean {
  return (
    a.type === b.type
    && a.position.x === b.position.x
    && a.position.y === b.position.y
    && a.data === b.data
    && a.zIndex === b.zIndex
    && a.width === b.width
    && a.height === b.height
    && a.draggable === b.draggable
    && a.selectable === b.selectable
    && (a.hidden ?? false) === (b.hidden ?? false)
  );
}

/** Инкрементально сливает derivedNodes в текущий массив RF, сохраняя ссылки и selection */
export function syncDerivedNodes(current: Node[], derived: Node[]): Node[] {
  if (derived.length === 0) {
    return current.length === 0 ? current : [];
  }
  if (current.length === 0) {
    return derived.map((n) => ({ ...n, selected: false }));
  }

  const currentById = new Map(current.map((n) => [n.id, n]));
  const selectedMap = new Map(current.map((n) => [n.id, !!n.selected]));

  let changed = derived.length !== current.length;
  const next: Node[] = new Array(derived.length);

  for (let i = 0; i < derived.length; i++) {
    const d = derived[i];
    const prev = currentById.get(d.id);
    const selected = selectedMap.get(d.id) ?? false;

    if (prev && nodeStructureEqual(prev, d)) {
      if (prev.selected === selected) {
        next[i] = prev;
      } else {
        next[i] = { ...prev, selected };
        changed = true;
      }
    } else {
      next[i] = { ...d, selected };
      changed = true;
    }
  }

  if (!changed) {
    for (let i = 0; i < derived.length; i++) {
      if (current[i]?.id !== derived[i].id) {
        changed = true;
        break;
      }
    }
  }

  return changed ? next : current;
}
