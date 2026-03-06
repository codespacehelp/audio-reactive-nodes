import type { NodeCategory, PortType } from '../types/common';

/** Node dimensions in world units (1 unit = 1 pixel at zoom 1) */
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 120;
export const NODE_HEADER_HEIGHT = 28;
export const NODE_CORNER_RADIUS = 8;
export const PORT_RADIUS = 6;
export const PORT_SPACING = 24;
export const PORT_MARGIN_TOP = 16; // from top of body area (below header)

/** Category → body color (hex) */
export const CATEGORY_COLORS: Record<NodeCategory, number> = {
  audio: 0x4a1d6e, // purple
  channels: 0x1d4a6e, // blue
  geometry: 0x1d6e4a, // green
  scene: 0x6e4a1d, // orange-brown
};

/** Category → header color (slightly lighter) */
export const CATEGORY_HEADER_COLORS: Record<NodeCategory, number> = {
  audio: 0x5c2d80,
  channels: 0x2d5c80,
  geometry: 0x2d805c,
  scene: 0x805c2d,
};

/** Port type → color (hex) */
export const PORT_TYPE_COLORS: Record<PortType, number> = {
  audio_stream: 0xa855f7, // purple
  channel_set: 0x3b82f6, // blue
  geometry: 0x22c55e, // green
  scene: 0xf97316, // orange
};

/** Selection highlight color */
export const SELECTION_COLOR = 0xf97316; // orange-500

/**
 * Compute Y position for a port on a node.
 * Index 0 is the first port.
 */
export function portY(portIndex: number): number {
  return NODE_HEADER_HEIGHT + PORT_MARGIN_TOP + portIndex * PORT_SPACING;
}

/**
 * Compute world position of an input port (left side of node).
 */
export function inputPortPosition(
  nodeX: number,
  nodeY: number,
  portIndex: number,
): { x: number; y: number } {
  return { x: nodeX, y: nodeY + portY(portIndex) };
}

/**
 * Compute world position of an output port (right side of node).
 */
export function outputPortPosition(
  nodeX: number,
  nodeY: number,
  portIndex: number,
): { x: number; y: number } {
  return { x: nodeX + NODE_WIDTH, y: nodeY + portY(portIndex) };
}
