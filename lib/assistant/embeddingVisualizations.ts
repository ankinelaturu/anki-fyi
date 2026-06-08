/**
 * Derived visual representations of embedding vectors for the inspector UI.
 *
 * Computes genome strips, fingerprint rings, and heatmap intensities from
 * min-max normalized 384-dimensional MiniLM embeddings with per-chunk caching.
 */

import {
  ANALYTICS_CHART_BACKGROUND,
  ANALYTICS_CHART_COLORS,
  analyticsColorWithIntensity,
  FINGERPRINT_RING_TEAL,
  FINGERPRINT_RING_YELLOW,
  lerpHexColor,
} from "@/lib/analytics/chartColors";

/** Dimensionality of `Xenova/all-MiniLM-L6-v2` embeddings. */
export const EMBEDDING_DIMENSIONS = 384;

/** Number of cells in the genome strip visualization. */
export const GENOME_CELL_COUNT = 96;

/** Discrete intensity buckets for genome cell coloring. */
export const GENOME_BUCKET_COUNT = 8;

/** Number of concentric rings in the fingerprint visualization. */
export const FINGERPRINT_RING_COUNT = 4;

/** Segments per fingerprint ring. */
export const FINGERPRINT_SEGMENTS_PER_RING = 48;

/** Column count for the embedding heatmap grid. */
export const HEATMAP_COLS = 64;

/** Row count for the embedding heatmap grid. */
export const HEATMAP_ROWS = 6;

/**
 * One segment in the fingerprint ring chart with normalized intensity.
 */
export type FingerprintSegment = {
  ring: number;
  segment: number;
  intensity: number;
};

/**
 * Cached derived visualization data for one chunk embedding.
 */
export type EmbeddingVisualizationCache = {
  normalized: number[];
  genome: number[];
  fingerprint: FingerprintSegment[];
  norm: number;
  rawFormatted: string;
};

const visualizationCache = new Map<string, EmbeddingVisualizationCache>();

/**
 * Compute the L2 norm (Euclidean length) of an embedding vector.
 */
export function vectorNorm(embedding: number[]): number {
  return Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
}

/**
 * Min-max normalize embedding values into the 0–1 range.
 *
 * Returns 0.5 for every dimension when the input is constant.
 */
export function minMaxNormalize(embedding: number[]): number[] {
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);
  const range = max - min;
  if (range === 0) return embedding.map(() => 0.5);
  return embedding.map((value) => (value - min) / range);
}

/**
 * Average a contiguous slice of normalized values.
 */
function averageBucket(values: number[], start: number, size: number): number {
  let sum = 0;
  for (let index = 0; index < size; index++) {
    sum += values[start + index] ?? 0;
  }
  return sum / size;
}

/**
 * Downsample normalized embedding dimensions into genome strip cell intensities.
 */
export function computeGenome(normalized: number[]): number[] {
  const bucketSize = EMBEDDING_DIMENSIONS / GENOME_CELL_COUNT;
  const genome: number[] = [];
  for (let cell = 0; cell < GENOME_CELL_COUNT; cell++) {
    genome.push(averageBucket(normalized, cell * bucketSize, bucketSize));
  }
  return genome;
}

/**
 * Map a genome cell intensity to a discrete bucket index for coloring.
 */
export function genomeIntensityLevel(value: number): number {
  return Math.min(GENOME_BUCKET_COUNT - 1, Math.floor(value * GENOME_BUCKET_COUNT));
}

/**
 * Return the hex color for a genome intensity level.
 *
 * Uses a yellow ramp aligned with fingerprint ring 3 styling.
 */
export function genomeColor(level: number): string {
  const clamped = Math.min(GENOME_BUCKET_COUNT - 1, Math.max(0, level));
  const t = clamped / (GENOME_BUCKET_COUNT - 1);
  return lerpHexColor(ANALYTICS_CHART_BACKGROUND, FINGERPRINT_RING_YELLOW, 0.3 + t * 0.7);
}

/**
 * Return the hex color for one fingerprint ring segment by ring index and intensity.
 *
 * Cycles through analytics chart colors: blue → teal → purple → yellow.
 */
export function fingerprintSegmentColor(ring: number, intensity: number): string {
  const hex = ANALYTICS_CHART_COLORS[ring % 4] ?? ANALYTICS_CHART_COLORS[0];
  return analyticsColorWithIntensity(hex, intensity);
}

/**
 * Return the hex color for a heatmap cell at the given intensity.
 *
 * Uses teal on a dark base with a low-intensity noise floor.
 */
export function heatmapColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  if (t < 0.04) return "#1e1e1e";
  return lerpHexColor(ANALYTICS_CHART_BACKGROUND, FINGERPRINT_RING_TEAL, t);
}

/**
 * Compute fingerprint ring segments by averaging normalized dimensions per ring/segment.
 */
export function computeFingerprint(normalized: number[]): FingerprintSegment[] {
  const dimsPerRing = EMBEDDING_DIMENSIONS / FINGERPRINT_RING_COUNT;
  const dimsPerSegment = dimsPerRing / FINGERPRINT_SEGMENTS_PER_RING;
  const segments: FingerprintSegment[] = [];

  for (let ring = 0; ring < FINGERPRINT_RING_COUNT; ring++) {
    const ringOffset = ring * dimsPerRing;
    for (let segment = 0; segment < FINGERPRINT_SEGMENTS_PER_RING; segment++) {
      const start = ringOffset + segment * dimsPerSegment;
      segments.push({
        ring,
        segment,
        intensity: averageBucket(normalized, start, dimsPerSegment),
      });
    }
  }

  return segments;
}

/**
 * Return cached or freshly computed visualization data for one chunk embedding.
 *
 * Results are memoized by `chunkId` for the lifetime of the page session.
 */
export function getEmbeddingVisualizations(
  chunkId: string,
  embedding: number[]
): EmbeddingVisualizationCache {
  const cached = visualizationCache.get(chunkId);
  if (cached) return cached;

  const normalized = minMaxNormalize(embedding);
  const entry: EmbeddingVisualizationCache = {
    normalized,
    genome: computeGenome(normalized),
    fingerprint: computeFingerprint(normalized),
    norm: vectorNorm(embedding),
    rawFormatted: `[${embedding.map((value) => value.toFixed(6)).join(", ")}]`,
  };

  visualizationCache.set(chunkId, entry);
  return entry;
}

/**
 * Format an ISO timestamp for display in the embedding inspector footer.
 */
export function formatGeneratedAt(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
