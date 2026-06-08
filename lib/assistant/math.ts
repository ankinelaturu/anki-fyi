/**
 * Vector math helpers for embedding normalization and cosine similarity.
 *
 * Assumes embeddings are already L2-normalized when computing similarity;
 * `cosineSimilarity` therefore returns the dot product directly.
 */

/**
 * L2-normalize a numeric vector in place conceptually (returns a new array).
 *
 * Divides each component by the Euclidean norm. Uses norm 1 as a fallback
 * for zero vectors to avoid division by zero.
 */
export function normalizeVector(vector: number[]): number[] {
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Cosine similarity between two vectors of equal or differing length.
 *
 * Compares only the overlapping prefix (`min(a.length, b.length)`). When both
 * inputs are unit-normalized, this equals the cosine of the angle between them.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) dot += a[i]! * b[i]!;
  return dot;
}
