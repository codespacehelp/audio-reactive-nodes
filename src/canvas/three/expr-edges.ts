import * as THREE from 'three';
import type { NodeData } from '../../types/project';
import type { CompiledExpression } from '../../types/runtime';
import { NODE_WIDTH, NODE_HEIGHT } from '../layout';

const BEZIER_SEGMENTS = 32;
const BEZIER_OFFSET = 80;

/** Dashed amber material for expression edges */
const exprMaterial = new THREE.LineDashedMaterial({
  color: 0xf59e0b,
  dashSize: 6,
  gapSize: 4,
  linewidth: 1,
});

/**
 * Renders dashed lines for cross-node expression references.
 * These show which nodes feed into expressions on other nodes.
 */
export class ExprEdgeRenderer {
  private scene: THREE.Scene;
  private lines: THREE.Line[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(
    nodes: NodeData[],
    expressions: Record<string, CompiledExpression>,
  ) {
    // Remove old lines
    for (const line of this.lines) {
      this.scene.remove(line);
      line.geometry.dispose();
    }
    this.lines = [];

    const nodeByName = new Map<string, NodeData>();
    const nodeById = new Map<string, NodeData>();
    for (const n of nodes) {
      nodeByName.set(n.name, n);
      nodeById.set(n.id, n);
    }

    // Collect unique expression edges: sourceNodeId → targetNodeId
    const edges = new Set<string>();

    for (const [key, expr] of Object.entries(expressions)) {
      // key format: "nodeId:paramName" or "nodeId:paramName.component"
      const colonIdx = key.indexOf(':');
      const targetNodeId = key.slice(0, colonIdx);
      const targetNode = nodeById.get(targetNodeId);
      if (!targetNode) continue;

      for (const dep of expr.deps) {
        if (dep.node === '') continue; // same-node ref
        const sourceNode = nodeByName.get(dep.node);
        if (!sourceNode || sourceNode.id === targetNodeId) continue;

        const edgeKey = `${sourceNode.id}→${targetNodeId}`;
        if (edges.has(edgeKey)) continue;
        edges.add(edgeKey);

        // Draw dashed bezier from source right-center to target left-center
        const fromX = sourceNode.position.x + NODE_WIDTH;
        const fromY = sourceNode.position.y + NODE_HEIGHT / 2;
        const toX = targetNode.position.x;
        const toY = targetNode.position.y + NODE_HEIGHT / 2;

        const positions = new Float32Array((BEZIER_SEGMENTS + 1) * 3);
        for (let i = 0; i <= BEZIER_SEGMENTS; i++) {
          const t = i / BEZIER_SEGMENTS;
          const mt = 1 - t;
          const mt2 = mt * mt;
          const t2 = t * t;
          const cx1 = fromX + BEZIER_OFFSET;
          const cx2 = toX - BEZIER_OFFSET;
          positions[i * 3] = mt2 * mt * fromX + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t2 * t * toX;
          positions[i * 3 + 1] = mt2 * mt * fromY + 3 * mt2 * t * fromY + 3 * mt * t2 * toY + t2 * t * toY;
          positions[i * 3 + 2] = 0.8; // above regular edges
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const line = new THREE.Line(geometry, exprMaterial);
        line.computeLineDistances(); // Required for dashed lines
        line.renderOrder = 1;
        this.scene.add(line);
        this.lines.push(line);
      }
    }
  }

  dispose() {
    for (const line of this.lines) {
      this.scene.remove(line);
      line.geometry.dispose();
    }
    this.lines = [];
  }
}
