import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../store/project-store';
import { useRuntimeStore } from '../store/runtime-store';

interface PresentModeProps {
  onExit: () => void;
}

export default function PresentMode({ onExit }: PresentModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number>(0);

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onExit();
  }, [onExit]);

  // Request fullscreen on first click inside the overlay.
  // useEffect breaks the user gesture chain, so we use an onClick handler
  // on the container div to satisfy the browser's gesture requirement.
  const hasRequestedFullscreen = useRef(false);
  const handleClick = useCallback(() => {
    const container = containerRef.current;
    if (container && !hasRequestedFullscreen.current && !document.fullscreenElement) {
      hasRequestedFullscreen.current = true;
      container.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create WebGL renderer for present mode
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    // Render loop
    function render() {
      const runtime = useRuntimeStore.getState();

      // Find the out node's scene specifically
      const project = useProjectStore.getState().project;
      const outNode = project?.nodes.find((n) => n.type === 'out');
      if (outNode) {
        const nodeState = runtime.nodes[outNode.id];
        const sceneOutput = nodeState?.outputs.scene;
        if (sceneOutput instanceof THREE.Scene) {
          // Read camera config from scene userData
          // Use .set() instead of .copy()/.lookAt(vec) because cloned scenes
          // may have plain {x,y,z} objects (from JSON.parse) instead of Vector3
          if (sceneOutput.userData.cameraPos) {
            const p = sceneOutput.userData.cameraPos;
            camera.position.set(p.x, p.y, p.z);
          }
          if (sceneOutput.userData.cameraTarget) {
            const t = sceneOutput.userData.cameraTarget;
            camera.lookAt(t.x, t.y, t.z);
          }

          renderer.render(sceneOutput, camera);
        }
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);

    // Handle resize
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    // Handle ESC and fullscreen exit
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleExit();
      }
    }
    window.addEventListener('keydown', onKeyDown);

    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        handleExit();
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [handleExit]);

  return (
    <div
      ref={containerRef}
      data-testid="present-overlay"
      className="fixed inset-0 z-50 bg-black cursor-pointer"
      onClick={handleClick}
    />
  );
}
