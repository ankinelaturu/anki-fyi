import {
  ASSISTANT_CORPUS_URL,
  ASSISTANT_VECTORS_URL,
} from "@/lib/assistant/config";
import type { CorpusChunk, CorpusFile, VectorsFile } from "@/lib/assistant/types";

export type FileChunkEmbeddings = {
  metadata: number[] | null;
  bySection: Map<string, number[]>;
};

let indexPromise: Promise<void> | null = null;
let chunksByPath: Map<string, CorpusChunk[]> | null = null;
let vectorsByChunkId: Map<string, number[]> | null = null;

export function normalizeSectionKey(section: string): string {
  return section.trim().toLowerCase();
}

export function formatEmbeddingForTooltip(embedding: number[]): string {
  return `[${embedding.map((value) => value.toFixed(6)).join(", ")}]`;
}

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

  vectorsByChunkId = new Map(vectors.vectors.map((entry) => [entry.chunkId, entry.embedding]));

  chunksByPath = new Map<string, CorpusChunk[]>();
  for (const chunk of corpus.chunks) {
    const list = chunksByPath.get(chunk.path) ?? [];
    list.push(chunk);
    chunksByPath.set(chunk.path, list);
  }
}

export async function ensureEditorEmbeddingIndex(): Promise<void> {
  if (!indexPromise) {
    indexPromise = loadEditorEmbeddingIndex();
  }
  await indexPromise;
}

export async function getFileChunkEmbeddings(path: string): Promise<FileChunkEmbeddings> {
  await ensureEditorEmbeddingIndex();

  const chunks = chunksByPath?.get(path) ?? [];
  const bySection = new Map<string, number[]>();
  let metadata: number[] | null = null;

  for (const chunk of chunks) {
    const embedding = vectorsByChunkId?.get(chunk.id);
    if (!embedding) continue;

    if (chunk.section === "Metadata") {
      metadata = embedding;
      continue;
    }

    bySection.set(normalizeSectionKey(chunk.section), embedding);
  }

  return { metadata, bySection };
}
