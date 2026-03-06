import { create } from 'zustand';
import { produce } from 'immer';
import type { ProjectSchema, ViewportData, ParamValue } from '../types/project';

export type UiMode = 'edit' | 'present';

export interface ProjectState {
  project: ProjectSchema | null;
  selectedNodeIds: Set<string>;
  viewport: ViewportData;
  undoStack: ProjectSchema[];
  redoStack: ProjectSchema[];
  uiMode: UiMode;
  loadError: string | null;
}

export interface ProjectActions {
  loadProject: (project: ProjectSchema) => void;
  selectNode: (nodeId: string | null, additive?: boolean) => void;
  selectNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  setViewport: (viewport: ViewportData) => void;
  setUiMode: (mode: UiMode) => void;

  /** Push current project onto undo stack before a change */
  pushUndo: () => void;
  setNodePosition: (nodeId: string, x: number, y: number) => void;
  setParamValue: (nodeId: string, paramName: string, value: ParamValue) => void;
  undo: () => void;
  redo: () => void;

  exportProject: () => ProjectSchema | null;
}

export type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  // State
  project: null,
  selectedNodeIds: new Set<string>(),
  viewport: { panX: 0, panY: 0, zoom: 1 },
  undoStack: [],
  redoStack: [],
  uiMode: 'edit',
  loadError: null,

  // Actions
  loadProject: (project) =>
    set({
      project,
      selectedNodeIds: new Set(),
      undoStack: [],
      redoStack: [],
      loadError: null,
      viewport: project.viewport,
    }),

  selectNode: (nodeId, additive = false) =>
    set((state) => {
      if (nodeId === null) {
        return { selectedNodeIds: new Set() };
      }
      if (additive) {
        const next = new Set(state.selectedNodeIds);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return { selectedNodeIds: next };
      }
      return { selectedNodeIds: new Set([nodeId]) };
    }),

  selectNodes: (nodeIds) =>
    set({ selectedNodeIds: new Set(nodeIds) }),

  clearSelection: () =>
    set({ selectedNodeIds: new Set() }),

  setViewport: (viewport) => set({ viewport }),

  setUiMode: (mode) => set({ uiMode: mode }),

  pushUndo: () => {
    const { project, undoStack } = get();
    if (!project) return;
    set({
      undoStack: [...undoStack, structuredClone(project)],
      redoStack: [],
    });
  },

  setNodePosition: (nodeId, x, y) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: produce(state.project, (draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId);
          if (node) {
            node.position = { x, y };
          }
        }),
      };
    }),

  setParamValue: (nodeId, paramName, value) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: produce(state.project, (draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId);
          if (node) {
            node.params[paramName] = value;
          }
        }),
      };
    }),

  undo: () => {
    const { undoStack, project } = get();
    if (undoStack.length === 0 || !project) return;
    const prev = undoStack[undoStack.length - 1];
    set((state) => ({
      project: prev,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, structuredClone(project)],
    }));
  },

  redo: () => {
    const { redoStack, project } = get();
    if (redoStack.length === 0 || !project) return;
    const next = redoStack[redoStack.length - 1];
    set((state) => ({
      project: next,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, structuredClone(project)],
    }));
  },

  exportProject: () => {
    return get().project ? structuredClone(get().project) : null;
  },
}));
