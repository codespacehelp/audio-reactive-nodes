import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/project-store';
import { worldToScreen } from '../canvas/camera';
import { NODE_WIDTH, NODE_HEIGHT, NODE_HEADER_HEIGHT } from '../canvas/layout';
import { getPreviewData, PREVIEW_COLORS } from './preview-manager';

/** Node types that output channel_set and should show line previews */
const CHANNEL_NODE_TYPES = new Set([
  'audio_analyzer',
  'channel_rename',
  'channel_lag',
  'channel_map',
]);

/**
 * DOM overlay rendering small sparkline charts inside channel-type nodes.
 */
export default function LinePreview() {
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

      const channelNodes = project.nodes.filter((n) => CHANNEL_NODE_TYPES.has(n.type));
      const currentIds = new Set(channelNodes.map((n) => n.id));

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

      for (const node of channelNodes) {
        let canvas = canvasesRef.current.get(node.id);
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.style.position = 'absolute';
          canvas.style.pointerEvents = 'none';
          canvas.style.borderRadius = '4px';
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

        // Viewport culling: skip if node is off-screen
        const containerRect = container.getBoundingClientRect();
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

        // Draw sparklines
        const data = getPreviewData(node.id);
        const ctx2d = canvas.getContext('2d');
        if (!ctx2d || !data || data.size === 0) continue;

        const cw = canvas.width;
        const ch = canvas.height;
        ctx2d.clearRect(0, 0, cw, ch);

        // Find global min/max for auto-scaling
        let globalMin = Infinity;
        let globalMax = -Infinity;
        for (const [, buffer] of data) {
          const arr = buffer.data;
          for (let i = 0; i < arr.length; i++) {
            if (arr[i] < globalMin) globalMin = arr[i];
            if (arr[i] > globalMax) globalMax = arr[i];
          }
        }
        if (globalMin === globalMax) {
          globalMax = globalMin + 1;
        }
        const range = globalMax - globalMin;

        let colorIdx = 0;
        for (const [, buffer] of data) {
          const color = PREVIEW_COLORS[colorIdx % PREVIEW_COLORS.length];
          colorIdx++;

          ctx2d.strokeStyle = color;
          ctx2d.lineWidth = devicePixelRatio;
          ctx2d.beginPath();

          const arr = buffer.toArray();
          const len = arr.length;
          for (let i = 0; i < len; i++) {
            const x = (i / (len - 1)) * cw;
            const y = ch - ((arr[i] - globalMin) / range) * ch;
            if (i === 0) ctx2d.moveTo(x, y);
            else ctx2d.lineTo(x, y);
          }
          ctx2d.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(update);
    }

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const [, canvas] of canvasesRef.current) {
        container.removeChild(canvas);
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
