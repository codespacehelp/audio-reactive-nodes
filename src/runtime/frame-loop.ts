import { useProjectStore } from '../store/project-store';
import { useRuntimeStore } from '../store/runtime-store';
import { evaluateGraph } from './evaluator';
import { getNodeDefs } from '../nodes/registry';
import { recordPreview } from '../preview/preview-manager';
import type { ChannelSet } from '../types/runtime';

let running = false;
let rafId = 0;
let lastTime = 0;

/**
 * Start the evaluation frame loop.
 * Each frame: if any node is dirty or hasFrameDriven, re-evaluate the graph.
 */
export function startFrameLoop() {
  if (running) return;
  running = true;
  lastTime = performance.now() / 1000;
  tick();
}

export function stopFrameLoop() {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function tick() {
  if (!running) return;

  const now = performance.now() / 1000;
  const dt = now - lastTime;
  lastTime = now;

  const project = useProjectStore.getState().project;
  const runtime = useRuntimeStore.getState();

  if (project && runtime.liveOrder.length > 0) {
    // Check if evaluation is needed
    const hasDirty = runtime.liveOrder.some((id) => runtime.nodes[id]?.dirty);

    if (hasDirty || runtime.hasFrameDriven) {
      const defs = getNodeDefs();
      const newRuntime = evaluateGraph(
        project.nodes,
        project.connections,
        defs,
        runtime,
        now,
        dt,
      );

      // Record channel previews
      for (const node of project.nodes) {
        const nodeState = newRuntime.nodes[node.id];
        if (!nodeState) continue;
        // Check for channel_set outputs
        for (const val of Object.values(nodeState.outputs)) {
          if (val && typeof val === 'object' && 'values' in (val as Record<string, unknown>)) {
            recordPreview(node.id, val as ChannelSet);
          }
        }
      }

      // Batch-update the runtime store
      useRuntimeStore.setState({
        nodes: newRuntime.nodes,
      });
    }
  }

  rafId = requestAnimationFrame(tick);
}
