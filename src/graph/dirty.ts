/**
 * Mark a node and all its downstream dependents as dirty.
 * Mutates the dirty record in place. Skips nodes already marked dirty.
 */
export function propagateDirty(
  nodeId: string,
  forward: Record<string, string[]>,
  dirty: Record<string, boolean>,
): void {
  const stack = [nodeId];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (dirty[id]) continue;
    dirty[id] = true;

    const downstream = forward[id];
    if (downstream) {
      for (const next of downstream) {
        if (!dirty[next]) {
          stack.push(next);
        }
      }
    }
  }
}
