import type { ParamMode } from './common';

/** Compiled expression stored in runtime */
export interface CompiledExpression {
  source: string;
  ast: unknown; // Typed properly in expression/types.ts
  deps: ExpressionDep[];
}

/** A dependency of an expression */
export interface ExpressionDep {
  /** 'node' for @nodeName:channel, 'param' for @:paramName */
  type: 'node' | 'param';
  /** Node name (for 'node' type) */
  nodeName?: string;
  /** Channel or parameter name */
  name: string;
}

/** Ring buffer for preview history */
export interface PreviewBuffer {
  /** Channel name → ring buffer of values */
  channels: Record<string, Float32Array>;
  /** Write head position */
  head: number;
  /** Total capacity (number of samples) */
  capacity: number;
}

/** Named set of scalar channels (runtime representation) */
export interface ChannelSet {
  values: Record<string, number>;
  preview?: PreviewBuffer;
}

/** Per-node runtime state */
export interface NodeRuntimeState {
  outputs: Record<string, unknown>;
  dirty: boolean;
  error: string | null;
  lastValidOutputs: Record<string, unknown> | null;
}

/** Global runtime state (separate from project state, not in undo) */
export interface RuntimeState {
  nodes: Record<string, NodeRuntimeState>;
  /** Topologically sorted live node IDs */
  liveOrder: string[];
  /** Whether any live node needs per-frame evaluation */
  hasFrameDriven: boolean;
  /** Compiled expressions keyed by "nodeId:paramName" or "nodeId:paramName.component" */
  expressions: Record<string, CompiledExpression>;
}
