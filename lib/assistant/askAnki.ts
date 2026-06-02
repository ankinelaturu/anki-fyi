import {
  GEMMA_LOAD_ERROR,
  REFUSAL_MESSAGE,
  WEBGPU_UNSUPPORTED_MESSAGE,
} from "@/lib/assistant/config";
import { createGemmaWebLLMProvider } from "@/lib/assistant/modelProvider";
import {
  ANKI_MISSING_INFO_REPLY,
  ASK_ANKI_SYSTEM_PROMPT,
  buildContextFromChunks,
} from "@/lib/assistant/prompt";
import { shouldRefuseQuestion } from "@/lib/assistant/profileGuard";
import type { AskAnkiCallbacks, AskAnkiResponse, AskAnkiSource } from "@/lib/assistant/types";
import { ensureVectorIndex, searchSimilar } from "@/lib/assistant/vectorIndex";
import { isWebGPUAvailable } from "@/lib/assistant/webgpu";

const chatModel = createGemmaWebLLMProvider();

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

export async function askAnki(
  question: string,
  callbacks?: AskAnkiCallbacks
): Promise<AskAnkiResponse> {
  const q = question.trim();
  if (!q) {
    return { answer: "", sources: [], refused: false };
  }

  callbacks?.onStatus?.("Loading corpus...");
  await ensureVectorIndex();

  const results = await searchSimilar(q, undefined, callbacks?.onStatus);

  if (shouldRefuseQuestion(q, results)) {
    return {
      answer: REFUSAL_MESSAGE,
      sources: [],
      refused: true,
    };
  }

  const chunks = results.map((r) => r.chunk);
  const sources = dedupeSourcesByPath(
    results.map((r) => ({
      path: r.chunk.path,
      title: r.chunk.title,
      score: r.score,
    }))
  );

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
  } catch {
    return {
      answer: GEMMA_LOAD_ERROR,
      sources: [],
      refused: false,
    };
  }

  callbacks?.onStatus?.("Answering from local context...");
  const context = buildContextFromChunks(chunks);

  try {
    const answer = await chatModel.generate(
      {
        system: ASK_ANKI_SYSTEM_PROMPT,
        question: q,
        context,
      },
      { onToken: callbacks?.onToken }
    );

    return {
      answer: answer || ANKI_MISSING_INFO_REPLY,
      sources,
      refused: false,
    };
  } catch {
    return {
      answer: GEMMA_LOAD_ERROR,
      sources: [],
      refused: false,
    };
  }
}
