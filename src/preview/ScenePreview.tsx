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
]);

/** Preview render resolution — match node body aspect ratio */
const BODY_WIDTH = NODE_WIDTH;
const BODY_HEIGHT = NODE_HEIGHT - NODE_HEADER_HEIGHT;
const PREVIEW_ASPECT = BODY_WIDTH / BODY_HEIGHT;
const PREVIEW_W = 200; // render width
const PREVIEW_H = Math.round(PREVIEW_W / PREVIEW_ASPECT); // render height (~92)

interface PreviewEntry {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  /** For geometry nodes: a small default scene with lights */
  defaultScene: THREE.Scene;
}

function createPreviewEntry(): PreviewEntry {
  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_W;
  canvas.height = PREVIEW_H;
  canvas.style.position = 'absolute';
  canvas.style.pointerEvents = 'none';
  canvas.style.borderRadius = '0 0 8px 8px';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(PREVIEW_W, PREVIEW_H);
  renderer.setPixelRatio(1); // keep low for perf

  const camera = new THREE.PerspectiveCamera(50, PREVIEW_ASPECT, 0.1, 100);
  camera.position.set(3, 2, 3);
  camera.lookAt(0, 0, 0);

  // Default scene for geometry-only nodes (no scene node upstream)
  const defaultScene = new THREE.Scene();
  defaultScene.background = new THREE.Color(0x1a1a2e);
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  defaultScene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 5, 5);
  defaultScene.add(dirLight);

  return { canvas, renderer, camera, defaultScene };
}

/**
 * DOM overlay rendering small 3D previews inside geometry/scene nodes.
 * Each visible node gets its own offscreen WebGLRenderer for isolation.
 */
export default function ScenePreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const entriesRef = useRef<Map<string, PreviewEntry>>(new Map());
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function update() {
      frameCountRef.current++;
      const { project, viewport } = useProjectStore.getState();
      if (!project || !container) {
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      const previewNodes = project.nodes.filter((n) => PREVIEW_NODE_TYPES.has(n.type));
      const currentIds = new Set(previewNodes.map((n) => n.id));

      // Remove stale entries
      for (const [id, entry] of entriesRef.current) {
        if (!currentIds.has(id)) {
          entry.renderer.dispose();
          if (container.contains(entry.canvas)) {
            container.removeChild(entry.canvas);
          }
          entriesRef.current.delete(id);
        }
      }

      // Hide all if zoomed out too far
      if (viewport.zoom < 0.4) {
        for (const [, entry] of entriesRef.current) {
          entry.canvas.style.display = 'none';
        }
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      // Throttle 3D rendering to every 3rd frame (~20fps) for performance
      const shouldRender3D = frameCountRef.current % 3 === 0;

      const runtimeNodes = useRuntimeStore.getState().nodes;
      const containerRect = container.getBoundingClientRect();

      for (const node of previewNodes) {
        let entry = entriesRef.current.get(node.id);
        if (!entry) {
          entry = createPreviewEntry();
          container.appendChild(entry.canvas);
          entriesRef.current.set(node.id, entry);
        }

        // Position below header
        const screenPos = worldToScreen(
          node.position.x,
          node.position.y + NODE_HEADER_HEIGHT,
          viewport,
        );
        const w = NODE_WIDTH * viewport.zoom;
        const h = (NODE_HEIGHT - NODE_HEADER_HEIGHT) * viewport.zoom;

        // Viewport culling: skip if node is off-screen
        const offScreen =
          screenPos.x + w < 0 ||
          screenPos.x > containerRect.width ||
          screenPos.y + h < 0 ||
          screenPos.y > containerRect.height;

        if (offScreen) {
          entry.canvas.style.display = 'none';
          continue;
        }

        entry.canvas.style.left = `${screenPos.x}px`;
        entry.canvas.style.top = `${screenPos.y}px`;
        entry.canvas.style.width = `${w}px`;
        entry.canvas.style.height = `${h}px`;
        entry.canvas.style.display = '';

        // Only render 3D on throttled frames
        if (!shouldRender3D) continue;

        // Get node's output
        const runtimeNode = runtimeNodes[node.id];
        if (!runtimeNode) continue;

        const outputs = runtimeNode.outputs;
        const sceneOutput = outputs.scene;
        // Geometry nodes may output as 'geometry' or 'out'
        const geoOutput = outputs.geometry ?? outputs.out;

        if (sceneOutput instanceof THREE.Scene) {
          // Scene node: render its scene directly
          const scene = sceneOutput;
          if (scene.userData.cameraPos) {
            entry.camera.position.copy(scene.userData.cameraPos);
          }
          if (scene.userData.cameraTarget) {
            entry.camera.lookAt(scene.userData.cameraTarget);
          }
          entry.renderer.render(scene, entry.camera);
        } else if (geoOutput instanceof THREE.Object3D) {
          // Geometry node: put mesh into default scene and render
          // Clear previous geometry children (keep lights at index 0,1)
          while (entry.defaultScene.children.length > 2) {
            entry.defaultScene.remove(entry.defaultScene.children[2]);
          }
          const clone = geoOutput.clone();
          entry.defaultScene.add(clone);

          // Auto-fit camera based on bounding box
          const box = new THREE.Box3().setFromObject(clone);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const dist = maxDim * 1.8;
          entry.camera.position.set(
            center.x + dist * 0.6,
            center.y + dist * 0.5,
            center.z + dist * 0.6,
          );
          entry.camera.lookAt(center);

          entry.renderer.render(entry.defaultScene, entry.camera);
        }
      }

      rafRef.current = requestAnimationFrame(update);
    }

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const [, entry] of entriesRef.current) {
        entry.renderer.dispose();
        if (container.contains(entry.canvas)) {
          container.removeChild(entry.canvas);
        }
      }
      entriesRef.current.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}
