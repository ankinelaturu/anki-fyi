import {
  ANALYTICS_CHART_BACKGROUND,
  ANALYTICS_CHART_COLORS,
  analyticsColorWithIntensity,
  FINGERPRINT_RING_TEAL,
  FINGERPRINT_RING_YELLOW,
  lerpHexColor,
} from "@/lib/analytics/chartColors";

export const EMBEDDING_DIMENSIONS = 384;
export const GENOME_CELL_COUNT = 96;
export const GENOME_BUCKET_COUNT = 8;
export const FINGERPRINT_RING_COUNT = 4;
export const FINGERPRINT_SEGMENTS_PER_RING = 48;
export const HEATMAP_COLS = 64;
export const HEATMAP_ROWS = 6;

export type FingerprintSegment = {
  ring: number;
  segment: number;
  intensity: number;
};

export type EmbeddingVisualizationCache = {
  normalized: number[];
  genome: number[];
  fingerprint: FingerprintSegment[];
  norm: number;
  rawFormatted: string;
};

const visualizationCache = new Map<string, EmbeddingVisualizationCache>();

export function vectorNorm(embedding: number[]): number {
  return Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
}

export function minMaxNormalize(embedding: number[]): number[] {
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);
  const range = max - min;
  if (range === 0) return embedding.map(() => 0.5);
  return embedding.map((value) => (value - min) / range);
}

function averageBucket(values: number[], start: number, size: number): number {
  let sum = 0;
  for (let index = 0; index < size; index++) {
    sum += values[start + index] ?? 0;
  }
  return sum / size;
}

export function computeGenome(normalized: number[]): number[] {
  const bucketSize = EMBEDDING_DIMENSIONS / GENOME_CELL_COUNT;
  const genome: number[] = [];
  for (let cell = 0; cell < GENOME_CELL_COUNT; cell++) {
    genome.push(averageBucket(normalized, cell * bucketSize, bucketSize));
  }
  return genome;
}

export function genomeIntensityLevel(value: number): number {
  return Math.min(GENOME_BUCKET_COUNT - 1, Math.floor(value * GENOME_BUCKET_COUNT));
}

/** Genome ramp — fingerprint yellow (ring 3). */
export function genomeColor(level: number): string {
  const clamped = Math.min(GENOME_BUCKET_COUNT - 1, Math.max(0, level));
  const t = clamped / (GENOME_BUCKET_COUNT - 1);
  return lerpHexColor(ANALYTICS_CHART_BACKGROUND, FINGERPRINT_RING_YELLOW, 0.3 + t * 0.7);
}

/** Fingerprint rings: blue → teal → purple → yellow (bubble snapshot alts). */
export function fingerprintSegmentColor(ring: number, intensity: number): string {
  const hex = ANALYTICS_CHART_COLORS[ring % 4] ?? ANALYTICS_CHART_COLORS[0];
  return analyticsColorWithIntensity(hex, intensity);
}

/** Heatmap — snapshot teal (fingerprint ring 1) on dark base. */
export function heatmapColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  if (t < 0.04) return "#1e1e1e";
  return lerpHexColor(ANALYTICS_CHART_BACKGROUND, FINGERPRINT_RING_TEAL, t);
}

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
