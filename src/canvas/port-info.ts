import type { PortType } from '../types/common';

/** Minimal port definition for rendering (until full node registry exists) */
export interface PortInfo {
  name: string;
  type: PortType;
}

export interface NodePortDefs {
  inputs: PortInfo[];
  outputs: PortInfo[];
}

/** Node type → input/output port definitions */
const NODE_PORTS: Record<string, NodePortDefs> = {
  audio_in: {
    inputs: [],
    outputs: [{ name: 'audio', type: 'audio_stream' }],
  },
  audio_analyzer: {
    inputs: [{ name: 'audio', type: 'audio_stream' }],
    outputs: [{ name: 'channels', type: 'channel_set' }],
  },
  channel_rename: {
    inputs: [{ name: 'in', type: 'channel_set' }],
    outputs: [{ name: 'out', type: 'channel_set' }],
  },
  channel_lag: {
    inputs: [{ name: 'in', type: 'channel_set' }],
    outputs: [{ name: 'out', type: 'channel_set' }],
  },
  channel_map: {
    inputs: [{ name: 'in', type: 'channel_set' }],
    outputs: [{ name: 'out', type: 'channel_set' }],
  },
  sphere: {
    inputs: [],
    outputs: [{ name: 'geometry', type: 'geometry' }],
  },
  plane: {
    inputs: [],
    outputs: [{ name: 'geometry', type: 'geometry' }],
  },
  transform: {
    inputs: [{ name: 'in', type: 'geometry' }],
    outputs: [{ name: 'out', type: 'geometry' }],
  },
  geo_merge: {
    inputs: [
      { name: 'in1', type: 'geometry' },
      { name: 'in2', type: 'geometry' },
      { name: 'in3', type: 'geometry' },
      { name: 'in4', type: 'geometry' },
      { name: 'in5', type: 'geometry' },
    ],
    outputs: [{ name: 'out', type: 'geometry' }],
  },
  scene: {
    inputs: [{ name: 'geometry', type: 'geometry' }],
    outputs: [{ name: 'scene', type: 'scene' }],
  },
  materials: {
    inputs: [{ name: 'scene', type: 'scene' }],
    outputs: [{ name: 'out', type: 'scene' }],
  },
  out: {
    inputs: [{ name: 'scene', type: 'scene' }],
    outputs: [],
  },
};

const EMPTY_PORTS: NodePortDefs = { inputs: [], outputs: [] };

export function getNodePorts(nodeType: string): NodePortDefs {
  return NODE_PORTS[nodeType] ?? EMPTY_PORTS;
}
