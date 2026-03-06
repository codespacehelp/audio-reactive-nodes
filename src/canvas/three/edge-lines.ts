import * as THREE from 'three';
import type { NodeData, ConnectionData } from '../../types/project';
import type { PortType } from '../../types/common';
import { PORT_TYPE_COLORS, inputPortPosition, outputPortPosition } from '../layout';
import { getNodePorts } from '../port-info';

/** Number of line segments per bezier curve */
const BEZIER_SEGMENTS = 32;

/** Horizontal offset for bezier control points */
const BEZIER_OFFSET = 80;

// Cached materials per port type
const edgeMaterials = new Map<PortType, THREE.LineBasicMaterial>();
function getEdgeMaterial(portType: PortType): THREE.LineBasicMaterial {
  let mat = edgeMaterials.get(portType);
  if (!mat) {
    mat = new THREE.LineBasicMaterial({ color: PORT_TYPE_COLORS[portType] });
    edgeMaterials.set(portType, mat);
  }
  return mat;
}

/**
 * Manages rendering of connection edges between node ports.
 */
export class EdgeRenderer {
  private scene: THREE.Scene;
  private lines: Map<string, THREE.Line> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(nodes: NodeData[], connections: ConnectionData[]) {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const currentIds = new Set(connections.map((c) => c.id));

    // Remove stale edges
    for (const [id, line] of this.lines) {
      if (!currentIds.has(id)) {
        this.scene.remove(line);
        line.geometry.dispose();
        this.lines.delete(id);
      }
    }

    for (const conn of connections) {
      const fromNode = nodeMap.get(conn.fromNode);
      const toNode = nodeMap.get(conn.toNode);
      if (!fromNode || !toNode) continue;

      const fromPorts = getNodePorts(fromNode.type);
      const toPorts = getNodePorts(toNode.type);

      const fromIdx = fromPorts.outputs.findIndex((p) => p.name === conn.fromPort);
      const toIdx = toPorts.inputs.findIndex((p) => p.name === conn.toPort);
      if (fromIdx === -1 || toIdx === -1) continue;

      const fromPos = outputPortPosition(fromNode.position.x, fromNode.position.y, fromIdx);
      const toPos = inputPortPosition(toNode.position.x, toNode.position.y, toIdx);

      // Determine edge color from port type
      const portType = fromPorts.outputs[fromIdx].type;

      let line = this.lines.get(conn.id);
      if (!line) {
        const geometry = new THREE.BufferGeometry();
        line = new THREE.Line(geometry, getEdgeMaterial(portType));
        line.renderOrder = 0;
        this.scene.add(line);
        this.lines.set(conn.id, line);
      }

      // Build cubic bezier curve
      const positions = new Float32Array((BEZIER_SEGMENTS + 1) * 3);
      for (let i = 0; i <= BEZIER_SEGMENTS; i++) {
        const t = i / BEZIER_SEGMENTS;
        const { x, y } = cubicBezier(
          fromPos.x, fromPos.y,
          fromPos.x + BEZIER_OFFSET, fromPos.y,
          toPos.x - BEZIER_OFFSET, toPos.y,
          toPos.x, toPos.y,
          t,
        );
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0.5; // slightly above grid
      }

      line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }
  }

  dispose() {
    for (const [, line] of this.lines) {
      this.scene.remove(line);
      line.geometry.dispose();
    }
    this.lines.clear();
  }
}

/** Evaluate cubic bezier at parameter t */
function cubicBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t2 * t * x3,
    y: mt2 * mt * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t2 * t * y3,
  };
}
