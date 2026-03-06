import type { PortType, ParamType, NodeCategory } from './common';

export interface PortDef {
  name: string;
  type: PortType;
}

export interface ParamDef {
  name: string;
  type: ParamType;
  default: number | string | boolean;
  /** For enums: list of allowed values */
  options?: string[];
  /** Minimum value for numeric params */
  min?: number;
  /** Maximum value for numeric params */
  max?: number;
  /** Step for numeric input UI */
  step?: number;
  /** Whether expressions are supported (true for int, float, vec components) */
  expressionEnabled?: boolean;
}

/** Context passed to a node's evaluate function */
export interface EvaluateContext {
  /** Resolved input values keyed by port name */
  inputs: Record<string, unknown>;
  /** Resolved parameter values (after expression evaluation) */
  params: Record<string, unknown>;
  /** Current frame timestamp in seconds */
  time: number;
  /** Delta time since last frame in seconds */
  dt: number;
  /** Node's own name (for naming geometry outputs) */
  nodeName: string;
}

export interface NodeDef {
  type: string;
  category: NodeCategory;
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  /** If true, node re-evaluates every frame even when not dirty */
  needsFrame?: boolean;
  evaluate: (ctx: EvaluateContext) => Record<string, unknown>;
}
