/**
 * Local chat model providers backed by WebLLM (`@mlc-ai/web-llm`).
 *
 * Shared factory for Gemma (answer generation) and Qwen (metadata planning).
 */

import {
  GEMMA_LOAD_ERROR_HEADING,
  GEMMA_MAX_NEW_TOKENS,
  GEMMA_MODEL_FALLBACK_CHAIN,
  QWEN_PLANNER_LOAD_ERROR_HEADING,
  QWEN_PLANNER_MAX_NEW_TOKENS,
  QWEN_PLANNER_MODEL_FALLBACK_CHAIN,
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
 * Minimal input for JSON-only planner turns.
 */
export type PlannerModelInput = {
  system: string;
  question: string;
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
  generatePlanner(input: PlannerModelInput): Promise<string>;
  unload(): Promise<void>;
  getLoadedModelId(): string | null;
};

type WebLLMModule = typeof import("@mlc-ai/web-llm");

type WebLLMFactoryOptions = {
  label: string;
  modelFilter: (modelId: string) => boolean;
  fallbackChain: readonly string[];
  loadErrorHeading: string;
  maxNewTokens: number;
};

function buildFallbackChain(
  webllm: WebLLMModule,
  modelFilter: (modelId: string) => boolean,
  fallbackChain: readonly string[]
): string[] {
  const available = new Set(
    webllm.prebuiltAppConfig.model_list
      .map((record) => record.model_id)
      .filter(modelFilter)
  );

  const ordered: string[] = [];
  for (const id of fallbackChain) {
    if (available.has(id)) ordered.push(id);
  }
  if (ordered.length > 0) return ordered;

  const lowResource = [...available]
    .filter((id) => id.includes("1k") || id.includes("0.5B") || id.includes("0.6B"))
    .sort((a, b) => a.length - b.length);

  if (lowResource.length > 0) return lowResource;

  throw new Error(`No ${fallbackChain[0]?.split("-")[0] ?? "WebLLM"} model is available in WebLLM config.`);
}

function isGemmaModelId(modelId: string): boolean {
  return modelId.toLowerCase().includes("gemma");
}

function isQwenModelId(modelId: string): boolean {
  return modelId.toLowerCase().includes("qwen");
}

function qwenExtraBody(modelId: string): Record<string, unknown> | undefined {
  if (modelId.startsWith("Qwen3")) {
    return { enable_thinking: false };
  }
  return undefined;
}

/**
 * Create a WebLLM-backed chat model with model-specific fallback chain.
 */
export function createWebLLMChatModel(options: WebLLMFactoryOptions): LocalChatModel {
  let engine: import("@mlc-ai/web-llm").MLCEngineInterface | null = null;
  let loadedModelId: string | null = null;

  return {
    getLoadedModelId() {
      return loadedModelId;
    },

    async load(onProgress) {
      if (engine) return;

      const webllm = await import("@mlc-ai/web-llm");
      const candidates = buildFallbackChain(webllm, options.modelFilter, options.fallbackChain);
      let lastError: unknown;

      for (const modelId of candidates) {
        try {
          onProgress?.(`Loading ${options.label} (${modelId})...`);
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
          console.warn(`[Ask Anki] ${options.label} load failed for ${modelId}:`, error);
        }
      }

      throw new Error(
        `${options.loadErrorHeading}\n${lastError instanceof Error ? lastError.message : String(lastError)}`
      );
    },

    async generate(input, callbacks) {
      if (!engine) {
        throw new Error(options.loadErrorHeading);
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
        max_tokens: options.maxNewTokens,
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

    async generatePlanner(input) {
      if (!engine) {
        throw new Error(options.loadErrorHeading);
      }

      await engine.resetChat();

      const messages = [
        { role: "system" as const, content: input.system },
        { role: "user" as const, content: input.question },
      ];

      const response = await engine.chat.completions.create({
        messages,
        temperature: 0,
        max_tokens: options.maxNewTokens,
        stream: false,
        extra_body: loadedModelId ? qwenExtraBody(loadedModelId) : undefined,
      });

      return (response.choices[0]?.message?.content ?? "").trim();
    },

    async unload() {
      if (!engine) return;
      try {
        await engine.unload();
      } catch (error) {
        console.warn(`[Ask Anki] ${options.label} unload failed:`, error);
      } finally {
        engine = null;
        loadedModelId = null;
      }
    },
  };
}

/**
 * Create a singleton-style Gemma WebLLM provider for Ask Anki answer generation.
 */
export function createGemmaWebLLMProvider(): LocalChatModel {
  return createWebLLMChatModel({
    label: "Gemma",
    modelFilter: isGemmaModelId,
    fallbackChain: GEMMA_MODEL_FALLBACK_CHAIN,
    loadErrorHeading: GEMMA_LOAD_ERROR_HEADING,
    maxNewTokens: GEMMA_MAX_NEW_TOKENS,
  });
}

/**
 * Create a Qwen WebLLM provider for metadata query planning.
 */
export function createQwenPlannerProvider(): LocalChatModel {
  return createWebLLMChatModel({
    label: "Qwen planner",
    modelFilter: isQwenModelId,
    fallbackChain: QWEN_PLANNER_MODEL_FALLBACK_CHAIN,
    loadErrorHeading: QWEN_PLANNER_LOAD_ERROR_HEADING,
    maxNewTokens: QWEN_PLANNER_MAX_NEW_TOKENS,
  });
}
