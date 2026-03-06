import type { NodeDef, EvaluateContext } from '../types/node-def';
import type { NodeData, ConnectionData, ParamValue, ParamValueVec } from '../types/project';
import type { RuntimeState, NodeRuntimeState } from '../types/runtime';
import { evaluate as evalExpr } from '../expression/interpreter';
import type { ASTNode } from '../expression/types';

/**
 * Evaluate the live subgraph in topological order.
 * Returns a new RuntimeState with updated outputs, errors, and dirty flags.
 */
export function evaluateGraph(
  nodes: NodeData[],
  connections: ConnectionData[],
  defs: Record<string, NodeDef>,
  runtime: RuntimeState,
  time: number,
  dt: number,
): RuntimeState {
  // Build lookup maps
  const nodeById = new Map<string, NodeData>();
  const nameToId = new Map<string, string>();
  for (const n of nodes) {
    nodeById.set(n.id, n);
    nameToId.set(n.name, n.id);
  }

  // Build input map: toNode:toPort → { fromNode, fromPort }
  const inputMap = new Map<string, { fromNode: string; fromPort: string }>();
  for (const c of connections) {
    inputMap.set(`${c.toNode}:${c.toPort}`, { fromNode: c.fromNode, fromPort: c.fromPort });
  }

  // Clone runtime nodes for mutation
  const newNodes: Record<string, NodeRuntimeState> = {};
  for (const [id, node] of Object.entries(runtime.nodes)) {
    newNodes[id] = { ...node };
  }

  // Track which nodes were evaluated this frame so downstream nodes know to re-run
  const evaluatedThisFrame = new Set<string>();

  // Walk live nodes in topological order
  for (const nodeId of runtime.liveOrder) {
    const nodeData = nodeById.get(nodeId);
    if (!nodeData) continue;

    const def = defs[nodeData.type];
    if (!def) continue;

    const nodeRuntime = newNodes[nodeId];

    // Check if any upstream node (via connection or expression) was just evaluated
    let hasUpstreamChanged = def.inputs.some((inputDef) => {
      const key = `${nodeId}:${inputDef.name}`;
      const source = inputMap.get(key);
      return source ? evaluatedThisFrame.has(source.fromNode) : false;
    });

    // Also check expression dependencies — if a referenced node was re-evaluated,
    // this node's expression params may produce different values
    if (!hasUpstreamChanged) {
      for (const [exprKey, compiled] of Object.entries(runtime.expressions)) {
        if (!exprKey.startsWith(nodeId + ':')) continue;
        for (const dep of compiled.deps) {
          if (dep.node) {
            // Resolve node name → id
            const depId = nameToId.get(dep.node);
            if (depId && evaluatedThisFrame.has(depId)) {
              hasUpstreamChanged = true;
              break;
            }
          }
        }
        if (hasUpstreamChanged) break;
      }
    }

    // Skip clean nodes unless needsFrame or an upstream changed
    if (!nodeRuntime.dirty && !def.needsFrame && !hasUpstreamChanged) {
      continue;
    }

    // Resolve inputs from upstream outputs
    const inputs: Record<string, unknown> = {};
    for (const inputDef of def.inputs) {
      const key = `${nodeId}:${inputDef.name}`;
      const source = inputMap.get(key);
      if (source) {
        const upstreamOutputs = newNodes[source.fromNode]?.outputs;
        inputs[inputDef.name] = upstreamOutputs?.[source.fromPort] ?? null;
      } else {
        inputs[inputDef.name] = null;
      }
    }

    // Resolve params (literal or expression)
    const params: Record<string, unknown> = {};
    for (const paramDef of def.params) {
      const paramValue = nodeData.params[paramDef.name];
      if (!paramValue) {
        params[paramDef.name] = paramDef.default;
        continue;
      }
      params[paramDef.name] = resolveParam(
        paramValue,
        paramDef.type,
        nodeId,
        paramDef.name,
        runtime,
        newNodes,
        nodeById,
      );
    }

    // Evaluate node
    const ctx: EvaluateContext = {
      inputs,
      params,
      time,
      dt,
      nodeName: nodeData.name,
    };

    try {
      const outputs = def.evaluate(ctx);
      newNodes[nodeId] = {
        outputs,
        dirty: false,
        error: null,
        lastValidOutputs: outputs,
      };
      evaluatedThisFrame.add(nodeId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      newNodes[nodeId] = {
        ...nodeRuntime,
        dirty: false,
        error: errorMsg,
        outputs: nodeRuntime.lastValidOutputs ?? {},
      };
      evaluatedThisFrame.add(nodeId);
    }
  }

  return {
    ...runtime,
    nodes: newNodes,
  };
}

/**
 * Resolve a single parameter value: literal returns as-is, expression evaluates the AST.
 */
function resolveParam(
  pv: ParamValue,
  paramType: string,
  nodeId: string,
  paramName: string,
  runtime: RuntimeState,
  currentOutputs: Record<string, NodeRuntimeState>,
  nodeById: Map<string, NodeData>,
): unknown {
  if (paramType === 'vec2' || paramType === 'vec3') {
    return resolveVecParam(pv, nodeId, paramName, runtime, currentOutputs, nodeById);
  }

  if (pv.mode === 'expression' && typeof pv.value === 'string') {
    const exprKey = `${nodeId}:${paramName}`;
    const compiled = runtime.expressions[exprKey];
    if (compiled) {
      return evalExpr(compiled.ast as ASTNode, (refNode, refName) => {
        return resolveRef(refNode, refName, nodeId, currentOutputs, nodeById);
      });
    }
    // Expression not compiled — fall back to 0
    return 0;
  }

  return pv.value;
}

/**
 * Resolve a vec2/vec3 parameter with per-component expression support.
 */
function resolveVecParam(
  pv: ParamValue,
  nodeId: string,
  paramName: string,
  runtime: RuntimeState,
  currentOutputs: Record<string, NodeRuntimeState>,
  nodeById: Map<string, NodeData>,
): Record<string, number> {
  const vec = pv.value as ParamValueVec;
  const result: Record<string, number> = {};

  const components = ['x', 'y', ...(vec.z !== undefined ? ['z'] : [])];
  for (const comp of components) {
    const cv = vec[comp as keyof ParamValueVec];
    if (!cv || typeof cv === 'number') {
      result[comp] = typeof cv === 'number' ? cv : 0;
      continue;
    }

    if (cv.mode === 'expression' && typeof cv.value === 'string') {
      const exprKey = `${nodeId}:${paramName}.${comp}`;
      const compiled = runtime.expressions[exprKey];
      if (compiled) {
        result[comp] = evalExpr(compiled.ast as ASTNode, (refNode, refName) => {
          return resolveRef(refNode, refName, nodeId, currentOutputs, nodeById);
        });
      } else {
        result[comp] = 0;
      }
    } else {
      result[comp] = typeof cv.value === 'number' ? cv.value : 0;
    }
  }

  return result;
}

/**
 * Resolve a reference: @nodeName:channel looks up the named node's output,
 * @:paramName looks up the current node's own param (for same-node refs).
 */
function resolveRef(
  refNode: string,
  refName: string,
  currentNodeId: string,
  currentOutputs: Record<string, NodeRuntimeState>,
  nodeById: Map<string, NodeData>,
): number {
  if (refNode === '') {
    // Same-node param ref — look up the current node's other params
    // For simplicity, look at the node's current outputs
    const outputs = currentOutputs[currentNodeId]?.outputs;
    if (outputs && refName in outputs) {
      return Number(outputs[refName]) || 0;
    }
    return 0;
  }

  // Cross-node ref: find node by name, then look up its output
  for (const [id, nodeData] of nodeById) {
    if (nodeData.name === refNode) {
      const outputs = currentOutputs[id]?.outputs;
      if (!outputs) return 0;

      // Direct output key match (e.g. @scene1:scene)
      if (refName in outputs) {
        const val = outputs[refName];
        if (typeof val === 'number') return val;
        // ChannelSet: look for value in channels
        if (val && typeof val === 'object' && 'values' in (val as Record<string, unknown>)) {
          const channelSet = val as { values: Record<string, number> };
          return channelSet.values[refName] ?? 0;
        }
        return 0;
      }

      // No direct key match — search all outputs for ChannelSets containing refName
      // This handles @channel_map1:low where output key is "out" but "low" is in out.values
      for (const val of Object.values(outputs)) {
        if (val && typeof val === 'object' && 'values' in (val as Record<string, unknown>)) {
          const channelSet = val as { values: Record<string, number> };
          if (refName in channelSet.values) {
            return channelSet.values[refName];
          }
        }
      }
      return 0;
    }
  }

  return 0;
}
