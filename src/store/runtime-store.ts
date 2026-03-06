import { create } from 'zustand';
import type { RuntimeState, NodeRuntimeState, CompiledExpression } from '../types/runtime';

export interface RuntimeStore extends RuntimeState {
  /** Whether audio has been started by user gesture */
  audioStarted: boolean;
  /** Mark audio as started */
  setAudioStarted: () => void;
  /** Initialize runtime state for a set of node IDs */
  initNodes: (nodeIds: string[]) => void;
  /** Mark a node as dirty and propagate downstream */
  markDirty: (nodeId: string) => void;
  /** Mark all nodes dirty */
  markAllDirty: () => void;
  /** Set a node's output values */
  setOutputs: (nodeId: string, outputs: Record<string, unknown>) => void;
  /** Set a node's error */
  setError: (nodeId: string, error: string | null) => void;
  /** Clear dirty flag for a node */
  clearDirty: (nodeId: string) => void;
  /** Update live evaluation order */
  setLiveOrder: (order: string[], hasFrameDriven: boolean) => void;
  /** Store a compiled expression */
  setExpression: (key: string, expr: CompiledExpression) => void;
  /** Remove a compiled expression */
  removeExpression: (key: string) => void;
}

function createNodeRuntime(): NodeRuntimeState {
  return { outputs: {}, dirty: true, error: null, lastValidOutputs: null };
}

export const useRuntimeStore = create<RuntimeStore>()((set) => ({
  // State
  nodes: {},
  liveOrder: [],
  hasFrameDriven: false,
  expressions: {},
  audioStarted: false,

  // Actions
  setAudioStarted: () => set({ audioStarted: true }),
  initNodes: (nodeIds) =>
    set(() => {
      const nodes: Record<string, NodeRuntimeState> = {};
      for (const id of nodeIds) {
        nodes[id] = createNodeRuntime();
      }
      return { nodes };
    }),

  markDirty: (nodeId) =>
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node || node.dirty) return state;
      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, dirty: true },
        },
      };
    }),

  markAllDirty: () =>
    set((state) => {
      const nodes: Record<string, NodeRuntimeState> = {};
      for (const [id, node] of Object.entries(state.nodes)) {
        nodes[id] = node.dirty ? node : { ...node, dirty: true };
      }
      return { nodes };
    }),

  setOutputs: (nodeId, outputs) =>
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;
      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, outputs, lastValidOutputs: outputs, error: null },
        },
      };
    }),

  setError: (nodeId, error) =>
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;
      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, error },
        },
      };
    }),

  clearDirty: (nodeId) =>
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node || !node.dirty) return state;
      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, dirty: false },
        },
      };
    }),

  setLiveOrder: (order, hasFrameDriven) =>
    set({ liveOrder: order, hasFrameDriven }),

  setExpression: (key, expr) =>
    set((state) => ({
      expressions: { ...state.expressions, [key]: expr },
    })),

  removeExpression: (key) =>
    set((state) => {
      const { [key]: _, ...rest } = state.expressions;
      return { expressions: rest };
    }),
}));
