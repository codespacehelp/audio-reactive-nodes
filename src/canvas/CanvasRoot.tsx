import { useRef, useEffect, useCallback } from 'react';
import { initRenderer, resizeRenderer, type CanvasContext } from './three/setup';
import { updateCamera } from './camera';
import { GridRenderer } from './three/grid';
import { NodeRenderer } from './three/node-mesh';
import { PortRenderer } from './three/port-mesh';
import { EdgeRenderer } from './three/edge-lines';
import { ExprEdgeRenderer } from './three/expr-edges';
import { SelectionBoxRenderer } from './three/selection-box';
import { attachPanZoom } from './interaction/pan-zoom';
import { attachSelection } from './interaction/selection';
import { useProjectStore } from '../store/project-store';
import { useRuntimeStore } from '../store/runtime-store';
import NodeLabels from './overlay/NodeLabels';
import LinePreview from '../preview/LinePreview';
import WaveformPreview from '../preview/WaveformPreview';
import ScenePreview from '../preview/ScenePreview';

export default function CanvasRoot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasContext | null>(null);
  const gridRef = useRef<GridRenderer | null>(null);
  const nodeRendererRef = useRef<NodeRenderer | null>(null);
  const portRendererRef = useRef<PortRenderer | null>(null);
  const edgeRendererRef = useRef<EdgeRenderer | null>(null);
  const exprEdgeRef = useRef<ExprEdgeRenderer | null>(null);
  const selectionBoxRef = useRef<SelectionBoxRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ width: 0, height: 0 });

  const render = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      const state = useProjectStore.getState();
      const { viewport, project, selectedNodeIds } = state;
      const { width, height } = sizeRef.current;

      updateCamera(ctx.camera, viewport, width, height);

      if (gridRef.current) {
        gridRef.current.update(viewport, width, height);
      }

      if (nodeRendererRef.current && project) {
        const runtimeNodes = useRuntimeStore.getState().nodes;
        const errors: Record<string, string | null> = {};
        for (const [id, ns] of Object.entries(runtimeNodes)) {
          if (ns.error) errors[id] = ns.error;
        }
        nodeRendererRef.current.update(project.nodes, selectedNodeIds, errors);
      }

      if (portRendererRef.current && project) {
        portRendererRef.current.update(project.nodes);
      }

      if (edgeRendererRef.current && project) {
        edgeRendererRef.current.update(project.nodes, project.connections);
      }

      if (exprEdgeRef.current && project) {
        const { expressions } = useRuntimeStore.getState();
        exprEdgeRef.current.update(project.nodes, expressions);
      }

      ctx.renderer.render(ctx.scene, ctx.camera);
    }
    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let disposed = false;

    initRenderer(canvas).then((ctx) => {
      if (disposed) {
        ctx.renderer.dispose();
        return;
      }
      ctxRef.current = ctx;
      gridRef.current = new GridRenderer(ctx.scene);
      nodeRendererRef.current = new NodeRenderer(ctx.scene);
      portRendererRef.current = new PortRenderer(ctx.scene);
      edgeRendererRef.current = new EdgeRenderer(ctx.scene);
      exprEdgeRef.current = new ExprEdgeRenderer(ctx.scene);
      selectionBoxRef.current = new SelectionBoxRenderer(ctx.scene);

      // Initial size
      const { clientWidth, clientHeight } = container;
      sizeRef.current = { width: clientWidth, height: clientHeight };
      resizeRenderer(ctx, clientWidth, clientHeight);

      // Interaction handlers (need scene-dependent selection box)
      cleanupSelection = attachSelection(container, selectionBoxRef.current!);

      // Start render loop
      rafRef.current = requestAnimationFrame(render);
    });

    // Interaction handlers
    const cleanupPanZoom = attachPanZoom(container);
    let cleanupSelection: (() => void) | null = null;

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !ctxRef.current) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        sizeRef.current = { width, height };
        resizeRenderer(ctxRef.current, width, height);
      }
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      cleanupPanZoom();
      if (cleanupSelection) cleanupSelection();
      ro.disconnect();
      if (selectionBoxRef.current) {
        selectionBoxRef.current.dispose();
        selectionBoxRef.current = null;
      }
      if (exprEdgeRef.current) {
        exprEdgeRef.current.dispose();
        exprEdgeRef.current = null;
      }
      if (edgeRendererRef.current) {
        edgeRendererRef.current.dispose();
        edgeRendererRef.current = null;
      }
      if (portRendererRef.current) {
        portRendererRef.current.dispose();
        portRendererRef.current = null;
      }
      if (nodeRendererRef.current) {
        nodeRendererRef.current.dispose();
        nodeRendererRef.current = null;
      }
      if (gridRef.current) {
        gridRef.current.dispose();
        gridRef.current = null;
      }
      if (ctxRef.current) {
        ctxRef.current.renderer.dispose();
        ctxRef.current = null;
      }
    };
  }, [render]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* DOM overlays */}
      <ScenePreview />
      <WaveformPreview />
      <LinePreview />
      <NodeLabels />
    </div>
  );
}
