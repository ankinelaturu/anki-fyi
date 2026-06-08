/**
 * Shared TypeScript types for the Ask Anki assistant pipeline.
 *
 * Covers the offline corpus/vector artifacts, retrieval results, and the
 * request/response contract between the terminal UI and `askAnki`.
 */

import type { CorpusFrontMatter } from "@/lib/assistant/frontMatter";

export type { CorpusFrontMatter } from "@/lib/assistant/frontMatter";

/**
 * A single searchable text unit derived from a workspace markdown document.
 *
 * Each chunk carries provenance (`documentId`, `path`, `title`, `kind`) and a
 * human-readable `section` heading so retrieval and prompt assembly can cite
 * the correct part of a file.
 */
export type CorpusChunk = {
  id: string;
  documentId: string;
  path: string;
  title: string;
  kind: string;
  section: string;
  text: string;
  chunkIndex: number;
};

/**
 * A workspace document with frontmatter metadata and its derived chunks.
 *
 * Mirrors the structure emitted by `build-corpus` and stored in
 * `public/assistant/corpus.json`.
 */
export type CorpusDocument = {
  id: string;
  path: string;
  title: string;
  kind: string;
  /** Parsed YAML front matter — source of truth for metadata queries. */
  frontMatter: CorpusFrontMatter;
  summary?: string;
  elevatorPitch?: string;
  order?: number;
  importance?: string;
  startDate?: string;
  company?: string;
  technologies?: string[];
  type?: string;
  tags: string[];
  content: string;
  chunks: CorpusChunk[];
};

/**
 * On-disk corpus artifact produced by the build script.
 *
 * Includes a content hash so the runtime can verify that precomputed vectors
 * match the loaded document set.
 */
export type CorpusFile = {
  version: number;
  corpusHash: string;
  generatedAt: string;
  documents: CorpusDocument[];
  chunks: CorpusChunk[];
};

/**
 * Precomputed embedding vectors aligned to corpus chunks.
 *
 * Paired with `CorpusFile` via matching `corpusHash` values.
 */
export type VectorsFile = {
  version: number;
  corpusHash: string;
  embeddingModel: string;
  vectors: { chunkId: string; embedding: number[] }[];
};

/**
 * A corpus chunk joined with its embedding vector for similarity search.
 */
export type IndexedChunk = CorpusChunk & {
  embedding: number[];
};

/**
 * One chunk returned from vector search with a cosine-similarity score.
 */
export type RetrievalResult = {
  chunk: CorpusChunk;
  score: number;
};

/**
 * Snapshot of the file currently open in the workspace editor.
 *
 * Passed to `askAnki` so questions like "what did you do here?" can be
 * answered from live editor content instead of stale corpus data alone.
 */
export type AskAnkiActiveFile = {
  slug: string;
  path: string;
  title: string;
  kind?: string;
  summary?: string;
  elevatorPitch?: string;
  tags?: string[];
  technologies?: string[];
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  year?: string | number;
  status?: string;
  linksBlock?: string;
  content: string;
  type?: string;
};

/**
 * Input to the Ask Anki pipeline from the terminal or API route.
 */
export type AskAnkiRequest = {
  question: string;
  activeFile?: AskAnkiActiveFile;
};

/**
 * A workspace source cited in an Ask Anki response for UI display.
 */
export type AskAnkiSource = {
  path: string;
  title: string;
  score: number;
};

/**
 * Final result returned by `askAnki`, including the generated answer,
 * deduplicated sources, and whether the question was refused outright.
 */
export type AskAnkiResponse = {
  answer: string;
  sources: AskAnkiSource[];
  refused: boolean;
};

/**
 * Optional streaming/status hooks used by the terminal UI during retrieval
 * and local Gemma generation.
 */
export type AskAnkiCallbacks = {
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
};
