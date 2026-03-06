import * as THREE from 'three';
import type { ViewportData } from '../../types/project';

const GRID_COLOR = new THREE.Color(0x27272a); // zinc-800
const GRID_COLOR_MAJOR = new THREE.Color(0x3f3f46); // zinc-700

/**
 * Manages the background grid, rebuilding geometry when the viewport changes.
 */
export class GridRenderer {
  private lines: THREE.LineSegments;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private majorLines: THREE.LineSegments;
  private majorGeometry: THREE.BufferGeometry;
  private majorMaterial: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.LineBasicMaterial({ color: GRID_COLOR });
    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.renderOrder = -2;

    this.majorGeometry = new THREE.BufferGeometry();
    this.majorMaterial = new THREE.LineBasicMaterial({ color: GRID_COLOR_MAJOR });
    this.majorLines = new THREE.LineSegments(this.majorGeometry, this.majorMaterial);
    this.majorLines.renderOrder = -1;

    scene.add(this.lines);
    scene.add(this.majorLines);
  }

  update(viewport: ViewportData, screenWidth: number, screenHeight: number) {
    const { panX, panY, zoom } = viewport;

    // Choose grid spacing based on zoom
    const baseSpacing = this.computeSpacing(zoom);
    const majorSpacing = baseSpacing * 5;

    const worldLeft = panX;
    const worldRight = panX + screenWidth / zoom;
    const worldTop = panY;
    const worldBottom = panY + screenHeight / zoom;

    // Add margin so lines don't pop in at edges
    const margin = baseSpacing * 2;

    this.buildLines(
      this.geometry,
      baseSpacing,
      worldLeft - margin,
      worldRight + margin,
      worldTop - margin,
      worldBottom + margin,
    );

    this.buildLines(
      this.majorGeometry,
      majorSpacing,
      worldLeft - margin,
      worldRight + margin,
      worldTop - margin,
      worldBottom + margin,
    );
  }

  private computeSpacing(zoom: number): number {
    // Target ~50 pixels between minor grid lines on screen
    const targetScreenPixels = 50;
    const rawSpacing = targetScreenPixels / zoom;

    // Snap to a nice round number: 10, 25, 50, 100, 250, 500, ...
    const niceSteps = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    for (const step of niceSteps) {
      if (step >= rawSpacing) return step;
    }
    return niceSteps[niceSteps.length - 1];
  }

  private buildLines(
    geometry: THREE.BufferGeometry,
    spacing: number,
    left: number,
    right: number,
    top: number,
    bottom: number,
  ) {
    const firstX = Math.floor(left / spacing) * spacing;
    const lastX = Math.ceil(right / spacing) * spacing;
    const firstY = Math.floor(top / spacing) * spacing;
    const lastY = Math.ceil(bottom / spacing) * spacing;

    const verticalCount = Math.round((lastX - firstX) / spacing) + 1;
    const horizontalCount = Math.round((lastY - firstY) / spacing) + 1;
    const totalVerts = (verticalCount + horizontalCount) * 2;

    const positions = new Float32Array(totalVerts * 3);
    let i = 0;

    // Vertical lines
    for (let x = firstX; x <= lastX; x += spacing) {
      positions[i++] = x;
      positions[i++] = top;
      positions[i++] = 0;
      positions[i++] = x;
      positions[i++] = bottom;
      positions[i++] = 0;
    }

    // Horizontal lines
    for (let y = firstY; y <= lastY; y += spacing) {
      positions[i++] = left;
      positions[i++] = y;
      positions[i++] = 0;
      positions[i++] = right;
      positions[i++] = y;
      positions[i++] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, i), 3));
    geometry.setDrawRange(0, i / 3);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.majorGeometry.dispose();
    this.majorMaterial.dispose();
  }
}
