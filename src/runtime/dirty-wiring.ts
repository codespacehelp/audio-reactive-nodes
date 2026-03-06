import { useProjectStore } from '../store/project-store';
import { useRuntimeStore } from '../store/runtime-store';
import { buildAdjacency } from '../graph/graph-model';
import { propagateDirty } from '../graph/dirty';
import { compileExpression } from '../expression/compile';

/**
 * Mark a node and all its downstream dependents as dirty.
 * Also recompiles any expression params for the changed node.
 * Call this when a node's parameters change.
 */
export function markNodeAndDownstreamDirty(nodeId: string) {
  const project = useProjectStore.getState().project;
  if (!project) return;

  const nodeIds = project.nodes.map((n) => n.id);
  const { forward } = buildAdjacency(nodeIds, project.connections);

  const runtimeState = useRuntimeStore.getState();
  const dirty: Record<string, boolean> = {};
  for (const id of nodeIds) {
    dirty[id] = runtimeState.nodes[id]?.dirty ?? false;
  }

  propagateDirty(nodeId, forward, dirty);

  // Apply dirty flags
  const newNodes = { ...runtimeState.nodes };
  for (const [id, isDirty] of Object.entries(dirty)) {
    if (isDirty && newNodes[id] && !newNodes[id].dirty) {
      newNodes[id] = { ...newNodes[id], dirty: true };
    }
  }

  // Recompile expressions for the changed node
  const nodeData = project.nodes.find((n) => n.id === nodeId);
  const newExpressions = { ...runtimeState.expressions };
  if (nodeData) {
    for (const [paramName, pv] of Object.entries(nodeData.params)) {
      const key = `${nodeId}:${paramName}`;
      if (pv.mode === 'expression' && typeof pv.value === 'string' && pv.value.length > 0) {
        try {
          newExpressions[key] = compileExpression(pv.value);
        } catch {
          // Invalid expression — remove compiled version so evaluator falls back
          delete newExpressions[key];
        }
      } else {
        // Not an expression anymore — clean up
        delete newExpressions[key];
      }
    }
  }

  useRuntimeStore.setState({ nodes: newNodes, expressions: newExpressions });
}
