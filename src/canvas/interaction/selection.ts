import { useProjectStore } from '../../store/project-store';
import { screenToWorld } from '../camera';
import { hitTestNode } from './hit-test';

/** Minimum pixel movement to count as a drag rather than a click */
const DRAG_THRESHOLD = 4;

export interface DragState {
  /** Node being dragged (null = no drag or box select) */
  draggingNodeId: string | null;
  /** Whether a drag has been initiated (past threshold) */
  isDragging: boolean;
  /** Start screen position */
  startScreenX: number;
  startScreenY: number;
  /** Last screen position (for computing deltas) */
  lastScreenX: number;
  lastScreenY: number;
  /** Whether undo was pushed for this drag */
  undoPushed: boolean;
}

let dragState: DragState | null = null;

/**
 * Attach left-click selection and drag handlers to a container element.
 * Returns a cleanup function.
 */
export function attachSelection(container: HTMLElement): () => void {
  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // Left click only

    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const { viewport, project } = useProjectStore.getState();
    if (!project) return;

    const world = screenToWorld(screenX, screenY, viewport);
    const hitId = hitTestNode(world.x, world.y, project.nodes);

    dragState = {
      draggingNodeId: hitId,
      isDragging: false,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      lastScreenX: e.clientX,
      lastScreenY: e.clientY,
      undoPushed: false,
    };

    // Immediate selection feedback
    if (hitId) {
      const { selectedNodeIds } = useProjectStore.getState();
      if (e.shiftKey) {
        // Shift-click: toggle additive
        useProjectStore.getState().selectNode(hitId, true);
      } else if (!selectedNodeIds.has(hitId)) {
        // Click unselected node: select it exclusively
        useProjectStore.getState().selectNode(hitId, false);
      }
      // If already selected (without shift), don't deselect yet — might be drag start
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragState) return;

    const dx = e.clientX - dragState.startScreenX;
    const dy = e.clientY - dragState.startScreenY;

    if (!dragState.isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      dragState.isDragging = true;

      // Push undo before first drag movement
      if (dragState.draggingNodeId && !dragState.undoPushed) {
        useProjectStore.getState().pushUndo();
        dragState.undoPushed = true;
      }
    }

    if (dragState.isDragging && dragState.draggingNodeId) {
      const { viewport, selectedNodeIds } = useProjectStore.getState();
      const moveDx = (e.clientX - dragState.lastScreenX) / viewport.zoom;
      const moveDy = (e.clientY - dragState.lastScreenY) / viewport.zoom;

      // Move all selected nodes
      const { project } = useProjectStore.getState();
      if (project) {
        for (const nodeId of selectedNodeIds) {
          const node = project.nodes.find((n) => n.id === nodeId);
          if (node) {
            useProjectStore.getState().setNodePosition(
              nodeId,
              node.position.x + moveDx,
              node.position.y + moveDy,
            );
          }
        }
      }
    }

    dragState.lastScreenX = e.clientX;
    dragState.lastScreenY = e.clientY;
  }

  function onMouseUp(e: MouseEvent) {
    if (e.button !== 0 || !dragState) {
      dragState = null;
      return;
    }

    if (!dragState.isDragging) {
      // This was a click (not a drag)
      if (!dragState.draggingNodeId) {
        // Clicked empty space: deselect all
        useProjectStore.getState().clearSelection();
      }
      // If clicked a node, selection was already handled in mouseDown
    }

    dragState = null;
  }

  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return () => {
    container.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    dragState = null;
  };
}
