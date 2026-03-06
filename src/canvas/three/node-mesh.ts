import * as THREE from 'three';
const { DoubleSide } = THREE;
import type { NodeData } from '../../types/project';
import type { NodeCategory } from '../../types/common';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_HEADER_HEIGHT,
  NODE_CORNER_RADIUS,
  CATEGORY_COLORS,
  CATEGORY_HEADER_COLORS,
  SELECTION_COLOR,
} from '../layout';

/** Map node type → category (until full registry exists) */
const TYPE_CATEGORY: Record<string, NodeCategory> = {
  audio_in: 'audio',
  audio_analyzer: 'channels',
  channel_rename: 'channels',
  channel_lag: 'channels',
  channel_map: 'channels',
  sphere: 'geometry',
  plane: 'geometry',
  transform: 'geometry',
  geo_merge: 'geometry',
  scene: 'scene',
  materials: 'scene',
  out: 'scene',
};

function getCategoryForType(nodeType: string): NodeCategory {
  return TYPE_CATEGORY[nodeType] ?? 'scene';
}

/** Create a rounded rectangle shape */
function roundedRectShape(
  w: number,
  h: number,
  r: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(r, 0);
  shape.lineTo(w - r, 0);
  shape.quadraticCurveTo(w, 0, w, r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(r, h);
  shape.quadraticCurveTo(0, h, 0, h - r);
  shape.lineTo(0, r);
  shape.quadraticCurveTo(0, 0, r, 0);
  return shape;
}

/** Create a rounded-top-only rectangle for the header */
function roundedTopRectShape(
  w: number,
  h: number,
  r: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(r, 0);
  shape.lineTo(w - r, 0);
  shape.quadraticCurveTo(w, 0, w, r);
  shape.lineTo(w, h);
  shape.lineTo(0, h);
  shape.lineTo(0, r);
  shape.quadraticCurveTo(0, 0, r, 0);
  return shape;
}

interface NodeMeshGroup {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  headerMesh: THREE.Mesh;
  selectionOutline: THREE.LineSegments;
}

// Shared geometries (created once, reused)
let bodyGeometry: THREE.ShapeGeometry | null = null;
let headerGeometry: THREE.ShapeGeometry | null = null;
let outlineGeometry: THREE.BufferGeometry | null = null;

function getBodyGeometry(): THREE.ShapeGeometry {
  if (!bodyGeometry) {
    const shape = roundedRectShape(NODE_WIDTH, NODE_HEIGHT, NODE_CORNER_RADIUS);
    bodyGeometry = new THREE.ShapeGeometry(shape);
  }
  return bodyGeometry;
}

function getHeaderGeometry(): THREE.ShapeGeometry {
  if (!headerGeometry) {
    const shape = roundedTopRectShape(NODE_WIDTH, NODE_HEADER_HEIGHT, NODE_CORNER_RADIUS);
    headerGeometry = new THREE.ShapeGeometry(shape);
  }
  return headerGeometry;
}

function getOutlineGeometry(): THREE.BufferGeometry {
  if (!outlineGeometry) {
    // Outline as a line loop around the node boundary (with margin for the selection border)
    const m = 2; // margin
    const r = NODE_CORNER_RADIUS + m;
    const w = NODE_WIDTH + m * 2;
    const h = NODE_HEIGHT + m * 2;
    const segments = 8; // per corner

    const points: number[] = [];

    function addCornerArc(cx: number, cy: number, startAngle: number) {
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (Math.PI / 2) * (i / segments);
        points.push(cx + Math.cos(angle) * r);
        points.push(cy + Math.sin(angle) * r);
        points.push(0);
      }
    }

    // Top-left corner
    addCornerArc(r - m, r - m, Math.PI);
    // Top-right corner
    addCornerArc(w - r - m, r - m, -Math.PI / 2);
    // Bottom-right corner
    addCornerArc(w - r - m, h - r - m, 0);
    // Bottom-left corner
    addCornerArc(r - m, h - r - m, Math.PI / 2);

    // Close the loop by connecting back to start
    points.push(points[0], points[1], points[2]);

    // Convert to line segments (pairs of consecutive points)
    const linePoints: number[] = [];
    const totalPts = points.length / 3;
    for (let i = 0; i < totalPts - 1; i++) {
      linePoints.push(points[i * 3], points[i * 3 + 1], points[i * 3 + 2]);
      linePoints.push(points[(i + 1) * 3], points[(i + 1) * 3 + 1], points[(i + 1) * 3 + 2]);
    }

    outlineGeometry = new THREE.BufferGeometry();
    outlineGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePoints, 3),
    );
  }
  return outlineGeometry;
}

/**
 * Manages rendering of all node body quads in the scene.
 */
export class NodeRenderer {
  private scene: THREE.Scene;
  private meshes: Map<string, NodeMeshGroup> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Sync mesh state with current node data + selection.
   * Optional errors map highlights nodes with runtime errors.
   */
  update(nodes: NodeData[], selectedIds: Set<string>, errors?: Record<string, string | null>) {
    const currentIds = new Set(nodes.map((n) => n.id));

    // Remove meshes for deleted nodes
    for (const [id, meshGroup] of this.meshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(meshGroup.group);
        this.meshes.delete(id);
      }
    }

    // Update or create meshes
    for (const node of nodes) {
      let meshGroup = this.meshes.get(node.id);

      if (!meshGroup) {
        meshGroup = this.createNodeMesh(node);
        this.meshes.set(node.id, meshGroup);
        this.scene.add(meshGroup.group);
      }

      // Update position (y is flipped: Three.js shape draws downward from origin which works with our top-left y-down camera)
      meshGroup.group.position.set(node.position.x, node.position.y, 0);

      // Update selection outline visibility
      meshGroup.selectionOutline.visible = selectedIds.has(node.id);

      // Update error tint
      const hasError = errors && errors[node.id];
      const bodyMat = meshGroup.bodyMesh.material as THREE.MeshBasicMaterial;
      const category = getCategoryForType(node.type);
      if (hasError) {
        bodyMat.color.setHex(0x6e1d1d); // dark red tint
      } else if (bodyMat.color.getHex() === 0x6e1d1d) {
        bodyMat.color.setHex(CATEGORY_COLORS[category]);
      }
    }
  }

  private createNodeMesh(node: NodeData): NodeMeshGroup {
    const category = getCategoryForType(node.type);
    const group = new THREE.Group();

    // Body
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: CATEGORY_COLORS[category],
      side: DoubleSide,
    });
    const bodyMesh = new THREE.Mesh(getBodyGeometry(), bodyMaterial);
    bodyMesh.renderOrder = 1;
    group.add(bodyMesh);

    // Header
    const headerMaterial = new THREE.MeshBasicMaterial({
      color: CATEGORY_HEADER_COLORS[category],
      side: DoubleSide,
    });
    const headerMesh = new THREE.Mesh(getHeaderGeometry(), headerMaterial);
    headerMesh.renderOrder = 2;
    group.add(headerMesh);

    // Selection outline
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: SELECTION_COLOR,
    });
    const selectionOutline = new THREE.LineSegments(getOutlineGeometry(), outlineMaterial);
    selectionOutline.visible = false;
    selectionOutline.renderOrder = 3;
    group.add(selectionOutline);

    return { group, bodyMesh, headerMesh, selectionOutline };
  }

  dispose() {
    for (const [, meshGroup] of this.meshes) {
      this.scene.remove(meshGroup.group);
      (meshGroup.bodyMesh.material as THREE.Material).dispose();
      (meshGroup.headerMesh.material as THREE.Material).dispose();
      (meshGroup.selectionOutline.material as THREE.Material).dispose();
    }
    this.meshes.clear();
  }
}
