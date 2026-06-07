"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMBEDDING_DIMENSIONS,
  HEATMAP_COLS,
  HEATMAP_ROWS,
  heatmapColor,
} from "@/lib/assistant/embeddingVisualizations";

const CELL_GAP = 1;

type HeatmapViewProps = {
  normalized: number[];
  embedding: number[];
};

type HoverCell = {
  dimension: number;
  value: number;
  x: number;
  y: number;
};

type HeatmapLayout = {
  cellSize: number;
  gap: number;
  width: number;
  height: number;
};

function computeLayout(containerWidth: number): HeatmapLayout {
  const gap = CELL_GAP;
  const cellSize = Math.max(
    2,
    Math.floor((containerWidth - (HEATMAP_COLS - 1) * gap) / HEATMAP_COLS)
  );
  const width = HEATMAP_COLS * cellSize + (HEATMAP_COLS - 1) * gap;
  const height = HEATMAP_ROWS * cellSize + (HEATMAP_ROWS - 1) * gap;
  return { cellSize, gap, width, height };
}

export function HeatmapView({ normalized, embedding }: HeatmapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<HeatmapLayout>(computeLayout(256));
  const [hover, setHover] = useState<HoverCell | null>(null);

  const draw = useCallback(
    (canvas: HTMLCanvasElement, layout: HeatmapLayout) => {
      const dpr = window.devicePixelRatio || 1;
      const bitmapWidth = Math.round(layout.width * dpr);
      const bitmapHeight = Math.round(layout.height * dpr);

      canvas.width = bitmapWidth;
      canvas.height = bitmapHeight;
      canvas.style.width = `${layout.width}px`;
      canvas.style.height = `${layout.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, layout.width, layout.height);

      const stride = layout.cellSize + layout.gap;

      for (let dimension = 0; dimension < EMBEDDING_DIMENSIONS; dimension++) {
        const row = Math.floor(dimension / HEATMAP_COLS);
        const col = dimension % HEATMAP_COLS;
        const intensity = normalized[dimension] ?? 0;
        ctx.fillStyle = heatmapColor(intensity);
        ctx.fillRect(col * stride, row * stride, layout.cellSize, layout.cellSize);
      }
    },
    [normalized]
  );

  const redraw = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const layout = computeLayout(container.clientWidth);
    layoutRef.current = layout;
    draw(canvas, layout);
  }, [draw]);

  useEffect(() => {
    redraw();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => redraw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const layout = layoutRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const stride = layout.cellSize + layout.gap;
    const col = Math.floor(x / stride);
    const row = Math.floor(y / stride);

    if (col < 0 || col >= HEATMAP_COLS || row < 0 || row >= HEATMAP_ROWS) {
      setHover(null);
      return;
    }

    const localX = x - col * stride;
    const localY = y - row * stride;
    if (localX >= layout.cellSize || localY >= layout.cellSize) {
      setHover(null);
      return;
    }

    const dimension = row * HEATMAP_COLS + col;
    setHover({
      dimension,
      value: embedding[dimension] ?? 0,
      x,
      y,
    });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className="block max-w-full rounded border border-ide-border"
        style={{ imageRendering: "pixelated" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover ? (
        <div
          className="pointer-events-none absolute z-10 rounded border border-ide-border bg-[#1e1e1e] px-2 py-1 font-mono text-[9px] text-ide-text shadow-md"
          style={{ left: hover.x + 8, top: hover.y + 8 }}
        >
          <div>Dimension: {hover.dimension}</div>
          <div>Value: {hover.value.toFixed(6)}</div>
        </div>
      ) : null}
    </div>
  );
}
