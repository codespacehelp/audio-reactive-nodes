import type { ProjectSchema } from '../types/project';
import { buildAdjacency, topologicalSort } from '../graph/graph-model';
import { computeLiveNodes } from '../graph/liveness';
import { useRuntimeStore } from '../store/runtime-store';
import { getNodeDef } from '../nodes/registry';
import { compileExpression } from '../expression/compile';

/**
 * Recompute the live subgraph: find the 'out' node, compute liveness,
 * topologically sort, determine hasFrameDriven, and compile expressions.
 * Call this on project load and whenever connections change.
 *
 * Liveness is expanded beyond connection edges to include nodes referenced
 * by expressions (e.g. @channel_map1:low pulls in the entire audio chain).
 */
export function recomputeGraph(project: ProjectSchema) {
  const nodeIds = project.nodes.map((n) => n.id);
  const { forward, reverse } = buildAdjacency(nodeIds, project.connections);

  // Build name→id lookup for resolving expression refs
  const nameToId = new Map<string, string>();
  for (const node of project.nodes) {
    nameToId.set(node.name, node.id);
  }

  // Find the "out" node
  const outNode = project.nodes.find((n) => n.type === 'out');
  const live = outNode ? computeLiveNodes(outNode.id, reverse) : new Set<string>();

  // Expand live set by following expression dependencies.
  // Expressions like @channel_map1:low reference nodes by name; we resolve
  // the name to an ID and pull in that node plus all its upstream (via edges).
  const expressionQueue: string[] = [];
  for (const nodeId of live) {
    const nodeData = project.nodes.find((n) => n.id === nodeId);
    if (!nodeData) continue;
    collectExpressionDeps(nodeData, nameToId, live, expressionQueue);
  }
  // BFS: add expression-referenced nodes and their upstream
  while (expressionQueue.length > 0) {
    const depId = expressionQueue.pop()!;
    if (live.has(depId)) continue;
    // Add this node and all its upstream via connection edges
    const upstreamSet = computeLiveNodes(depId, reverse);
    for (const uid of upstreamSet) {
      if (!live.has(uid)) {
        live.add(uid);
        // Check if this newly-added node also has expression deps
        const nd = project.nodes.find((n) => n.id === uid);
        if (nd) collectExpressionDeps(nd, nameToId, live, expressionQueue);
      }
    }
  }

  // Filter to live nodes and sort.
  // Include synthetic edges for expression dependencies so that referenced
  // nodes are always evaluated before the nodes whose expressions use them.
  const liveIds = nodeIds.filter((id) => live.has(id));
  const liveConnections = project.connections.filter(
    (c) => live.has(c.fromNode) && live.has(c.toNode),
  );

  // Build synthetic connections for expression deps
  let syntheticId = 0;
  for (const nodeId of liveIds) {
    const nodeData = project.nodes.find((n) => n.id === nodeId);
    if (!nodeData) continue;
    for (const pv of Object.values(nodeData.params)) {
      const depIds = collectExpressionDepIds(pv, nameToId);
      for (const depId of depIds) {
        if (live.has(depId)) {
          liveConnections.push({
            id: `__expr_${syntheticId++}`,
            fromNode: depId,
            fromPort: '_expr',
            toNode: nodeId,
            toPort: '_expr',
          });
        }
      }
    }
  }

  const sortResult = topologicalSort(liveIds, liveConnections);

  const liveOrder = sortResult.ok ? sortResult.value : liveIds;

  // Determine if any live node needs per-frame evaluation
  const hasFrameDriven = liveOrder.some((id) => {
    const node = project.nodes.find((n) => n.id === id);
    if (!node) return false;
    const def = getNodeDef(node.type);
    return def?.needsFrame ?? false;
  });

  // Initialize runtime nodes for any new nodes
  const store = useRuntimeStore.getState();
  const currentNodes = { ...store.nodes };
  for (const id of nodeIds) {
    if (!currentNodes[id]) {
      currentNodes[id] = { outputs: {}, dirty: true, error: null, lastValidOutputs: null };
    }
  }
  // Remove nodes that no longer exist
  for (const id of Object.keys(currentNodes)) {
    if (!nodeIds.includes(id)) {
      delete currentNodes[id];
    }
  }

  // Compile expressions for all live nodes
  const expressions: Record<string, import('../types/runtime').CompiledExpression> = {};
  for (const nodeId of liveOrder) {
    const nodeData = project.nodes.find((n) => n.id === nodeId);
    if (!nodeData) continue;

    for (const [paramName, pv] of Object.entries(nodeData.params)) {
      if (pv.mode === 'expression' && typeof pv.value === 'string') {
        try {
          expressions[`${nodeId}:${paramName}`] = compileExpression(pv.value);
        } catch {
          // Invalid expression — skip, will be handled at eval time
        }
      }
      // Vec param components
      if (pv.value && typeof pv.value === 'object' && 'x' in pv.value) {
        const vec = pv.value as { x: { mode: string; value: unknown }; y: { mode: string; value: unknown }; z?: { mode: string; value: unknown } };
        for (const comp of ['x', 'y', 'z'] as const) {
          const cv = vec[comp];
          if (cv && cv.mode === 'expression' && typeof cv.value === 'string') {
            try {
              expressions[`${nodeId}:${paramName}.${comp}`] = compileExpression(cv.value as string);
            } catch {
              // skip
            }
          }
        }
      }
    }
  }

  // Mark all live nodes as dirty for full re-evaluation
  for (const id of liveOrder) {
    currentNodes[id] = { ...currentNodes[id], dirty: true };
  }

  useRuntimeStore.setState({
    nodes: currentNodes,
    liveOrder,
    hasFrameDriven,
    expressions,
  });
}

/**
 * Scan a node's params for expression-mode values, compile them to find deps,
 * resolve dep node names to IDs, and push any not-yet-live IDs onto the queue.
 */
function collectExpressionDeps(
  nodeData: ProjectSchema['nodes'][number],
  nameToId: Map<string, string>,
  live: Set<string>,
  queue: string[],
) {
  for (const pv of Object.values(nodeData.params)) {
    if (pv.mode === 'expression' && typeof pv.value === 'string' && pv.value.length > 0) {
      try {
        const compiled = compileExpression(pv.value);
        for (const dep of compiled.deps) {
          if (dep.node) {
            const depId = nameToId.get(dep.node);
            if (depId && !live.has(depId)) {
              queue.push(depId);
            }
          }
        }
      } catch {
        // Invalid expression — skip
      }
    }
    // Vec param components
    if (pv.value && typeof pv.value === 'object' && 'x' in pv.value) {
      const vec = pv.value as { x: { mode: string; value: unknown }; y: { mode: string; value: unknown }; z?: { mode: string; value: unknown } };
      for (const comp of ['x', 'y', 'z'] as const) {
        const cv = vec[comp];
        if (cv && cv.mode === 'expression' && typeof cv.value === 'string' && (cv.value as string).length > 0) {
          try {
            const compiled = compileExpression(cv.value as string);
            for (const dep of compiled.deps) {
              if (dep.node) {
                const depId = nameToId.get(dep.node);
                if (depId && !live.has(depId)) {
                  queue.push(depId);
                }
              }
            }
          } catch {
            // skip
          }
        }
      }
    }
  }
}

/**
 * Extract expression dep node IDs from a single param value.
 * Used to build synthetic sort edges.
 */
function collectExpressionDepIds(
  pv: { mode: string; value: unknown },
  nameToId: Map<string, string>,
): string[] {
  const ids: string[] = [];

  if (pv.mode === 'expression' && typeof pv.value === 'string' && pv.value.length > 0) {
    try {
      const compiled = compileExpression(pv.value);
      for (const dep of compiled.deps) {
        if (dep.node) {
          const depId = nameToId.get(dep.node);
          if (depId) ids.push(depId);
        }
      }
    } catch {
      // skip
    }
  }

  // Vec param components
  if (pv.value && typeof pv.value === 'object' && 'x' in (pv.value as Record<string, unknown>)) {
    const vec = pv.value as { x: { mode: string; value: unknown }; y: { mode: string; value: unknown }; z?: { mode: string; value: unknown } };
    for (const comp of ['x', 'y', 'z'] as const) {
      const cv = vec[comp];
      if (cv && cv.mode === 'expression' && typeof cv.value === 'string' && (cv.value as string).length > 0) {
        try {
          const compiled = compileExpression(cv.value as string);
          for (const dep of compiled.deps) {
            if (dep.node) {
              const depId = nameToId.get(dep.node);
              if (depId) ids.push(depId);
            }
          }
        } catch {
          // skip
        }
      }
    }
  }

  return ids;
}
