"use client";

import type { FingerprintSegment } from "@/lib/assistant/embeddingVisualizations";
import {
  FINGERPRINT_RING_COUNT,
  FINGERPRINT_SEGMENTS_PER_RING,
} from "@/lib/assistant/embeddingVisualizations";

type FingerprintViewProps = {
  segments: FingerprintSegment[];
  size?: number;
};

const RING_BASE_RADIUS = [18, 32, 46, 60];
const RING_THICKNESS = 10;

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export function FingerprintView({ segments, size = 160 }: FingerprintViewProps) {
  const cx = size / 2;
  const cy = size / 2;
  const segmentAngle = (2 * Math.PI) / FINGERPRINT_SEGMENTS_PER_RING;
  const gap = 0.02;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto block">
      <circle cx={cx} cy={cy} r={RING_BASE_RADIUS[0]! - 6} fill="#1e1e1e" />
      {Array.from({ length: FINGERPRINT_RING_COUNT }, (_, ring) => {
        const ringSegments = segments.filter((segment) => segment.ring === ring);
        const baseRadius = RING_BASE_RADIUS[ring]!;

        return ringSegments.map((segment) => {
          const startAngle = segment.segment * segmentAngle - Math.PI / 2 + gap;
          const endAngle = (segment.segment + 1) * segmentAngle - Math.PI / 2 - gap;
          const bump = segment.intensity * 5;
          const innerR = baseRadius - RING_THICKNESS / 2;
          const outerR = baseRadius + RING_THICKNESS / 2 + bump;
          const opacity = 0.35 + segment.intensity * 0.65;

          return (
            <path
              key={`${ring}-${segment.segment}`}
              d={describeArc(cx, cy, innerR, outerR, startAngle, endAngle)}
              fill={`rgba(204, 204, 204, ${opacity})`}
            />
          );
        });
      })}
      <circle cx={cx} cy={cy} r={10} fill="#252526" stroke="#3c3c3c" strokeWidth={1} />
    </svg>
  );
}
