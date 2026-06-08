/**
 * Corpus embedding lookup for the workspace embedding inspector.
 *
 * Loads precomputed vectors alongside chunk text and exposes per-file,
 * per-section views for the semantic editor and visualization panels.
 */

import {
  ASSISTANT_CORPUS_URL,
  ASSISTANT_VECTORS_URL,
  EMBEDDING_MODEL,
} from "@/lib/assistant/config";
import type { CorpusChunk, CorpusFile, VectorsFile } from "@/lib/assistant/types";

/**
 * One chunk's embedding plus display metadata for the inspector UI.
 */
export type ChunkEmbeddingInfo = {
  chunkId: string;
  section: string;
  filePath: string;
  textLength: number;
  /**
   * Full corpus chunk text including Title/Path/Section header lines.
   */
  text: string;
  embedding: number[];
};

/**
 * Strip the Title/Path/Section header prefix from formatted chunk text.
 *
 * Returns the markdown body used for editor display and stats.
 */
export function extractChunkBody(text: string): string {
  const lines = text.split("\n");
  let index = 0;
  if (lines[index]?.startsWith("Title:")) index++;
  if (lines[index]?.startsWith("Path:")) index++;
  if (lines[index]?.startsWith("Section:")) index++;
  while (lines[index] === "") index++;
  return lines.slice(index).join("\n").trim();
}

/**
 * Index-level metadata shown in the embedding inspector footer.
 */
export type EmbeddingIndexMeta = {
  modelShortName: string;
  generatedAt: string;
};

/**
 * All chunk embeddings for one workspace file, indexed by section key.
 */
export type FileChunkEmbeddings = {
  metadata: ChunkEmbeddingInfo | null;
  bySection: Map<string, ChunkEmbeddingInfo>;
  /**
   * Corpus chunks for this file in chunkIndex order (includes Metadata).
   */
  ordered: ChunkEmbeddingInfo[];
  indexMeta: EmbeddingIndexMeta;
};

let indexPromise: Promise<void> | null = null;
let chunksByPath: Map<string, CorpusChunk[]> | null = null;
let vectorsByChunkId: Map<string, number[]> | null = null;
let indexMeta: EmbeddingIndexMeta | null = null;

/**
 * Normalize a section heading for case-insensitive map lookups.
 */
export function normalizeSectionKey(section: string): string {
  return section.trim().toLowerCase();
}

/**
 * Return the short model name after the Hugging Face org prefix.
 */
export function embeddingModelShortName(model = EMBEDDING_MODEL): string {
  const slash = model.lastIndexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

/**
 * Format an embedding vector as a compact bracketed string for tooltips.
 */
export function formatEmbeddingForTooltip(embedding: number[]): string {
  return `[${embedding.map((value) => value.toFixed(6)).join(", ")}]`;
}

/**
 * Format one aligned floating-point value with fixed width for monospace display.
 */
function formatAlignedEmbeddingValue(value: number, precision: number): string {
  const sign = value < 0 ? "-" : " ";
  return sign + Math.abs(value).toFixed(precision);
}

/**
 * Format an embedding as multiple lines of space-separated aligned values.
 */
export function formatEmbeddingLines(
  embedding: number[],
  valuesPerLine = 8,
  precision = 8
): string {
  const lines: string[] = [];
  for (let index = 0; index < embedding.length; index += valuesPerLine) {
    const slice = embedding
      .slice(index, index + valuesPerLine)
      .map((value) => formatAlignedEmbeddingValue(value, precision));
    lines.push(slice.join(" "));
  }
  return lines.join("\n");
}

/**
 * Map a corpus chunk and embedding array into `ChunkEmbeddingInfo`.
 */
function toChunkEmbeddingInfo(chunk: CorpusChunk, embedding: number[]): ChunkEmbeddingInfo {
  return {
    chunkId: chunk.id,
    section: chunk.section,
    filePath: chunk.path,
    textLength: chunk.text.length,
    text: chunk.text,
    embedding,
  };
}

/**
 * Fetch corpus + vectors and build in-memory path/chunk indexes.
 */
async function loadEditorEmbeddingIndex(): Promise<void> {
  const [corpusRes, vectorsRes] = await Promise.all([
    fetch(ASSISTANT_CORPUS_URL),
    fetch(ASSISTANT_VECTORS_URL),
  ]);

  if (!corpusRes.ok || !vectorsRes.ok) {
    throw new Error("Failed to load assistant corpus or vectors.");
  }

  const corpus = (await corpusRes.json()) as CorpusFile;
  const vectors = (await vectorsRes.json()) as VectorsFile;

  if (corpus.corpusHash !== vectors.corpusHash) {
    throw new Error("Assistant corpus and vectors hash mismatch.");
  }

  indexMeta = {
    modelShortName: embeddingModelShortName(vectors.embeddingModel),
    generatedAt: corpus.generatedAt,
  };

  vectorsByChunkId = new Map(vectors.vectors.map((entry) => [entry.chunkId, entry.embedding]));

  chunksByPath = new Map<string, CorpusChunk[]>();
  for (const chunk of corpus.chunks) {
    const list = chunksByPath.get(chunk.path) ?? [];
    list.push(chunk);
    chunksByPath.set(chunk.path, list);
  }
}

/**
 * Ensure the editor embedding index is loaded once per session.
 */
export async function ensureEditorEmbeddingIndex(): Promise<void> {
  if (!indexPromise) {
    indexPromise = loadEditorEmbeddingIndex();
  }
  await indexPromise;
}

/**
 * Return all chunk embeddings for a workspace file path.
 *
 * Chunks without a matching vector entry are omitted. Results are sorted by
 * `chunkIndex` with a separate metadata entry when present.
 */
export async function getFileChunkEmbeddings(path: string): Promise<FileChunkEmbeddings> {
  await ensureEditorEmbeddingIndex();

  const chunks = [...(chunksByPath?.get(path) ?? [])].sort(
    (a, b) => a.chunkIndex - b.chunkIndex
  );
  const bySection = new Map<string, ChunkEmbeddingInfo>();
  const ordered: ChunkEmbeddingInfo[] = [];
  let metadata: ChunkEmbeddingInfo | null = null;

  for (const chunk of chunks) {
    const embedding = vectorsByChunkId?.get(chunk.id);
    if (!embedding) continue;

    const info = toChunkEmbeddingInfo(chunk, embedding);
    ordered.push(info);

    if (chunk.section === "Metadata") {
      metadata = info;
      continue;
    }

    bySection.set(normalizeSectionKey(chunk.section), info);
  }

  return {
    metadata,
    bySection,
    ordered,
    indexMeta: indexMeta ?? {
      modelShortName: embeddingModelShortName(),
      generatedAt: "",
    },
  };
}
