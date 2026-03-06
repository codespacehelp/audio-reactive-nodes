import { useState, useCallback } from 'react';
import { useProjectStore } from '../store/project-store';
import { useRuntimeStore } from '../store/runtime-store';
import { initAudioInput } from '../nodes/audio/audio-in';
import { resumeAudioContext } from '../runtime/audio-context';

interface ToolbarProps {
  onPresent: () => void;
}

export default function Toolbar({ onPresent }: ToolbarProps) {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const undoStack = useProjectStore((s) => s.undoStack);
  const redoStack = useProjectStore((s) => s.redoStack);
  const exportProject = useProjectStore((s) => s.exportProject);
  const audioStarted = useRuntimeStore((s) => s.audioStarted);
  const hasAudioNodes = useProjectStore(
    (s) => s.project?.nodes.some((n) => n.type === 'audio_in') ?? false,
  );
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  function handleExport() {
    const project = exportProject();
    if (!project) return;
    const json = JSON.stringify(project, null, 2);
    navigator.clipboard.writeText(json).then(
      () => showToast('Copied to clipboard'),
      () => showToast('Failed to copy'),
    );
  }

  async function handleStart() {
    await resumeAudioContext();
    initAudioInput();
    useRuntimeStore.getState().setAudioStarted();
  }

  const showStartButton = hasAudioNodes && !audioStarted;

  return (
    <div className="flex h-10 shrink-0 items-center border-b border-zinc-700 bg-zinc-800 px-4 text-sm gap-2">
      <span className="font-medium text-zinc-300 mr-auto">Audio Reactive Nodes</span>

      {showStartButton && (
        <button
          onClick={handleStart}
          className="absolute left-1/2 -translate-x-1/2 px-5 py-1 rounded-full bg-green-600 text-white hover:bg-green-500 font-medium shadow-lg shadow-green-900/30 transition-colors"
          title="Start audio and run project"
        >
          Start Project
        </button>
      )}

      <button
        onClick={undo}
        disabled={undoStack.length === 0}
        className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo"
      >
        Undo
      </button>
      <button
        onClick={redo}
        disabled={redoStack.length === 0}
        className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo"
      >
        Redo
      </button>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      <button
        onClick={handleExport}
        className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
        title="Export project JSON"
      >
        Export
      </button>
      <button
        onClick={onPresent}
        className="px-3 py-1 rounded bg-amber-600 text-zinc-100 hover:bg-amber-500 font-medium"
        title="Enter present mode (fullscreen)"
      >
        Present
      </button>

      {toast && (
        <div className="fixed left-1/2 top-14 -translate-x-1/2 rounded bg-zinc-700 px-4 py-2 text-sm text-zinc-100 shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
