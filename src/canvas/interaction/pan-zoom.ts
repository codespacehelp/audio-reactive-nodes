import { useProjectStore } from '../../store/project-store';
import { screenToWorld } from '../camera';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
/** Zoom per normalized scroll unit (~1 per wheel notch). 0.15 ≈ 16% per notch. */
const ZOOM_SPEED = 0.15;

/**
 * Attach pan (right-drag) and zoom (wheel) handlers to a container element.
 * Returns a cleanup function.
 */
export function attachPanZoom(container: HTMLElement): () => void {
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;

  function onMouseDown(e: MouseEvent) {
    // Right button (button 2) or middle button (button 1) for panning
    if (e.button === 2 || e.button === 1) {
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!isPanning) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const { viewport } = useProjectStore.getState();
    useProjectStore.getState().setViewport({
      ...viewport,
      panX: viewport.panX - dx / viewport.zoom,
      panY: viewport.panY - dy / viewport.zoom,
    });
  }

  function onMouseUp(e: MouseEvent) {
    if (e.button === 2 || e.button === 1) {
      isPanning = false;
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();

    const { viewport } = useProjectStore.getState();
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Zoom around cursor (Google Maps style: all scroll/pinch = zoom)
    const worldBefore = screenToWorld(screenX, screenY, viewport);

    // Normalize deltaY to ~1.0 per wheel notch regardless of deltaMode.
    // deltaMode 0 (pixels): browsers send ~100px per notch
    // deltaMode 1 (lines): browsers send ~3 lines per notch
    // deltaMode 2 (pages): rare, treat 1 page as 1 notch
    let normalizedDelta = e.deltaY;
    if (e.deltaMode === 0) normalizedDelta /= 100;
    else if (e.deltaMode === 1) normalizedDelta /= 3;

    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, viewport.zoom * Math.exp(-normalizedDelta * ZOOM_SPEED)),
    );

    // Adjust pan so the world point under cursor stays fixed
    const newPanX = worldBefore.x - screenX / newZoom;
    const newPanY = worldBefore.y - screenY / newZoom;

    useProjectStore.getState().setViewport({
      panX: newPanX,
      panY: newPanY,
      zoom: newZoom,
    });
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault(); // Prevent right-click menu
  }

  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('contextmenu', onContextMenu);

  return () => {
    container.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('contextmenu', onContextMenu);
  };
}
