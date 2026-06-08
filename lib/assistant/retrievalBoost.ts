/**
 * Intent-aware retrieval post-processing for vector search results.
 *
 * Injects pinned chunks for common question patterns (e.g. "tell me about
 * yourself") before merging with cosine-ranked hits.
 */

import type { CorpusChunk, RetrievalResult } from "@/lib/assistant/types";

const ABOUT_ME_RE =
  /\b(about\s+(yourself|your\s+self|me)|tell\s+me\s+about\s+(yourself|you)|who\s+are\s+you|introduce\s+yourself)\b/i;

/**
 * Workspace paths whose first chunk is pinned when the visitor asks for an introduction.
 */
export const ABOUT_ME_PINNED_PATHS = ["about/about-anki.md", "about/resume.md"] as const;

/**
 * Detect self-introduction style questions that should surface bio/resume content.
 */
export function isAboutMeQuestion(question: string): boolean {
  return ABOUT_ME_RE.test(question.trim());
}

/**
 * Merge boosted (pinned) chunks with cosine-ranked results, deduplicating by chunk id.
 *
 * Pinned chunks receive a score of 1 and appear before vector hits. The output
 * is capped at `topK` total results.
 */
export function mergeRetrievalWithBoost(
  question: string,
  scored: RetrievalResult[],
  chunksByPath: Map<string, CorpusChunk>,
  topK: number
): RetrievalResult[] {
  const merged: RetrievalResult[] = [];
  const seen = new Set<string>();

  const add = (result: RetrievalResult) => {
    if (seen.has(result.chunk.id)) return;
    seen.add(result.chunk.id);
    merged.push(result);
  };

  if (isAboutMeQuestion(question)) {
    for (const path of ABOUT_ME_PINNED_PATHS) {
      const chunk = chunksByPath.get(path);
      if (chunk) add({ chunk, score: 1 });
    }
  }

  for (const result of scored) {
    add(result);
    if (merged.length >= topK) break;
  }

  return merged.slice(0, topK);
}
