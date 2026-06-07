"use client";

import { useCallback, useRef, useState } from "react";
import {
  EMBEDDING_DIMENSIONS,
  HEATMAP_COLS,
  HEATMAP_ROWS,
} from "@/lib/assistant/embeddingVisualizations";

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

export function HeatmapView({ normalized, embedding }: HeatmapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<HoverCell | null>(null);

  const draw = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cellW = canvas.width / HEATMAP_COLS;
      const cellH = canvas.height / HEATMAP_ROWS;

      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let dimension = 0; dimension < EMBEDDING_DIMENSIONS; dimension++) {
        const row = Math.floor(dimension / HEATMAP_COLS);
        const col = dimension % HEATMAP_COLS;
        const intensity = normalized[dimension] ?? 0;
        const gray = Math.round(40 + intensity * 180);
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        ctx.fillRect(col * cellW, row * cellH, cellW - 0.5, cellH - 0.5);
      }
    },
    [normalized]
  );

  const handleRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
      if (node) draw(node);
    },
    [draw]
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const cellW = canvas.width / HEATMAP_COLS;
    const cellH = canvas.height / HEATMAP_ROWS;
    const col = Math.min(HEATMAP_COLS - 1, Math.floor(x / cellW));
    const row = Math.min(HEATMAP_ROWS - 1, Math.floor(y / cellH));
    const dimension = row * HEATMAP_COLS + col;

    setHover({
      dimension,
      value: embedding[dimension] ?? 0,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  return (
    <div className="relative">
      <canvas
        ref={handleRef}
        width={HEATMAP_COLS * 4}
        height={HEATMAP_ROWS * 4}
        className="w-full rounded border border-ide-border"
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
