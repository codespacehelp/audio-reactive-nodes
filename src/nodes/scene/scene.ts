import type { NodeDef } from '../../types/node-def';
import * as THREE from 'three';

export const sceneDef: NodeDef = {
  type: 'scene',
  category: 'scene',
  inputs: [{ name: 'geometry', type: 'geometry' }],
  outputs: [{ name: 'scene', type: 'scene' }],
  params: [
    { name: 'camera_pos_x', type: 'float', default: 3, expressionEnabled: true },
    { name: 'camera_pos_y', type: 'float', default: 3, expressionEnabled: true },
    { name: 'camera_pos_z', type: 'float', default: 3, expressionEnabled: true },
    { name: 'camera_target_x', type: 'float', default: 0, expressionEnabled: true },
    { name: 'camera_target_y', type: 'float', default: 0, expressionEnabled: true },
    { name: 'camera_target_z', type: 'float', default: 0, expressionEnabled: true },
    { name: 'ambient_color', type: 'color', default: '#ffffff' },
    { name: 'ambient_intensity', type: 'float', default: 0.4, min: 0, max: 5, step: 0.1, expressionEnabled: true },
    { name: 'dir_color', type: 'color', default: '#ffffff' },
    { name: 'dir_intensity', type: 'float', default: 0.8, min: 0, max: 5, step: 0.1, expressionEnabled: true },
    { name: 'dir_pos_x', type: 'float', default: 5, expressionEnabled: true },
    { name: 'dir_pos_y', type: 'float', default: 5, expressionEnabled: true },
    { name: 'dir_pos_z', type: 'float', default: 5, expressionEnabled: true },
    { name: 'background_color', type: 'color', default: '#1a1a2e' },
  ],
  evaluate: (ctx) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(ctx.params.background_color as string);

    // Add geometry
    const geometry = ctx.inputs.geometry as THREE.Object3D | null;
    if (geometry) {
      scene.add(geometry.clone());
    }

    // Ambient light
    const ambient = new THREE.AmbientLight(
      new THREE.Color(ctx.params.ambient_color as string),
      ctx.params.ambient_intensity as number,
    );
    scene.add(ambient);

    // Directional light
    const dirLight = new THREE.DirectionalLight(
      new THREE.Color(ctx.params.dir_color as string),
      ctx.params.dir_intensity as number,
    );
    dirLight.position.set(
      ctx.params.dir_pos_x as number,
      ctx.params.dir_pos_y as number,
      ctx.params.dir_pos_z as number,
    );
    scene.add(dirLight);

    // Camera config (stored as userData for rendering)
    scene.userData.cameraPos = new THREE.Vector3(
      ctx.params.camera_pos_x as number,
      ctx.params.camera_pos_y as number,
      ctx.params.camera_pos_z as number,
    );
    scene.userData.cameraTarget = new THREE.Vector3(
      ctx.params.camera_target_x as number,
      ctx.params.camera_target_y as number,
      ctx.params.camera_target_z as number,
    );

    return { scene };
  },
};
