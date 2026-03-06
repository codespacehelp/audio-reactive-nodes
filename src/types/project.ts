import type { ParamMode } from './common';

/** Serialized parameter value in project JSON */
export interface ParamValue {
  mode: ParamMode;
  value: number | string | boolean | ParamValueVec;
}

/** Per-component vec value (each component can independently be literal or expression) */
export interface ParamValueVec {
  x: { mode: ParamMode; value: number | string };
  y: { mode: ParamMode; value: number | string };
  z?: { mode: ParamMode; value: number | string };
}

export interface NodeData {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  params: Record<string, ParamValue>;
}

export interface ConnectionData {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

export interface ViewportData {
  panX: number;
  panY: number;
  zoom: number;
}

export interface ProjectSchema {
  schemaVersion: number;
  nodes: NodeData[];
  connections: ConnectionData[];
  viewport: ViewportData;
}
