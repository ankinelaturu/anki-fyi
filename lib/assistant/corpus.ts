/**
 * Browser-side loader for the prebuilt assistant corpus artifact.
 *
 * Fetches `corpus.json` once per session and memoizes the result so retrieval,
 * metadata queries, and the editor embedding inspector share a single request.
 */

import { ASSISTANT_CORPUS_URL } from "@/lib/assistant/config";
import type { CorpusFile } from "@/lib/assistant/types";

let corpusPromise: Promise<CorpusFile> | null = null;

/**
 * Load and cache the assistant corpus from `public/assistant/corpus.json`.
 *
 * @throws If the fetch fails — usually means `pnpm build:corpus` was not run.
 */
export async function loadCorpus(): Promise<CorpusFile> {
  if (!corpusPromise) {
    corpusPromise = fetch(ASSISTANT_CORPUS_URL).then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to load assistant corpus. Run pnpm build:corpus.");
      }
      return (await response.json()) as CorpusFile;
    });
  }
  return corpusPromise;
}

/**
 * Clear the in-memory corpus cache.
 *
 * Intended for tests that need to reload corpus between cases.
 */
export function resetCorpusCache(): void {
  corpusPromise = null;
}
