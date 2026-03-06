import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/project-store';
import { worldToScreen } from '../canvas/camera';
import { NODE_WIDTH, NODE_HEIGHT, NODE_HEADER_HEIGHT } from '../canvas/layout';
import { getPreviewData } from './preview-manager';

/**
 * DOM overlay rendering a mirrored waveform visualization inside audio_in nodes.
 * Reads the RMS history from the preview ring buffer (3-second window, same as
 * channel sparklines) and draws it as vertical bars extending up and down from
 * a center line.
 */
export default function WaveformPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function update() {
      const { project, viewport } = useProjectStore.getState();
      if (!project || !container) {
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      const audioInNodes = project.nodes.filter((n) => n.type === 'audio_in');
      const currentIds = new Set(audioInNodes.map((n) => n.id));

      // Remove stale canvases
      for (const [id, canvas] of canvasesRef.current) {
        if (!currentIds.has(id)) {
          container.removeChild(canvas);
          canvasesRef.current.delete(id);
        }
      }

      // Hide all if zoomed out
      if (viewport.zoom < 0.3) {
        for (const [, canvas] of canvasesRef.current) {
          canvas.style.display = 'none';
        }
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      const containerRect = container.getBoundingClientRect();

      for (const node of audioInNodes) {
        let canvas = canvasesRef.current.get(node.id);
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.style.position = 'absolute';
          canvas.style.pointerEvents = 'none';
          canvas.style.borderRadius = '0 0 8px 8px';
          container.appendChild(canvas);
          canvasesRef.current.set(node.id, canvas);
        }

        // Position below header
        const screenPos = worldToScreen(
          node.position.x,
          node.position.y + NODE_HEADER_HEIGHT,
          viewport,
        );
        const w = NODE_WIDTH * viewport.zoom;
        const h = (NODE_HEIGHT - NODE_HEADER_HEIGHT) * viewport.zoom;

        // Viewport culling
        const offScreen =
          screenPos.x + w < 0 ||
          screenPos.x > containerRect.width ||
          screenPos.y + h < 0 ||
          screenPos.y > containerRect.height;

        if (offScreen) {
          canvas.style.display = 'none';
          continue;
        }

        canvas.style.left = `${screenPos.x}px`;
        canvas.style.top = `${screenPos.y}px`;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        canvas.style.display = '';
        canvas.width = Math.max(1, Math.floor(w * devicePixelRatio));
        canvas.height = Math.max(1, Math.floor(h * devicePixelRatio));

        // Get the RMS history from preview ring buffer
        const data = getPreviewData(node.id);
        const ctx2d = canvas.getContext('2d');
        if (!ctx2d) continue;

        const cw = canvas.width;
        const ch = canvas.height;
        const midY = ch / 2;

        ctx2d.clearRect(0, 0, cw, ch);

        // Get RMS ring buffer (audio_in outputs { level: { values: { rms } } })
        const rmsBuffer = data?.get('rms');
        if (!rmsBuffer) {
          // No data yet — draw a flat center line
          ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx2d.lineWidth = devicePixelRatio;
          ctx2d.beginPath();
          ctx2d.moveTo(0, midY);
          ctx2d.lineTo(cw, midY);
          ctx2d.stroke();
          continue;
        }

        const history = rmsBuffer.toArray();
        const len = history.length;

        // Find max for auto-scaling
        let maxVal = 0;
        for (let i = 0; i < len; i++) {
          if (history[i] > maxVal) maxVal = history[i];
        }
        if (maxVal < 1) maxVal = 1; // avoid division by zero / overly amplified silence

        // Draw mirrored waveform: vertical bars from center
        ctx2d.fillStyle = 'rgba(255, 255, 255, 0.85)';

        const barWidth = cw / len;
        for (let i = 0; i < len; i++) {
          const amp = Math.min(history[i] / maxVal, 1.0);
          const barHeight = amp * midY;

          if (barHeight < 0.5) continue; // skip silent bars

          const x = i * barWidth;
          // Draw mirrored bar: extends up and down from center
          ctx2d.fillRect(x, midY - barHeight, Math.max(barWidth, 1), barHeight * 2);
        }
      }

      rafRef.current = requestAnimationFrame(update);
    }

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const [, canvas] of canvasesRef.current) {
        if (container.contains(canvas)) {
          container.removeChild(canvas);
        }
      }
      canvasesRef.current.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}
