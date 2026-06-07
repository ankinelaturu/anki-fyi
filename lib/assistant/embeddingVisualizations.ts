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
