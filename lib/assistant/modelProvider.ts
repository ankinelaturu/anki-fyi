/**
 * Local Gemma chat model provider backed by WebLLM (`@mlc-ai/web-llm`).
 *
 * Handles model fallback selection, weight download progress, and streaming
 * token generation within the browser's WebGPU runtime.
 */

import {
  GEMMA_LOAD_ERROR_HEADING,
  GEMMA_MAX_NEW_TOKENS,
  GEMMA_MODEL_FALLBACK_CHAIN,
} from "@/lib/assistant/config";
import { ASK_ANKI_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/assistant/prompt";

/**
 * Inputs assembled by `askAnki` for a single generation turn.
 */
export type LocalModelInput = {
  system: string;
  question: string;
  context: string;
};

/**
 * Abstraction over a locally loaded chat model with streaming support.
 */
export type LocalChatModel = {
  load(onProgress?: (message: string) => void): Promise<void>;
  generate(
    input: LocalModelInput,
    callbacks?: { onToken?: (token: string) => void }
  ): Promise<string>;
  getLoadedModelId(): string | null;
};

type WebLLMModule = typeof import("@mlc-ai/web-llm");

/**
 * Case-insensitive check that a WebLLM model id refers to Gemma.
 */
function isGemmaModelId(modelId: string): boolean {
  return modelId.toLowerCase().includes("gemma");
}

/**
 * List all Gemma model ids advertised in the WebLLM prebuilt app config.
 */
function listGemmaModelIds(webllm: WebLLMModule): string[] {
  const config = webllm.prebuiltAppConfig;
  return config.model_list
    .map((record) => record.model_id)
    .filter((id) => isGemmaModelId(id));
}

/**
 * Build an ordered fallback chain intersecting config preferences with availability.
 *
 * Falls back to the shortest low-resource Gemma ids if none of the preferred
 * chain entries are present. Throws if no Gemma model exists at all.
 */
function buildFallbackChain(webllm: WebLLMModule): string[] {
  const available = new Set(listGemmaModelIds(webllm));
  const ordered: string[] = [];

  for (const id of GEMMA_MODEL_FALLBACK_CHAIN) {
    if (available.has(id)) ordered.push(id);
  }

  if (ordered.length > 0) return ordered;

  const lowResource = [...available]
    .filter((id) => id.includes("1k") || id.includes("2b"))
    .sort((a, b) => a.length - b.length);

  if (lowResource.length > 0) return lowResource;

  throw new Error(
    "No Gemma model is available in WebLLM config. Do not substitute another model."
  );
}

/**
 * Create a singleton-style Gemma WebLLM provider for Ask Anki.
 *
 * Tries each candidate model id in the fallback chain on load failure.
 * Generation resets chat state, streams tokens, and trims the final string.
 */
export function createGemmaWebLLMProvider(): LocalChatModel {
  let engine: import("@mlc-ai/web-llm").MLCEngineInterface | null = null;
  let loadedModelId: string | null = null;

  return {
    getLoadedModelId() {
      return loadedModelId;
    },

    async load(onProgress) {
      if (engine) return;

      const webllm = await import("@mlc-ai/web-llm");
      const candidates = buildFallbackChain(webllm);
      let lastError: unknown;

      for (const modelId of candidates) {
        try {
          onProgress?.(`Loading Gemma (${modelId})...`);
          engine = await webllm.CreateMLCEngine(modelId, {
            initProgressCallback: (report) => {
              onProgress?.(report.text);
            },
          });
          loadedModelId = modelId;
          return;
        } catch (error) {
          lastError = error;
          engine = null;
          loadedModelId = null;
          console.warn(`[Ask Anki] Gemma load failed for ${modelId}:`, error);
        }
      }

      throw new Error(
        `${GEMMA_LOAD_ERROR_HEADING}\n${lastError instanceof Error ? lastError.message : String(lastError)}`
      );
    },

    async generate(input, callbacks) {
      if (!engine) {
        throw new Error(GEMMA_LOAD_ERROR_HEADING);
      }

      await engine.resetChat();

      const userContent = buildUserPrompt(input.question, input.context);
      const messages = [
        { role: "system" as const, content: input.system || ASK_ANKI_SYSTEM_PROMPT },
        { role: "user" as const, content: userContent },
      ];

      const stream = await engine.chat.completions.create({
        messages,
        temperature: 0.2,
        max_tokens: GEMMA_MAX_NEW_TOKENS,
        stream: true,
        stream_options: { include_usage: false },
      });

      let full = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          full += delta;
          callbacks?.onToken?.(delta);
        }
      }

      return full.trim();
    },
  };
}
