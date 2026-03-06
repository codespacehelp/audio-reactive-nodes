import { useEffect } from 'react';
import { useProjectStore } from './store/project-store';
import { useRuntimeStore } from './store/runtime-store';
import defaultProject from './assets/default.json';
import type { ProjectSchema } from './types/project';

export default function App() {
  const loadProject = useProjectStore((s) => s.loadProject);
  const initNodes = useRuntimeStore((s) => s.initNodes);
  const project = useProjectStore((s) => s.project);
  const loadError = useProjectStore((s) => s.loadError);

  useEffect(() => {
    const proj = defaultProject as ProjectSchema;
    loadProject(proj);
    initNodes(proj.nodes.map((n) => n.id));
  }, [loadProject, initNodes]);

  if (loadError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-900 text-red-400">
        <p>{loadError}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-900 text-zinc-400">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-900 text-zinc-100">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center border-b border-zinc-700 bg-zinc-800 px-4 text-sm">
        <span className="font-medium text-zinc-300">Audio Reactive Nodes</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative" />

        {/* Property panel */}
        <div className="w-80 shrink-0 border-l border-zinc-700 bg-zinc-800" />
      </div>
    </div>
  );
}
