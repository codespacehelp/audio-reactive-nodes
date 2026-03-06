import type { NodeDef } from '../../types/node-def';
import * as THREE from 'three';

export const planeDef: NodeDef = {
  type: 'plane',
  category: 'geometry',
  inputs: [],
  outputs: [{ name: 'geometry', type: 'geometry' }],
  params: [
    { name: 'size_x', type: 'float', default: 10, min: 0.01, max: 1000, step: 0.1, expressionEnabled: true },
    { name: 'size_y', type: 'float', default: 10, min: 0.01, max: 1000, step: 0.1, expressionEnabled: true },
    { name: 'rows', type: 'int', default: 1, min: 1, max: 256 },
    { name: 'columns', type: 'int', default: 1, min: 1, max: 256 },
    { name: 'orientation', type: 'string', default: 'xz', options: ['xy', 'xz', 'yz'] },
  ],
  evaluate: (ctx) => {
    const sizeX = ctx.params.size_x as number;
    const sizeY = ctx.params.size_y as number;
    const rows = ctx.params.rows as number;
    const columns = ctx.params.columns as number;
    const orientation = ctx.params.orientation as string;

    const geo = new THREE.PlaneGeometry(sizeX, sizeY, columns, rows);

    // Rotate based on orientation
    if (orientation === 'xz') {
      geo.rotateX(-Math.PI / 2);
    } else if (orientation === 'yz') {
      geo.rotateY(Math.PI / 2);
    }
    // xy is default, no rotation needed

    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
    mesh.name = ctx.nodeName;

    return { geometry: mesh };
  },
};
