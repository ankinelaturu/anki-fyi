import {
  ASSISTANT_CORPUS_URL,
  ASSISTANT_VECTORS_URL,
  EMBEDDING_MODEL,
} from "@/lib/assistant/config";
import type { CorpusChunk, CorpusFile, VectorsFile } from "@/lib/assistant/types";

export type ChunkEmbeddingInfo = {
  chunkId: string;
  section: string;
  filePath: string;
  textLength: number;
  embedding: number[];
};

export type EmbeddingIndexMeta = {
  modelShortName: string;
  generatedAt: string;
};

export type FileChunkEmbeddings = {
  metadata: ChunkEmbeddingInfo | null;
  bySection: Map<string, ChunkEmbeddingInfo>;
  indexMeta: EmbeddingIndexMeta;
};

let indexPromise: Promise<void> | null = null;
let chunksByPath: Map<string, CorpusChunk[]> | null = null;
let vectorsByChunkId: Map<string, number[]> | null = null;
let indexMeta: EmbeddingIndexMeta | null = null;

export function normalizeSectionKey(section: string): string {
  return section.trim().toLowerCase();
}

export function embeddingModelShortName(model = EMBEDDING_MODEL): string {
  const slash = model.lastIndexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

export function formatEmbeddingForTooltip(embedding: number[]): string {
  return `[${embedding.map((value) => value.toFixed(6)).join(", ")}]`;
}

function toChunkEmbeddingInfo(chunk: CorpusChunk, embedding: number[]): ChunkEmbeddingInfo {
  return {
    chunkId: chunk.id,
    section: chunk.section,
    filePath: chunk.path,
    textLength: chunk.text.length,
    embedding,
  };
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

export async function ensureEditorEmbeddingIndex(): Promise<void> {
  if (!indexPromise) {
    indexPromise = loadEditorEmbeddingIndex();
  }
  await indexPromise;
}

export async function getFileChunkEmbeddings(path: string): Promise<FileChunkEmbeddings> {
  await ensureEditorEmbeddingIndex();

  const chunks = chunksByPath?.get(path) ?? [];
  const bySection = new Map<string, ChunkEmbeddingInfo>();
  let metadata: ChunkEmbeddingInfo | null = null;

  for (const chunk of chunks) {
    const embedding = vectorsByChunkId?.get(chunk.id);
    if (!embedding) continue;

    const info = toChunkEmbeddingInfo(chunk, embedding);

    if (chunk.section === "Metadata") {
      metadata = info;
      continue;
    }

    bySection.set(normalizeSectionKey(chunk.section), info);
  }

  return {
    metadata,
    bySection,
    indexMeta: indexMeta ?? {
      modelShortName: embeddingModelShortName(),
      generatedAt: "",
    },
  };
}
