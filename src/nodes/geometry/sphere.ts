import type { NodeDef } from '../../types/node-def';
import * as THREE from 'three';

export const sphereDef: NodeDef = {
  type: 'sphere',
  category: 'geometry',
  inputs: [],
  outputs: [{ name: 'geometry', type: 'geometry' }],
  params: [
    { name: 'radius', type: 'float', default: 1, min: 0.01, max: 100, step: 0.1, expressionEnabled: true },
    { name: 'width_segments', type: 'int', default: 32, min: 3, max: 256 },
    { name: 'height_segments', type: 'int', default: 16, min: 2, max: 256 },
  ],
  evaluate: (ctx) => {
    const radius = ctx.params.radius as number;
    const widthSegments = ctx.params.width_segments as number;
    const heightSegments = ctx.params.height_segments as number;

    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
    mesh.name = ctx.nodeName;

    return { geometry: mesh };
  },
};
