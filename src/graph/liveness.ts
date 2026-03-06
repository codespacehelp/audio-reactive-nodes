/**
 * Compute the set of live nodes by walking backwards from the out node.
 * Only nodes reachable from outNodeId are considered live (need evaluation).
 */
export function computeLiveNodes(
  outNodeId: string,
  reverse: Record<string, string[]>,
): Set<string> {
  const live = new Set<string>();

  if (!(outNodeId in reverse)) return live;

  const stack = [outNodeId];
  while (stack.length > 0) {
    const nodeId = stack.pop()!;
    if (live.has(nodeId)) continue;
    live.add(nodeId);

    for (const upstream of reverse[nodeId]) {
      if (!live.has(upstream)) {
        stack.push(upstream);
      }
    }
  }

  return live;
}
