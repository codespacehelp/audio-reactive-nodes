import { useProjectStore } from '../../store/project-store';
import { screenToWorld } from '../camera';
import { hitTestNode } from './hit-test';
import { NODE_WIDTH, NODE_HEIGHT } from '../layout';
import type { SelectionBoxRenderer } from '../three/selection-box';

/** Minimum pixel movement to count as a drag rather than a click */
const DRAG_THRESHOLD = 4;

export interface DragState {
  /** Node being dragged (null = empty space → box select) */
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
 * Pass a SelectionBoxRenderer to enable rubber-band multi-select.
 * Returns a cleanup function.
 */
export function attachSelection(
  container: HTMLElement,
  selectionBox?: SelectionBoxRenderer,
): () => void {
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

      // Push undo before first drag movement (node drag only)
      if (dragState.draggingNodeId && !dragState.undoPushed) {
        useProjectStore.getState().pushUndo();
        dragState.undoPushed = true;
      }
    }

    if (dragState.isDragging) {
      if (dragState.draggingNodeId) {
        // --- Node dragging ---
        const { viewport, selectedNodeIds } = useProjectStore.getState();
        const moveDx = (e.clientX - dragState.lastScreenX) / viewport.zoom;
        const moveDy = (e.clientY - dragState.lastScreenY) / viewport.zoom;

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
      } else if (selectionBox) {
        // --- Box select ---
        const rect = container.getBoundingClientRect();
        const { viewport } = useProjectStore.getState();
        const startWorld = screenToWorld(
          dragState.startScreenX - rect.left,
          dragState.startScreenY - rect.top,
          viewport,
        );
        const currentWorld = screenToWorld(
          e.clientX - rect.left,
          e.clientY - rect.top,
          viewport,
        );
        selectionBox.show(startWorld.x, startWorld.y, currentWorld.x, currentWorld.y);

        // Live selection update: select nodes that intersect the box
        const { project } = useProjectStore.getState();
        if (project) {
          const boxMinX = Math.min(startWorld.x, currentWorld.x);
          const boxMinY = Math.min(startWorld.y, currentWorld.y);
          const boxMaxX = Math.max(startWorld.x, currentWorld.x);
          const boxMaxY = Math.max(startWorld.y, currentWorld.y);

          const hitIds = project.nodes
            .filter((node) => {
              const nx = node.position.x;
              const ny = node.position.y;
              // AABB intersection: node rect vs box rect
              return (
                nx + NODE_WIDTH >= boxMinX &&
                nx <= boxMaxX &&
                ny + NODE_HEIGHT >= boxMinY &&
                ny <= boxMaxY
              );
            })
            .map((n) => n.id);

          useProjectStore.getState().selectNodes(hitIds);
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

    // Hide selection box
    if (selectionBox) {
      selectionBox.hide();
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
