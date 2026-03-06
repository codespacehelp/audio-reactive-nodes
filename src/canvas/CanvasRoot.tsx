import { useRef, useEffect, useCallback } from 'react';
import { initRenderer, resizeRenderer, type CanvasContext } from './three/setup';

export default function CanvasRoot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasContext | null>(null);
  const rafRef = useRef<number>(0);

  const render = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.renderer.renderAsync(ctx.scene, ctx.camera);
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

      // Initial size
      const { clientWidth, clientHeight } = container;
      resizeRenderer(ctx, clientWidth, clientHeight);

      // Start render loop
      rafRef.current = requestAnimationFrame(render);
    });

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !ctxRef.current) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        resizeRenderer(ctxRef.current, width, height);
      }
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (ctxRef.current) {
        ctxRef.current.renderer.dispose();
        ctxRef.current = null;
      }
    };
  }, [render]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* DOM overlay for labels, tooltips, etc. */}
      <div className="pointer-events-none absolute inset-0" />
    </div>
  );
}
