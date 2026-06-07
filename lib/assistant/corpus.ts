import { ASSISTANT_CORPUS_URL } from "@/lib/assistant/config";
import type { CorpusFile } from "@/lib/assistant/types";

let corpusPromise: Promise<CorpusFile> | null = null;

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

/** Clear cached corpus (tests). */
export function resetCorpusCache(): void {
  corpusPromise = null;
}
