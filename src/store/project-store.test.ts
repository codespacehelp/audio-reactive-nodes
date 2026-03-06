import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './project-store';
import type { ProjectSchema } from '../types/project';

function makeProject(): ProjectSchema {
  return {
    schemaVersion: 1,
    nodes: [
      { id: 'n1', name: 'sphere1', type: 'sphere', position: { x: 0, y: 0 }, params: {} },
      { id: 'n2', name: 'scene1', type: 'scene', position: { x: 200, y: 0 }, params: {} },
    ],
    connections: [
      { id: 'c1', fromNode: 'n1', fromPort: 'geometry', toNode: 'n2', toPort: 'geometry' },
    ],
    viewport: { panX: 0, panY: 0, zoom: 1 },
  };
}

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useProjectStore.setState({
      project: null,
      selectedNodeIds: new Set(),
      undoStack: [],
      redoStack: [],
      uiMode: 'edit',
      loadError: null,
      viewport: { panX: 0, panY: 0, zoom: 1 },
    });
  });

  it('loads a project', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());

    const state = useProjectStore.getState();
    expect(state.project).not.toBeNull();
    expect(state.project!.nodes).toHaveLength(2);
    expect(state.undoStack).toHaveLength(0);
    expect(state.selectedNodeIds.size).toBe(0);
  });

  it('selects a node', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());
    store.selectNode('n1');

    expect(useProjectStore.getState().selectedNodeIds).toEqual(new Set(['n1']));
  });

  it('additive select toggles', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());
    store.selectNode('n1');
    store.selectNode('n2', true);

    expect(useProjectStore.getState().selectedNodeIds).toEqual(new Set(['n1', 'n2']));

    // Toggle n1 off
    store.selectNode('n1', true);
    expect(useProjectStore.getState().selectedNodeIds).toEqual(new Set(['n2']));
  });

  it('deselects on null', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());
    store.selectNode('n1');
    store.selectNode(null);

    expect(useProjectStore.getState().selectedNodeIds.size).toBe(0);
  });

  it('moves a node and supports undo', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());

    // Push undo before moving
    store.pushUndo();
    store.setNodePosition('n1', 100, 50);

    const moved = useProjectStore.getState().project!.nodes.find((n) => n.id === 'n1')!;
    expect(moved.position).toEqual({ x: 100, y: 50 });

    // Undo
    store.undo();
    const restored = useProjectStore.getState().project!.nodes.find((n) => n.id === 'n1')!;
    expect(restored.position).toEqual({ x: 0, y: 0 });
  });

  it('supports redo after undo', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());
    store.pushUndo();
    store.setNodePosition('n1', 100, 50);

    store.undo();
    store.redo();

    const node = useProjectStore.getState().project!.nodes.find((n) => n.id === 'n1')!;
    expect(node.position).toEqual({ x: 100, y: 50 });
  });

  it('clears redo stack on new change', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());
    store.pushUndo();
    store.setNodePosition('n1', 100, 50);
    store.undo();

    // Make a new change — should clear redo
    store.pushUndo();
    store.setNodePosition('n1', 200, 75);

    expect(useProjectStore.getState().redoStack).toHaveLength(0);
  });

  it('sets param value', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());
    store.pushUndo();
    store.setParamValue('n1', 'radius', { mode: 'literal', value: 2.5 });

    const node = useProjectStore.getState().project!.nodes.find((n) => n.id === 'n1')!;
    expect(node.params.radius).toEqual({ mode: 'literal', value: 2.5 });
  });

  it('exports a clone of the project', () => {
    const store = useProjectStore.getState();
    store.loadProject(makeProject());
    const exported = store.exportProject();

    expect(exported).toEqual(useProjectStore.getState().project);
    // Should be a different reference (clone)
    expect(exported).not.toBe(useProjectStore.getState().project);
  });
});
