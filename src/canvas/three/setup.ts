import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

export interface CanvasContext {
  renderer: WebGPURenderer;
  camera: THREE.OrthographicCamera;
  scene: THREE.Scene;
}

/**
 * Initialize the Three.js WebGPU renderer with an orthographic camera.
 * Returns a promise because WebGPU renderer initialization is async.
 */
export async function initRenderer(canvas: HTMLCanvasElement): Promise<CanvasContext> {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height, false);
  renderer.setClearColor(new THREE.Color(0x18181b)); // zinc-900

  await renderer.init();

  // Orthographic camera: origin at top-left, y-down, 1 unit = 1 pixel at zoom 1
  const camera = new THREE.OrthographicCamera(0, width, 0, height, -1000, 1000);
  camera.position.z = 100;

  const scene = new THREE.Scene();

  return { renderer, camera, scene };
}

/**
 * Resize renderer and update camera frustum.
 */
export function resizeRenderer(ctx: CanvasContext, width: number, height: number) {
  ctx.renderer.setSize(width, height, false);
  ctx.camera.right = width;
  ctx.camera.bottom = height;
  ctx.camera.updateProjectionMatrix();
}
