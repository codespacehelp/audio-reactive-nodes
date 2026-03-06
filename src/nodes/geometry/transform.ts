import type { NodeDef } from '../../types/node-def';
import * as THREE from 'three';

export const transformDef: NodeDef = {
  type: 'transform',
  category: 'geometry',
  inputs: [{ name: 'in', type: 'geometry' }],
  outputs: [{ name: 'out', type: 'geometry' }],
  params: [
    { name: 'translate_x', type: 'float', default: 0, expressionEnabled: true },
    { name: 'translate_y', type: 'float', default: 0, expressionEnabled: true },
    { name: 'translate_z', type: 'float', default: 0, expressionEnabled: true },
    { name: 'rotate_x', type: 'float', default: 0, expressionEnabled: true },
    { name: 'rotate_y', type: 'float', default: 0, expressionEnabled: true },
    { name: 'rotate_z', type: 'float', default: 0, expressionEnabled: true },
    { name: 'scale_x', type: 'float', default: 1, expressionEnabled: true },
    { name: 'scale_y', type: 'float', default: 1, expressionEnabled: true },
    { name: 'scale_z', type: 'float', default: 1, expressionEnabled: true },
    { name: 'uniform_scale', type: 'float', default: 1, min: 0.001, expressionEnabled: true },
    { name: 'transform_order', type: 'string', default: 'TRS', options: ['TRS', 'TSR', 'RTS', 'RST', 'STR', 'SRT'] },
  ],
  evaluate: (ctx) => {
    const inputMesh = ctx.inputs.in as THREE.Mesh | null;
    if (!inputMesh) return { out: null };

    // Clone the mesh to avoid mutating upstream
    const mesh = inputMesh.clone();

    const tx = ctx.params.translate_x as number;
    const ty = ctx.params.translate_y as number;
    const tz = ctx.params.translate_z as number;
    const rx = ctx.params.rotate_x as number;
    const ry = ctx.params.rotate_y as number;
    const rz = ctx.params.rotate_z as number;
    const sx = ctx.params.scale_x as number;
    const sy = ctx.params.scale_y as number;
    const sz = ctx.params.scale_z as number;
    const uniformScale = ctx.params.uniform_scale as number;

    mesh.position.set(tx, ty, tz);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(sx * uniformScale, sy * uniformScale, sz * uniformScale);

    return { out: mesh };
  },
};
