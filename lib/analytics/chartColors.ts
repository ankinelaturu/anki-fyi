/**
 * Shared chart palette — AnalyticsBubbleMetrics, AnalyticsPieChartView, embedding visuals.
 * Matches ChatGPT Usage Snapshot [Jun 02, 2026] bubble + pie styling.
 */
export const ANALYTICS_CHART_COLORS = [
  "#569cd6",
  "#4ec9b0",
  "#c586c0",
  "#dcdcaa",
  "#ce9178",
  "#9cdcfe",
] as const;

export const ANALYTICS_CHART_PRIMARY = "#7ec8ff";

export const ANALYTICS_CHART_BACKGROUND = "#1a2836";

/** Fingerprint ring 1 (teal) — ChatGPT snapshot bubble alt; also used for heatmap ramp. */
export const FINGERPRINT_RING_TEAL = ANALYTICS_CHART_COLORS[1];

/** Fingerprint ring 2. */
export const FINGERPRINT_RING_PURPLE = ANALYTICS_CHART_COLORS[2];

/** Fingerprint ring 3 — also used for genome ramp. */
export const FINGERPRINT_RING_YELLOW = ANALYTICS_CHART_COLORS[3];

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export function lerpHexColor(hexA: string, hexB: string, t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return `rgb(${lerpChannel(r1, r2, clamp)}, ${lerpChannel(g1, g2, clamp)}, ${lerpChannel(b1, b2, clamp)})`;
}

/** Interpolate across the analytics palette (0 = blue → teal → purple → …). */
export function analyticsPaletteColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity)) * (ANALYTICS_CHART_COLORS.length - 1);
  const index = Math.floor(t);
  const fraction = t - index;
  if (index >= ANALYTICS_CHART_COLORS.length - 1) {
    return ANALYTICS_CHART_COLORS[ANALYTICS_CHART_COLORS.length - 1]!;
  }
  return lerpHexColor(
    ANALYTICS_CHART_COLORS[index]!,
    ANALYTICS_CHART_COLORS[index + 1]!,
    fraction
  );
}

export function analyticsColorWithIntensity(hex: string, intensity: number): string {
  const [r, g, b] = hexToRgb(hex);
  const alpha = 0.28 + intensity * 0.6;
  const brightness = 0.55 + intensity * 0.45;
  return `rgba(${Math.round(r * brightness)}, ${Math.round(g * brightness)}, ${Math.round(b * brightness)}, ${alpha})`;
}
