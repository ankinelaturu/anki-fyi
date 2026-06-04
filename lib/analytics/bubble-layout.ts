import type { AnalyticsBubbleItem, AnalyticsBubbleScale } from "@/lib/analytics/types";

export type PlacedBubble = {
  item: AnalyticsBubbleItem;
  x: number;
  y: number;
  r: number;
};

const PADDING = 12;
const GAP = 8;

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

/** Pack proportional circles into a square without D3. */
export function packBubbles(
  items: AnalyticsBubbleItem[],
  boxSize: number,
  scale: AnalyticsBubbleScale = "sqrt"
): PlacedBubble[] {
  if (items.length === 0) return [];

  const maxValue = Math.max(...items.map((item) => item.value));
  const maxR = boxSize * 0.22;
  const minR = Math.max(boxSize * 0.09, 28);

  const bubbles = items
    .map((item) => ({
      item,
      r: scaledRadius(item.value, maxValue, minR, maxR, scale),
    }))
    .sort((a, b) => b.r - a.r);

  const center = boxSize / 2;
  const placed: PlacedBubble[] = [{ ...bubbles[0]!, x: center, y: center }];

  for (let i = 1; i < bubbles.length; i++) {
    const bubble = bubbles[i]!;
    let best: { x: number; y: number; score: number } | null = null;

    for (const anchor of placed) {
      for (let step = 0; step < 24; step++) {
        const angle = (step / 24) * Math.PI * 2;
        const dist = anchor.r + bubble.r + GAP;
        const x = anchor.x + Math.cos(angle) * dist;
        const y = anchor.y + Math.sin(angle) * dist;

        if (
          x - bubble.r < PADDING ||
          x + bubble.r > boxSize - PADDING ||
          y - bubble.r < PADDING ||
          y + bubble.r > boxSize - PADDING
        ) {
          continue;
        }

        let valid = true;
        let minGap = Number.POSITIVE_INFINITY;
        for (const other of placed) {
          const separation = Math.hypot(x - other.x, y - other.y) - (bubble.r + other.r);
          if (separation < GAP) {
            valid = false;
            break;
          }
          minGap = Math.min(minGap, separation);
        }

        if (!valid) continue;

        const score = minGap;
        if (!best || score > best.score) {
          best = { x, y, score };
        }
      }
    }

    if (best) {
      placed.push({ ...bubble, x: best.x, y: best.y });
    } else {
      placed.push({
        ...bubble,
        x: center + ((i % 3) - 1) * (maxR + GAP),
        y: center + (Math.floor(i / 3) - 1) * (maxR + GAP),
      });
    }
  }

  return placed;
}
