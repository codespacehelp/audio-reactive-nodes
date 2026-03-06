import type { ConnectionData } from '../types/project';
import type { Result } from '../schema/validate';

export interface AdjacencyMaps {
  /** nodeId → list of downstream nodeIds */
  forward: Record<string, string[]>;
  /** nodeId → list of upstream nodeIds */
  reverse: Record<string, string[]>;
}

/**
 * Build forward and reverse adjacency maps from connections.
 * Every nodeId gets an entry even if it has no connections.
 */
export function buildAdjacency(nodeIds: string[], connections: ConnectionData[]): AdjacencyMaps {
  const forward: Record<string, string[]> = {};
  const reverse: Record<string, string[]> = {};

  for (const id of nodeIds) {
    forward[id] = [];
    reverse[id] = [];
  }

  for (const conn of connections) {
    forward[conn.fromNode].push(conn.toNode);
    reverse[conn.toNode].push(conn.fromNode);
  }

  return { forward, reverse };
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns sorted node IDs or an error if a cycle is detected.
 */
export function topologicalSort(
  nodeIds: string[],
  connections: ConnectionData[],
): Result<string[], string> {
  const { forward } = buildAdjacency(nodeIds, connections);

  // Count incoming edges per node
  const inDegree: Record<string, number> = {};
  for (const id of nodeIds) {
    inDegree[id] = 0;
  }
  for (const conn of connections) {
    inDegree[conn.toNode]++;
  }

  // Start with nodes that have no incoming edges
  const queue: string[] = [];
  for (const id of nodeIds) {
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    for (const downstream of forward[node]) {
      inDegree[downstream]--;
      if (inDegree[downstream] === 0) {
        queue.push(downstream);
      }
    }
  }

  if (sorted.length !== nodeIds.length) {
    return { ok: false, error: 'Graph contains a cycle' };
  }

  return { ok: true, value: sorted };
}
