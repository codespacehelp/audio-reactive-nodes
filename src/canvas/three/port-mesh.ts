import * as THREE from 'three';
import type { NodeData } from '../../types/project';
import type { PortType } from '../../types/common';
import { PORT_RADIUS, PORT_TYPE_COLORS, inputPortPosition, outputPortPosition } from '../layout';
import { getNodePorts } from '../port-info';

// Shared circle geometry
let circleGeometry: THREE.CircleGeometry | null = null;
function getCircleGeometry(): THREE.CircleGeometry {
  if (!circleGeometry) {
    circleGeometry = new THREE.CircleGeometry(PORT_RADIUS, 16);
  }
  return circleGeometry;
}

// Cached materials per port type
const portMaterials = new Map<PortType, THREE.MeshBasicMaterial>();
function getPortMaterial(portType: PortType): THREE.MeshBasicMaterial {
  let mat = portMaterials.get(portType);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color: PORT_TYPE_COLORS[portType], side: THREE.DoubleSide });
    portMaterials.set(portType, mat);
  }
  return mat;
}

/**
 * Manages rendering of port circles on nodes.
 */
export class PortRenderer {
  private scene: THREE.Scene;
  /** nodeId → array of port meshes */
  private meshes: Map<string, THREE.Mesh[]> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(nodes: NodeData[]) {
    const currentIds = new Set(nodes.map((n) => n.id));

    // Remove meshes for deleted nodes
    for (const [id, portMeshes] of this.meshes) {
      if (!currentIds.has(id)) {
        for (const m of portMeshes) this.scene.remove(m);
        this.meshes.delete(id);
      }
    }

    for (const node of nodes) {
      let portMeshes = this.meshes.get(node.id);
      const ports = getNodePorts(node.type);

      if (!portMeshes) {
        portMeshes = [];

        // Input ports (left side)
        for (let i = 0; i < ports.inputs.length; i++) {
          const mesh = new THREE.Mesh(getCircleGeometry(), getPortMaterial(ports.inputs[i].type));
          mesh.renderOrder = 4;
          this.scene.add(mesh);
          portMeshes.push(mesh);
        }

        // Output ports (right side)
        for (let i = 0; i < ports.outputs.length; i++) {
          const mesh = new THREE.Mesh(getCircleGeometry(), getPortMaterial(ports.outputs[i].type));
          mesh.renderOrder = 4;
          this.scene.add(mesh);
          portMeshes.push(mesh);
        }

        this.meshes.set(node.id, portMeshes);
      }

      // Update positions
      let meshIdx = 0;
      for (let i = 0; i < ports.inputs.length; i++) {
        const pos = inputPortPosition(node.position.x, node.position.y, i);
        portMeshes[meshIdx].position.set(pos.x, pos.y, 1);
        meshIdx++;
      }
      for (let i = 0; i < ports.outputs.length; i++) {
        const pos = outputPortPosition(node.position.x, node.position.y, i);
        portMeshes[meshIdx].position.set(pos.x, pos.y, 1);
        meshIdx++;
      }
    }
  }

  dispose() {
    for (const [, portMeshes] of this.meshes) {
      for (const m of portMeshes) this.scene.remove(m);
    }
    this.meshes.clear();
  }
}
