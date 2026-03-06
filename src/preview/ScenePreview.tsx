import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../store/project-store';
import { useRuntimeStore } from '../store/runtime-store';
import { worldToScreen } from '../canvas/camera';
import { NODE_WIDTH, NODE_HEIGHT, NODE_HEADER_HEIGHT } from '../canvas/layout';

/** Node types that output geometry or scene and should show 3D previews */
const PREVIEW_NODE_TYPES = new Set([
  'sphere',
  'plane',
  'transform',
  'geo_merge',
  'scene',
  'materials',
  'out',
]);

/** Preview render resolution — match node body aspect ratio */
const BODY_WIDTH = NODE_WIDTH;
const BODY_HEIGHT = NODE_HEIGHT - NODE_HEADER_HEIGHT;
const PREVIEW_ASPECT = BODY_WIDTH / BODY_HEIGHT;
const PREVIEW_W = 200;
const PREVIEW_H = Math.round(PREVIEW_W / PREVIEW_ASPECT);

/** Per-node display state (2D canvas for blitting) */
interface DisplayEntry {
  canvas: HTMLCanvasElement;
  ctx2d: CanvasRenderingContext2D;
}

/**
 * DOM overlay rendering small 3D previews inside geometry/scene nodes.
 * Uses a SINGLE shared WebGLRenderer to avoid hitting the browser's
 * WebGL context limit (~8 in Chrome). Each node's preview is rendered
 * to the shared renderer, then blitted to a per-node 2D canvas.
 */
export default function ScenePreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const displaysRef = useRef<Map<string, DisplayEntry>>(new Map());
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const defaultSceneRef = useRef<THREE.Scene | null>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Single shared offscreen WebGL renderer
    const offscreen = document.createElement('canvas');
    offscreen.width = PREVIEW_W;
    offscreen.height = PREVIEW_H;
    const renderer = new THREE.WebGLRenderer({ canvas: offscreen, antialias: true, alpha: false });
    renderer.setSize(PREVIEW_W, PREVIEW_H);
    renderer.setPixelRatio(1);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(50, PREVIEW_ASPECT, 0.1, 100);
    camera.position.set(3, 2, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Default scene with lights for geometry-only nodes
    const defaultScene = new THREE.Scene();
    defaultScene.background = new THREE.Color(0x1a1a2e);
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    defaultScene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    defaultScene.add(dirLight);
    defaultSceneRef.current = defaultScene;

    function update() {
      frameCountRef.current++;
      const { project, viewport } = useProjectStore.getState();
      if (!project || !container) {
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      const previewNodes = project.nodes.filter((n) => PREVIEW_NODE_TYPES.has(n.type));
      const currentIds = new Set(previewNodes.map((n) => n.id));

      // Remove stale display canvases
      for (const [id, display] of displaysRef.current) {
        if (!currentIds.has(id)) {
          if (container.contains(display.canvas)) {
            container.removeChild(display.canvas);
          }
          displaysRef.current.delete(id);
        }
      }

      // Hide all if zoomed out too far
      if (viewport.zoom < 0.4) {
        for (const [, display] of displaysRef.current) {
          display.canvas.style.display = 'none';
        }
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      // Throttle 3D rendering to every 3rd frame (~20fps) for performance
      const shouldRender3D = frameCountRef.current % 3 === 0;

      const runtimeNodes = useRuntimeStore.getState().nodes;
      const containerRect = container.getBoundingClientRect();

      for (const node of previewNodes) {
        let display = displaysRef.current.get(node.id);
        if (!display) {
          const canvas = document.createElement('canvas');
          canvas.width = PREVIEW_W;
          canvas.height = PREVIEW_H;
          canvas.style.position = 'absolute';
          canvas.style.pointerEvents = 'none';
          canvas.style.borderRadius = '0 0 8px 8px';
          const ctx2d = canvas.getContext('2d');
          if (!ctx2d) continue;
          container.appendChild(canvas);
          display = { canvas, ctx2d };
          displaysRef.current.set(node.id, display);
        }

        // Position below header
        const screenPos = worldToScreen(
          node.position.x,
          node.position.y + NODE_HEADER_HEIGHT,
          viewport,
        );
        const w = NODE_WIDTH * viewport.zoom;
        const h = (NODE_HEIGHT - NODE_HEADER_HEIGHT) * viewport.zoom;

        // Viewport culling
        const offScreen =
          screenPos.x + w < 0 ||
          screenPos.x > containerRect.width ||
          screenPos.y + h < 0 ||
          screenPos.y > containerRect.height;

        if (offScreen) {
          display.canvas.style.display = 'none';
          continue;
        }

        display.canvas.style.left = `${screenPos.x}px`;
        display.canvas.style.top = `${screenPos.y}px`;
        display.canvas.style.width = `${w}px`;
        display.canvas.style.height = `${h}px`;
        display.canvas.style.display = '';

        // Only render 3D on throttled frames
        if (!shouldRender3D) continue;

        const runtimeNode = runtimeNodes[node.id];
        if (!runtimeNode) continue;

        const outputs = runtimeNode.outputs;
        const sceneOutput = outputs.scene;
        const geoOutput = outputs.geometry ?? outputs.out;

        // Clear default scene (keep lights at index 0,1)
        while (defaultScene.children.length > 2) {
          defaultScene.remove(defaultScene.children[2]);
        }

        let rendered = false;

        if (sceneOutput instanceof THREE.Scene) {
          // Scene/out node: clone children into our default scene
          const clonedChildren = [...sceneOutput.children];
          for (const child of clonedChildren) {
            defaultScene.add(child.clone());
          }
          if (sceneOutput.background) {
            defaultScene.background = sceneOutput.background;
          }
          if (sceneOutput.userData.cameraPos) {
            const p = sceneOutput.userData.cameraPos;
            camera.position.set(p.x, p.y, p.z);
          }
          if (sceneOutput.userData.cameraTarget) {
            const t = sceneOutput.userData.cameraTarget;
            camera.lookAt(t.x, t.y, t.z);
          }
          renderer.render(defaultScene, camera);
          rendered = true;
        } else if (geoOutput instanceof THREE.Object3D) {
          // Geometry/materials node: clone into default scene
          const clone = geoOutput.clone();
          defaultScene.add(clone);

          // Reset background
          defaultScene.background = new THREE.Color(0x1a1a2e);

          // Auto-fit camera
          const box = new THREE.Box3().setFromObject(clone);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const dist = maxDim * 1.8;
          camera.position.set(
            center.x + dist * 0.6,
            center.y + dist * 0.5,
            center.z + dist * 0.6,
          );
          camera.lookAt(center);
          renderer.render(defaultScene, camera);
          rendered = true;
        }

        // Blit from shared WebGL canvas to this node's 2D canvas
        if (rendered) {
          display.ctx2d.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
          display.ctx2d.drawImage(offscreen, 0, 0);
        }
      }

      rafRef.current = requestAnimationFrame(update);
    }

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      for (const [, display] of displaysRef.current) {
        if (container.contains(display.canvas)) {
          container.removeChild(display.canvas);
        }
      }
      displaysRef.current.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}
