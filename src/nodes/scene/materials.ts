import type { NodeDef } from '../../types/node-def';
import * as THREE from 'three';

export const materialsDef: NodeDef = {
  type: 'materials',
  category: 'scene',
  inputs: [{ name: 'scene', type: 'scene' }],
  outputs: [{ name: 'out', type: 'scene' }],
  params: [
    { name: 'target_name', type: 'string', default: '' },
    { name: 'material_mode', type: 'string', default: 'standard', options: ['standard', 'wireframe'] },
    { name: 'color', type: 'color', default: '#cc8844' },
    { name: 'roughness', type: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
    { name: 'metalness', type: 'float', default: 0.0, min: 0, max: 1, step: 0.01 },
  ],
  evaluate: (ctx) => {
    const inputScene = ctx.inputs.scene as THREE.Scene | null;
    if (!inputScene) return { out: null };

    const scene = inputScene.clone();
    const targetName = ctx.params.target_name as string;
    const materialMode = ctx.params.material_mode as string;
    const color = new THREE.Color(ctx.params.color as string);
    const roughness = ctx.params.roughness as number;
    const metalness = ctx.params.metalness as number;

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      wireframe: materialMode === 'wireframe',
    });

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (!targetName || obj.name === targetName) {
          obj.material = material;
        }
      }
    });

    return { out: scene };
  },
};
