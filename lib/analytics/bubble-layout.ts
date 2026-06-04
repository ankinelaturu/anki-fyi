import type { AnalyticsBubbleItem, AnalyticsBubbleScale } from "@/lib/analytics/types";

export type PlacedBubble = {
  item: AnalyticsBubbleItem;
  x: number;
  y: number;
  r: number;
};

const GAP = 10;
export const BUBBLE_SIZE_MULTIPLIER = 1.5;

function scaledRadius(
  value: number,
  maxValue: number,
  minR: number,
  maxR: number,
  scale: AnalyticsBubbleScale
): number {
  if (maxValue <= 0) return minR;
  const ratio = value / maxValue;
  const t =
    scale === "sqrt"
      ? Math.sqrt(ratio)
      : scale === "log"
        ? Math.log10(value + 1) / Math.log10(maxValue + 1)
        : ratio;
  return minR + (maxR - minR) * Math.min(1, Math.max(0, t));
}

function inBounds(x: number, y: number, r: number, width: number, height: number, padding: number): boolean {
  return (
    x - r >= padding &&
    x + r <= width - padding &&
    y - r >= padding &&
    y + r <= height - padding
  );
}

function hasOverlap(
  x: number,
  y: number,
  r: number,
  placed: PlacedBubble[],
  gap: number
): boolean {
  for (const other of placed) {
    const separation = Math.hypot(x - other.x, y - other.y) - (r + other.r);
    if (separation < gap) return true;
  }
  return false;
}

function findPosition(
  bubble: { item: AnalyticsBubbleItem; r: number },
  placed: PlacedBubble[],
  width: number,
  height: number,
  padding: number
): { x: number; y: number } | null {
  let best: { x: number; y: number; score: number } | null = null;

  const anchors =
    placed.length > 0
      ? placed
      : [{ item: bubble.item, x: width / 2, y: height / 2, r: 0 }];

  for (const anchor of anchors) {
    for (let step = 0; step < 48; step++) {
      const angle = (step / 48) * Math.PI * 2;
      const dist = (anchor.r || 0) + bubble.r + GAP;
      const x = anchor.x + Math.cos(angle) * dist;
      const y = anchor.y + Math.sin(angle) * dist;

      if (!inBounds(x, y, bubble.r, width, height, padding)) continue;
      if (hasOverlap(x, y, bubble.r, placed, GAP)) continue;

      let minGap = Number.POSITIVE_INFINITY;
      for (const other of placed) {
        minGap = Math.min(
          minGap,
          Math.hypot(x - other.x, y - other.y) - (bubble.r + other.r)
        );
      }

      const score = minGap;
      if (!best || score > best.score) {
        best = { x, y, score };
      }
    }
  }

  return best ? { x: best.x, y: best.y } : null;
}

/** Pack proportional circles into a rectangle without D3. */
export function packBubbles(
  items: AnalyticsBubbleItem[],
  width: number,
  height: number,
  scale: AnalyticsBubbleScale = "sqrt"
): PlacedBubble[] {
  if (items.length === 0 || width <= 0 || height <= 0) return [];

  const padding = 14;
  const maxValue = Math.max(...items.map((item) => item.value));
  const minDim = Math.min(width, height);
  const maxR = minDim * 0.21 * BUBBLE_SIZE_MULTIPLIER;
  const minR = Math.max(minDim * 0.085, 26) * BUBBLE_SIZE_MULTIPLIER;

  const bubbles = items
    .map((item) => ({
      item,
      r: scaledRadius(item.value, maxValue, minR, maxR, scale),
    }))
    .sort((a, b) => b.r - a.r);

  const placed: PlacedBubble[] = [];
  const first = bubbles[0]!;
  placed.push({ ...first, x: width / 2, y: height / 2 });

  for (let i = 1; i < bubbles.length; i++) {
    let bubble = bubbles[i]!;
    let position = findPosition(bubble, placed, width, height, padding);

    if (!position && bubble.r > minR) {
      bubble = { ...bubble, r: bubble.r * 0.9 };
      position = findPosition(bubble, placed, width, height, padding);
    }

    if (position) {
      placed.push({ ...bubble, x: position.x, y: position.y });
    } else {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = padding + bubble.r + col * (bubble.r * 2 + GAP);
      const y = padding + bubble.r + row * (bubble.r * 2 + GAP);
      placed.push({ ...bubble, x, y });
    }
  }

  return placed;
}
