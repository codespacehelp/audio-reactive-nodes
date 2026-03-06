import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
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

    // Enter fullscreen
    container.requestFullscreen().catch(() => {
      // Fullscreen may be blocked — still render inline
    });

    // Render loop
    function render() {
      const runtime = useRuntimeStore.getState();

      // Find the out node and get its scene
      for (const [, nodeState] of Object.entries(runtime.nodes)) {
        const sceneOutput = nodeState.outputs.scene;
        if (sceneOutput instanceof THREE.Scene) {
          const scene = sceneOutput;

          // Read camera config from scene userData
          if (scene.userData.cameraPos) {
            camera.position.copy(scene.userData.cameraPos);
          }
          if (scene.userData.cameraTarget) {
            camera.lookAt(scene.userData.cameraTarget);
          }

          renderer.render(scene, camera);
          break;
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
      className="fixed inset-0 z-50 bg-black"
    />
  );
}
