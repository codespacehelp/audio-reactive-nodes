import { RingBuffer } from '../utils/ring-buffer';
import type { ChannelSet } from '../types/runtime';

/** 3 seconds at 60fps */
const HISTORY_LENGTH = 180;

/** Per-node preview data: channel name → ring buffer */
const previewData = new Map<string, Map<string, RingBuffer>>();

/** Colors for preview lines (up to 8 channels) */
export const PREVIEW_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#a855f7', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
];

/**
 * Record a frame's channel values for preview display.
 */
export function recordPreview(nodeId: string, channelSet: ChannelSet) {
  let nodeBuffers = previewData.get(nodeId);
  if (!nodeBuffers) {
    nodeBuffers = new Map();
    previewData.set(nodeId, nodeBuffers);
  }

  for (const [name, value] of Object.entries(channelSet.values)) {
    let buffer = nodeBuffers.get(name);
    if (!buffer) {
      buffer = new RingBuffer(HISTORY_LENGTH);
      nodeBuffers.set(name, buffer);
    }
    buffer.push(value);
  }
}

/**
 * Get preview data for a node.
 * Returns channel names and their ring buffers, or null if no data.
 */
export function getPreviewData(nodeId: string): Map<string, RingBuffer> | null {
  return previewData.get(nodeId) ?? null;
}
