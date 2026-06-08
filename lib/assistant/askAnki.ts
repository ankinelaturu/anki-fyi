/**
 * Ask Anki orchestration — end-to-end question answering pipeline.
 *
 * Coordinates metadata shortcuts, vector retrieval, refusal guardrails, active-file
 * context pinning, local Gemma generation, and post-answer link enrichment.
 */

import {
  GEMMA_CONTEXT_TOP_K,
  GEMMA_GENERATE_ERROR_HEADING,
  GEMMA_LOAD_ERROR_HEADING,
  GEMMA_RETRIEVED_ACTIVE_REF_K,
  GEMMA_RETRIEVED_WITH_ACTIVE_K,
  REFUSAL_MESSAGE,
  WEBGPU_UNSUPPORTED_MESSAGE,
} from "@/lib/assistant/config";
import { buildActiveFileChunks } from "@/lib/assistant/activeFileContext";
import { isActiveFileReference } from "@/lib/assistant/activeFileReference";
import { enrichAnswerWithContextLinks } from "@/lib/assistant/answerLinks";
import { createGemmaWebLLMProvider } from "@/lib/assistant/modelProvider";
import {
  ANKI_MISSING_INFO_REPLY,
  buildAskAnkiSystemPrompt,
  buildContextFromChunks,
  buildHybridContext,
} from "@/lib/assistant/prompt";
import { shouldRefuseQuestion } from "@/lib/assistant/profileGuard";
import type {
  AskAnkiCallbacks,
  AskAnkiRequest,
  AskAnkiResponse,
  AskAnkiSource,
  CorpusChunk,
  RetrievalResult,
} from "@/lib/assistant/types";
import { loadCorpus } from "@/lib/assistant/corpus";
import { answerMetadataQuery, parseMetadataQuery } from "@/lib/assistant/metadataQuery";
import { ensureVectorIndex, searchSimilar } from "@/lib/assistant/vectorIndex";
import { isWebGPUAvailable } from "@/lib/assistant/webgpu";

const chatModel = createGemmaWebLLMProvider();

/**
 * Normalize a bare question string or full request object into `AskAnkiRequest`.
 */
export function normalizeAskAnkiRequest(input: string | AskAnkiRequest): AskAnkiRequest {
  if (typeof input === "string") {
    return { question: input };
  }
  return input;
}

/**
 * Format a user-facing error heading with optional underlying error detail.
 */
function formatGemmaFailure(heading: string, error: unknown): string {
  const detail =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return detail && !heading.includes(detail) ? `${heading}\n\n${detail}` : heading;
}

/**
 * Detect Gemma/WebLLM context-window overflow errors for a tailored message.
 */
function isContextWindowExceeded(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ContextWindowSizeExceededError" ||
    error.message.includes("context window size") ||
    error.message.includes("Prompt tokens exceed")
  );
}

/**
 * Structured console error for Gemma load/generate failures in development.
 */
function logGemmaFailure(phase: "load" | "generate", error: unknown, question: string): void {
  console.error(`[Ask Anki] Gemma ${phase} failed`, {
    question,
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

/**
 * Deduplicate citation sources by path, keeping the highest similarity score.
 */
function dedupeSourcesByPath(sources: AskAnkiSource[]): AskAnkiSource[] {
  const byPath = new Map<string, AskAnkiSource>();
  for (const source of sources) {
    const existing = byPath.get(source.path);
    if (!existing || source.score > existing.score) {
      byPath.set(source.path, source);
    }
  }
  return [...byPath.values()].sort((a, b) => b.score - a.score);
}

/**
 * Deduplicate chunks by id while preserving first-seen order.
 */
function dedupeChunksById(chunks: CorpusChunk[]): CorpusChunk[] {
  const seen = new Set<string>();
  const out: CorpusChunk[] = [];
  for (const chunk of chunks) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    out.push(chunk);
  }
  return out;
}

/**
 * Select up to `limit` retrieved chunks, optionally excluding the active file path.
 */
function selectRetrievedChunks(
  results: RetrievalResult[],
  activePath: string | undefined,
  limit: number
): CorpusChunk[] {
  const chunks: CorpusChunk[] = [];
  for (const result of results) {
    if (activePath && result.chunk.path === activePath) continue;
    chunks.push(result.chunk);
    if (chunks.length >= limit) break;
  }
  return chunks;
}

/**
 * Build UI citation sources from active file and retrieval results.
 *
 * Pins the active file at score 1 when present and deduplicates by path.
 */
function buildSources(
  activeFile: AskAnkiRequest["activeFile"],
  results: RetrievalResult[]
): AskAnkiSource[] {
  const sources: AskAnkiSource[] = [];

  if (activeFile) {
    sources.push({
      path: activeFile.path,
      title: activeFile.title,
      score: 1,
    });
  }

  for (const result of results) {
    if (activeFile && result.chunk.path === activeFile.path) continue;
    sources.push({
      path: result.chunk.path,
      title: result.chunk.title,
      score: result.score,
    });
  }

  const deduped = dedupeSourcesByPath(sources);
  if (!activeFile) return deduped;

  const active = deduped.find((source) => source.path === activeFile.path);
  const rest = deduped.filter((source) => source.path !== activeFile.path);
  return active ? [active, ...rest] : deduped;
}

/**
 * Answer a portfolio question using retrieval-augmented local generation.
 *
 * Short-circuits empty input, metadata list queries, off-topic refusals, and
 * missing WebGPU. Streams status/token callbacks when provided.
 */
export async function askAnki(
  input: string | AskAnkiRequest,
  callbacks?: AskAnkiCallbacks
): Promise<AskAnkiResponse> {
  const { question, activeFile } = normalizeAskAnkiRequest(input);
  const q = question.trim();
  if (!q) {
    return { answer: "", sources: [], refused: false };
  }

  const activeFileRef = isActiveFileReference(q);
  const activeChunks = activeFile ? buildActiveFileChunks(activeFile) : [];

  callbacks?.onStatus?.("Loading corpus...");
  const corpus = await loadCorpus();

  const metadataQuery = parseMetadataQuery(q, corpus);
  if (metadataQuery.action !== "none") {
    callbacks?.onStatus?.("Answering from workspace metadata...");
    return answerMetadataQuery(metadataQuery, corpus);
  }

  await ensureVectorIndex();

  const results = await searchSimilar(q, undefined, callbacks?.onStatus);

  if (process.env.NODE_ENV === "development") {
    const top = results[0];
    console.debug("[Ask Anki] retrieval", {
      question: q,
      activePath: activeFile?.path ?? null,
      activeFileRef,
      topScore: top?.score ?? null,
      topPath: top?.chunk.path ?? null,
      resultCount: results.length,
    });
  }

  if (shouldRefuseQuestion(q, results, { activeFile })) {
    return {
      answer: REFUSAL_MESSAGE,
      sources: [],
      refused: true,
    };
  }

  const retrievedLimit = activeFile
    ? activeFileRef
      ? GEMMA_RETRIEVED_ACTIVE_REF_K
      : GEMMA_RETRIEVED_WITH_ACTIVE_K
    : GEMMA_CONTEXT_TOP_K;

  const retrievedChunks = selectRetrievedChunks(results, activeFile?.path, retrievedLimit);
  const contextChunks = dedupeChunksById([...activeChunks, ...retrievedChunks]);

  const context =
    activeChunks.length > 0
      ? buildHybridContext(activeChunks, retrievedChunks)
      : buildContextFromChunks(contextChunks.slice(0, GEMMA_CONTEXT_TOP_K));

  const sources = buildSources(activeFile, results);

  const webgpu = await isWebGPUAvailable();
  if (!webgpu) {
    return {
      answer: WEBGPU_UNSUPPORTED_MESSAGE,
      sources: [],
      refused: false,
    };
  }

  callbacks?.onStatus?.("Loading Gemma (first use downloads model weights)...");
  try {
    await chatModel.load((message) => callbacks?.onStatus?.(message));
  } catch (error) {
    logGemmaFailure("load", error, q);
    return {
      answer: formatGemmaFailure(GEMMA_LOAD_ERROR_HEADING, error),
      sources,
      refused: false,
    };
  }

  callbacks?.onStatus?.("Answering from local context...");
  const system = buildAskAnkiSystemPrompt(Boolean(activeFile));

  try {
    const generated = await chatModel.generate(
      {
        system,
        question: q,
        context,
      },
      { onToken: callbacks?.onToken }
    );

    const baseAnswer = generated || ANKI_MISSING_INFO_REPLY;
    const answer = enrichAnswerWithContextLinks(baseAnswer, contextChunks);

    return {
      answer,
      sources,
      refused: false,
    };
  } catch (error) {
    logGemmaFailure("generate", error, q);
    const heading = isContextWindowExceeded(error)
      ? "The retrieved context was too large for the local Gemma model (4096 token window). Try a more specific question."
      : GEMMA_GENERATE_ERROR_HEADING;
    return {
      answer: formatGemmaFailure(heading, error),
      sources,
      refused: false,
    };
  }
}
