import * as THREE from 'three';

/**
 * Renders a translucent selection rectangle in the scene.
 * Coordinates are in world space.
 */
export class SelectionBoxRenderer {
  private mesh: THREE.Mesh;
  private outline: THREE.LineSegments;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Translucent fill
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      opacity: 0.15,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const geometry = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.Mesh(geometry, fillMaterial);
    this.mesh.visible = false;
    this.mesh.renderOrder = 10;
    scene.add(this.mesh);

    // Border outline
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      opacity: 0.6,
      transparent: true,
    });
    const outlineGeo = new THREE.BufferGeometry();
    // 4 line segments forming a rectangle (8 vertices for LineSegments)
    outlineGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3),
    );
    this.outline = new THREE.LineSegments(outlineGeo, outlineMaterial);
    this.outline.visible = false;
    this.outline.renderOrder = 10;
    scene.add(this.outline);
  }

  /**
   * Show the selection box between two world-space corners.
   */
  show(x1: number, y1: number, x2: number, y2: number) {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    const w = maxX - minX;
    const h = maxY - minY;
    const cx = minX + w / 2;
    const cy = minY + h / 2;

    // Update fill quad
    this.mesh.position.set(cx, cy, 5);
    this.mesh.scale.set(w, h, 1);
    this.mesh.visible = true;

    // Update outline
    const positions = this.outline.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;
    const z = 5;
    // Top edge
    arr[0] = minX; arr[1] = minY; arr[2] = z;
    arr[3] = maxX; arr[4] = minY; arr[5] = z;
    // Right edge
    arr[6] = maxX; arr[7] = minY; arr[8] = z;
    arr[9] = maxX; arr[10] = maxY; arr[11] = z;
    // Bottom edge
    arr[12] = maxX; arr[13] = maxY; arr[14] = z;
    arr[15] = minX; arr[16] = maxY; arr[17] = z;
    // Left edge
    arr[18] = minX; arr[19] = maxY; arr[20] = z;
    arr[21] = minX; arr[22] = minY; arr[23] = z;
    positions.needsUpdate = true;
    this.outline.visible = true;
  }

  hide() {
    this.mesh.visible = false;
    this.outline.visible = false;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.outline);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.outline.geometry.dispose();
    (this.outline.material as THREE.Material).dispose();
  }
}
