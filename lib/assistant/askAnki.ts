import {
  GEMMA_CONTEXT_TOP_K,
  GEMMA_GENERATE_ERROR_HEADING,
  GEMMA_LOAD_ERROR_HEADING,
  REFUSAL_MESSAGE,
  WEBGPU_UNSUPPORTED_MESSAGE,
} from "@/lib/assistant/config";
import { enrichAnswerWithContextLinks } from "@/lib/assistant/answerLinks";
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

function formatGemmaFailure(heading: string, error: unknown): string {
  const detail =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return detail && !heading.includes(detail) ? `${heading}\n\n${detail}` : heading;
}

function isContextWindowExceeded(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ContextWindowSizeExceededError" ||
    error.message.includes("context window size") ||
    error.message.includes("Prompt tokens exceed")
  );
}

function logGemmaFailure(phase: "load" | "generate", error: unknown, question: string): void {
  console.error(`[Ask Anki] Gemma ${phase} failed`, {
    question,
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

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

  if (process.env.NODE_ENV === "development") {
    const top = results[0];
    console.debug("[Ask Anki] retrieval", {
      question: q,
      topScore: top?.score ?? null,
      topPath: top?.chunk.path ?? null,
      resultCount: results.length,
    });
  }

  if (shouldRefuseQuestion(q, results)) {
    return {
      answer: REFUSAL_MESSAGE,
      sources: [],
      refused: true,
    };
  }

  const contextChunks = results.slice(0, GEMMA_CONTEXT_TOP_K).map((r) => r.chunk);
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
  } catch (error) {
    logGemmaFailure("load", error, q);
    return {
      answer: formatGemmaFailure(GEMMA_LOAD_ERROR_HEADING, error),
      sources,
      refused: false,
    };
  }

  callbacks?.onStatus?.("Answering from local context...");
  const context = buildContextFromChunks(contextChunks);

  try {
    const generated = await chatModel.generate(
      {
        system: ASK_ANKI_SYSTEM_PROMPT,
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
