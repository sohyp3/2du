/**
 * Returns `next`, but keeps the previous object for every item that did not change
 * (and the previous array when nothing changed), so memoized rows skip re-rendering.
 */
export function reuseUnchanged<T extends { id: string }>(prev: T[], next: T[]): T[] {
  if (!prev.length) return next;
  const byId = new Map(prev.map((item) => [item.id, item]));
  let same = prev.length === next.length;
  const merged = next.map((item, i) => {
    const old = byId.get(item.id);
    if (old && shallowEqual(old, item)) {
      if (prev[i] !== old) same = false;
      return old;
    }
    same = false;
    return item;
  });
  return same ? prev : merged;
}

function shallowEqual(a: object, b: object) {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka)
    if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]) return false;
  return true;
}
