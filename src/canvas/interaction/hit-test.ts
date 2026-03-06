import type { NodeData } from '../../types/project';
import { NODE_WIDTH, NODE_HEIGHT } from '../layout';

/**
 * Find the topmost node at a given world position.
 * Nodes later in the array are considered "on top".
 * Returns the node ID or null.
 */
export function hitTestNode(
  worldX: number,
  worldY: number,
  nodes: NodeData[],
): string | null {
  // Iterate in reverse so topmost (last rendered) is hit first
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const { x, y } = node.position;
    if (
      worldX >= x &&
      worldX <= x + NODE_WIDTH &&
      worldY >= y &&
      worldY <= y + NODE_HEIGHT
    ) {
      return node.id;
    }
  }
  return null;
}
