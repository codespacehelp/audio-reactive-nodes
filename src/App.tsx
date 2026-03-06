import { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from './store/project-store';
import WebGPUCheck from './ui/WebGPUCheck';
import CanvasRoot from './canvas/CanvasRoot';
import PropertyPanel from './panel/PropertyPanel';
import Toolbar from './toolbar/Toolbar';
import PresentMode from './toolbar/PresentMode';
import { validateProject } from './schema/validate';
import { recomputeGraph } from './runtime/recompute-graph';
import { startFrameLoop, stopFrameLoop } from './runtime/frame-loop';
import { registerBuiltins } from './nodes/registry';
import { useRuntimeStore } from './store/runtime-store';
import { initAudioInput } from './nodes/audio/audio-in';
import { resumeAudioContext } from './runtime/audio-context';

// Expose stores for debugging in dev
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__RUNTIME_STORE__ = useRuntimeStore;
  (window as unknown as Record<string, unknown>).__PROJECT_STORE__ = useProjectStore;
}

export default function App() {
  const loadProject = useProjectStore((s) => s.loadProject);
  const project = useProjectStore((s) => s.project);
  const loadError = useProjectStore((s) => s.loadError);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    registerBuiltins();

    async function init() {
      // Check for ?project= query param, fall back to default.json
      const params = new URLSearchParams(window.location.search);
      const projectUrl = params.get('project') ?? 'default.json';

      try {
        const response = await fetch(projectUrl);
        if (!response.ok) throw new Error(`Failed to load: ${response.status}`);
        const json = await response.json();
        const result = validateProject(json);
        if (!result.ok) throw new Error(result.error);
        loadProject(result.value);
        recomputeGraph(result.value);
      } catch (err) {
        console.error('Failed to load project:', err);
        useProjectStore.setState({ loadError: String(err) });
      }

      startFrameLoop();
    }

    init();
    return () => stopFrameLoop();
  }, [loadProject]);

  const audioStarted = useRuntimeStore((s) => s.audioStarted);
  const hasAudioNodes = useProjectStore(
    (s) => s.project?.nodes.some((n) => n.type === 'audio_in') ?? false,
  );
  const showStartOverlay = hasAudioNodes && !audioStarted;

  const handlePresent = useCallback(() => setPresenting(true), []);
  const handleExitPresent = useCallback(() => setPresenting(false), []);

  const handleStart = useCallback(async () => {
    await resumeAudioContext();
    initAudioInput();
    useRuntimeStore.getState().setAudioStarted();
  }, []);

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
    <WebGPUCheck>
      <div className="flex h-screen w-screen flex-col bg-zinc-900 text-zinc-100">
        <Toolbar onPresent={handlePresent} />

        <div className="relative flex flex-1 overflow-hidden">
          {/* Canvas area */}
          <div className="flex-1 relative">
            <CanvasRoot />
          </div>

          {/* Property panel */}
          <div className="w-80 shrink-0 border-l border-zinc-700 bg-zinc-800">
            <PropertyPanel />
          </div>

          {/* Start overlay — dims content until user clicks to enable audio */}
          {showStartOverlay && (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={handleStart}
            >
              <button
                className="px-8 py-3 rounded-full bg-green-600 text-white text-lg font-medium shadow-xl shadow-green-900/40 hover:bg-green-500 transition-colors"
              >
                Start Project
              </button>
            </div>
          )}
        </div>
      </div>

      {presenting && <PresentMode onExit={handleExitPresent} />}
    </WebGPUCheck>
  );
}
