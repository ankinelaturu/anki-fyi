import { ASSISTANT_CORPUS_URL, ASSISTANT_TOP_K, ASSISTANT_VECTORS_URL } from "@/lib/assistant/config";
import { createEmbeddingProvider } from "@/lib/assistant/embeddings";
import { cosineSimilarity } from "@/lib/assistant/math";
import { mergeRetrievalWithBoost } from "@/lib/assistant/retrievalBoost";
import type {
  CorpusChunk,
  CorpusFile,
  IndexedChunk,
  RetrievalResult,
  VectorsFile,
} from "@/lib/assistant/types";

const embeddingProvider = createEmbeddingProvider();

let indexPromise: Promise<IndexedChunk[]> | null = null;
let corpusHash: string | null = null;

async function loadIndexedChunks(): Promise<IndexedChunk[]> {
  const [corpusRes, vectorsRes] = await Promise.all([
    fetch(ASSISTANT_CORPUS_URL),
    fetch(ASSISTANT_VECTORS_URL),
  ]);

  if (!corpusRes.ok || !vectorsRes.ok) {
    throw new Error("Failed to load assistant corpus or vectors. Run pnpm build:corpus.");
  }

  const corpus = (await corpusRes.json()) as CorpusFile;
  const vectors = (await vectorsRes.json()) as VectorsFile;

  if (corpus.corpusHash !== vectors.corpusHash) {
    throw new Error("Assistant corpus and vectors hash mismatch. Run pnpm build:corpus.");
  }

  corpusHash = corpus.corpusHash;
  const vectorMap = new Map(vectors.vectors.map((v) => [v.chunkId, v.embedding]));

  const indexed: IndexedChunk[] = [];
  for (const chunk of corpus.chunks) {
    const embedding = vectorMap.get(chunk.id);
    if (!embedding) continue;
    indexed.push({ ...chunk, embedding });
  }

  if (indexed.length === 0) {
    throw new Error("Assistant vector index is empty.");
  }

  return indexed;
}

export async function ensureVectorIndex(): Promise<IndexedChunk[]> {
  if (!indexPromise) {
    indexPromise = loadIndexedChunks();
  }
  return indexPromise;
}

export function getCorpusHash(): string | null {
  return corpusHash;
}

export async function searchSimilar(
  question: string,
  topK: number = ASSISTANT_TOP_K,
  onStatus?: (message: string) => void
): Promise<RetrievalResult[]> {
  const indexed = await ensureVectorIndex();
  await embeddingProvider.load(onStatus);
  onStatus?.("Searching workspace...");
  const queryEmbedding = await embeddingProvider.embed(question);

  const scored = indexed
    .map((chunk) => ({
      chunk: chunk as CorpusChunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score);

  const chunksByPath = new Map<string, CorpusChunk>();
  for (const item of indexed) {
    if (!chunksByPath.has(item.path)) {
      chunksByPath.set(item.path, item as CorpusChunk);
    }
  }

  return mergeRetrievalWithBoost(question, scored, chunksByPath, topK);
}
