import { useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/project-store';
import { useRuntimeStore } from '../../store/runtime-store';
import { worldToScreen } from '../camera';
import { NODE_WIDTH, NODE_HEIGHT, NODE_HEADER_HEIGHT } from '../layout';

/**
 * DOM overlay that renders node name labels positioned over the canvas.
 * Uses rAF to stay in sync with the Three.js render loop.
 */
export default function NodeLabels() {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const errorBadgesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function updateLabels() {
      const { project, viewport } = useProjectStore.getState();
      if (!project || !container) {
        rafRef.current = requestAnimationFrame(updateLabels);
        return;
      }

      const currentIds = new Set(project.nodes.map((n) => n.id));

      // Remove labels for deleted nodes
      for (const [id, el] of labelsRef.current) {
        if (!currentIds.has(id)) {
          container.removeChild(el);
          labelsRef.current.delete(id);
        }
      }

      // Update or create labels
      for (const node of project.nodes) {
        let el = labelsRef.current.get(node.id);

        if (!el) {
          el = document.createElement('div');
          el.className = 'absolute truncate text-xs font-medium text-zinc-200 leading-none';
          el.style.pointerEvents = 'none';
          container.appendChild(el);
          labelsRef.current.set(node.id, el);
        }

        // Update text
        el.textContent = node.name;

        // Position: center of header in screen space
        const screenPos = worldToScreen(
          node.position.x,
          node.position.y,
          viewport,
        );

        const screenWidth = NODE_WIDTH * viewport.zoom;
        const screenHeaderHeight = NODE_HEADER_HEIGHT * viewport.zoom;

        el.style.left = `${screenPos.x}px`;
        el.style.top = `${screenPos.y}px`;
        el.style.width = `${screenWidth}px`;
        el.style.height = `${screenHeaderHeight}px`;
        el.style.lineHeight = `${screenHeaderHeight}px`;
        el.style.textAlign = 'center';
        el.style.fontSize = `${Math.min(12, 12 * viewport.zoom)}px`;

        // Hide labels when zoomed out too far
        el.style.display = viewport.zoom < 0.3 ? 'none' : '';
      }

      // Update error badges
      const runtimeNodes = useRuntimeStore.getState().nodes;
      const currentErrorIds = new Set<string>();

      for (const node of project.nodes) {
        const runtimeNode = runtimeNodes[node.id];
        if (runtimeNode?.error) {
          currentErrorIds.add(node.id);
          let badge = errorBadgesRef.current.get(node.id);
          if (!badge) {
            badge = document.createElement('div');
            badge.className = 'absolute pointer-events-auto cursor-help';
            badge.style.background = '#ef4444';
            badge.style.borderRadius = '50%';
            badge.style.display = 'flex';
            badge.style.alignItems = 'center';
            badge.style.justifyContent = 'center';
            badge.style.color = 'white';
            badge.style.fontWeight = 'bold';
            badge.style.fontSize = '10px';
            badge.style.zIndex = '10';
            container.appendChild(badge);
            errorBadgesRef.current.set(node.id, badge);
          }

          badge.textContent = '!';
          badge.title = runtimeNode.error;

          const screenPos = worldToScreen(
            node.position.x + NODE_WIDTH,
            node.position.y,
            viewport,
          );
          const size = Math.max(14, 14 * viewport.zoom);
          badge.style.left = `${screenPos.x - size / 2}px`;
          badge.style.top = `${screenPos.y - size / 2}px`;
          badge.style.width = `${size}px`;
          badge.style.height = `${size}px`;
          badge.style.display = viewport.zoom < 0.3 ? 'none' : '';
        }
      }

      // Remove stale error badges
      for (const [id, badge] of errorBadgesRef.current) {
        if (!currentErrorIds.has(id)) {
          container.removeChild(badge);
          errorBadgesRef.current.delete(id);
        }
      }

      rafRef.current = requestAnimationFrame(updateLabels);
    }

    rafRef.current = requestAnimationFrame(updateLabels);

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const [, el] of labelsRef.current) {
        container.removeChild(el);
      }
      labelsRef.current.clear();
      for (const [, el] of errorBadgesRef.current) {
        container.removeChild(el);
      }
      errorBadgesRef.current.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}
