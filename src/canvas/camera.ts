import type { OrthographicCamera } from 'three';
import type { ViewportData } from '../types/project';

/**
 * Update the orthographic camera to reflect viewport pan/zoom.
 * The camera frustum maps world-space coordinates onto the screen.
 * At zoom=1, 1 world unit = 1 pixel.
 */
export function updateCamera(
  camera: OrthographicCamera,
  viewport: ViewportData,
  screenWidth: number,
  screenHeight: number,
) {
  const { panX, panY, zoom } = viewport;
  camera.left = panX;
  camera.right = panX + screenWidth / zoom;
  camera.top = panY;
  camera.bottom = panY + screenHeight / zoom;
  camera.updateProjectionMatrix();
}

/**
 * Convert screen (pixel) coordinates to world coordinates.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: ViewportData,
): { x: number; y: number } {
  return {
    x: screenX / viewport.zoom + viewport.panX,
    y: screenY / viewport.zoom + viewport.panY,
  };
}

/**
 * Convert world coordinates to screen (pixel) coordinates.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ViewportData,
): { x: number; y: number } {
  return {
    x: (worldX - viewport.panX) * viewport.zoom,
    y: (worldY - viewport.panY) * viewport.zoom,
  };
}
