"use client";

import type { FingerprintSegment } from "@/lib/assistant/embeddingVisualizations";
import {
  FINGERPRINT_RING_COUNT,
  FINGERPRINT_SEGMENTS_PER_RING,
  fingerprintSegmentColor,
} from "@/lib/assistant/embeddingVisualizations";

type FingerprintViewProps = {
  segments: FingerprintSegment[];
  size?: number;
};

const DESIGN_SIZE = 160;
const RING_BASE_RADIUS = [18, 32, 46, 60];
const RING_THICKNESS = 10;
const MAX_BUMP = 5;

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
  const scale = size / DESIGN_SIZE;
  const ringThickness = RING_THICKNESS * scale;
  const maxBump = MAX_BUMP * scale;
  const ringRadii = RING_BASE_RADIUS.map((radius) => radius * scale);
  const outerExtent =
    ringRadii[FINGERPRINT_RING_COUNT - 1]! + ringThickness / 2 + maxBump;
  const padding = 2 * scale;
  const viewSize = (outerExtent + padding) * 2;
  const cx = viewSize / 2;
  const cy = viewSize / 2;
  const segmentAngle = (2 * Math.PI) / FINGERPRINT_SEGMENTS_PER_RING;
  const gap = 0.02;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      className="block shrink-0"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle cx={cx} cy={cy} r={ringRadii[0]! - 6 * scale} fill="#1e1e1e" />
      {Array.from({ length: FINGERPRINT_RING_COUNT }, (_, ring) => {
        const ringSegments = segments.filter((segment) => segment.ring === ring);
        const baseRadius = ringRadii[ring]!;

        return ringSegments.map((segment) => {
          const startAngle = segment.segment * segmentAngle - Math.PI / 2 + gap;
          const endAngle = (segment.segment + 1) * segmentAngle - Math.PI / 2 - gap;
          const bump = segment.intensity * maxBump;
          const innerR = baseRadius - ringThickness / 2;
          const outerR = baseRadius + ringThickness / 2 + bump;
          return (
            <path
              key={`${ring}-${segment.segment}`}
              d={describeArc(cx, cy, innerR, outerR, startAngle, endAngle)}
              fill={fingerprintSegmentColor(ring, segment.intensity)}
            />
          );
        });
      })}
      <circle
        cx={cx}
        cy={cy}
        r={10 * scale}
        fill="#252526"
        stroke="#3c3c3c"
        strokeWidth={1 * scale}
      />
    </svg>
  );
}
