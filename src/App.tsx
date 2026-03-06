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
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-6 max-w-sm text-center">
                <button
                  onClick={handleStart}
                  className="group flex items-center gap-3 px-8 py-3.5 rounded-full bg-green-600 text-white text-lg font-medium shadow-xl shadow-green-900/40 hover:bg-green-500 transition-colors cursor-pointer"
                >
                  {/* Play triangle icon */}
                  <svg width="18" height="20" viewBox="0 0 18 20" fill="currentColor" className="shrink-0 translate-x-[1px]">
                    <path d="M0 2.82a2 2 0 0 1 2.976-1.746l12.553 7.18a2 2 0 0 1 0 3.492L2.976 18.926A2 2 0 0 1 0 17.18V2.82Z" />
                  </svg>
                  Start Project
                </button>

                <div className="flex items-start gap-3 text-zinc-300 text-sm leading-relaxed">
                  {/* Microphone icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-zinc-400">
                    <rect x="9" y="1" width="6" height="12" rx="3" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  <p>
                    This project uses <span className="text-zinc-100 font-medium">audio input</span> from your microphone.
                    All processing happens locally — no data is sent to the cloud.
                    <br />
                    <span className="text-zinc-500">Please allow access when prompted by your browser.</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {presenting && <PresentMode onExit={handleExitPresent} />}
    </WebGPUCheck>
  );
}
