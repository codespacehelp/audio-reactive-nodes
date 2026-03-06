import type { NodeDef } from '../../types/node-def';
import * as THREE from 'three';

export const geoMergeDef: NodeDef = {
  type: 'geo_merge',
  category: 'geometry',
  inputs: [
    { name: 'in1', type: 'geometry' },
    { name: 'in2', type: 'geometry' },
    { name: 'in3', type: 'geometry' },
    { name: 'in4', type: 'geometry' },
    { name: 'in5', type: 'geometry' },
  ],
  outputs: [{ name: 'out', type: 'geometry' }],
  params: [],
  evaluate: (ctx) => {
    const group = new THREE.Group();
    group.name = ctx.nodeName;

    for (let i = 1; i <= 5; i++) {
      const mesh = ctx.inputs[`in${i}`] as THREE.Object3D | null;
      if (mesh) {
        group.add(mesh.clone());
      }
    }

    return { out: group };
  },
};
