"use client";

import { genomeIntensityLevel } from "@/lib/assistant/embeddingVisualizations";
import { cn } from "@/lib/utils";

const INTENSITY_FILL = [
  "#2a2a2a",
  "#3a3a3a",
  "#4a4a4a",
  "#5c5c5c",
  "#707070",
  "#8a8a8a",
  "#a8a8a8",
  "#cccccc",
];

type GenomeStripProps = {
  genome: number[];
  compact?: boolean;
  className?: string;
};

export function GenomeStrip({ genome, compact = false, className }: GenomeStripProps) {
  const cellWidth = compact ? 2 : 3;
  const cellHeight = compact ? 8 : 14;
  const gap = compact ? 0.5 : 1;
  const width = genome.length * (cellWidth + gap) - gap;

  return (
    <svg
      width={compact ? width : "100%"}
      height={cellHeight}
      viewBox={`0 0 ${width} ${cellHeight}`}
      preserveAspectRatio="none"
      className={cn("block", className)}
      aria-hidden
    >
      {genome.map((value, index) => {
        const level = genomeIntensityLevel(value);
        const x = index * (cellWidth + gap);
        return (
          <rect
            key={index}
            x={x}
            y={0}
            width={cellWidth}
            height={cellHeight}
            rx={compact ? 0.25 : 0.5}
            fill={INTENSITY_FILL[level]}
          />
        );
      })}
    </svg>
  );
}
