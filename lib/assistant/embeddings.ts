/**
 * On-device embedding inference via Transformers.js (`@xenova/transformers`).
 *
 * Loads `Xenova/all-MiniLM-L6-v2` for query-time vectorization in the browser
 * and during the offline `build:corpus` script in Node.
 */

import { EMBEDDING_MODEL } from "@/lib/assistant/config";
import { normalizeVector } from "@/lib/assistant/math";

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: "mean"; normalize: boolean }
) => Promise<{ data: Float32Array | number[] }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Configure the Transformers.js environment for browser vs Node execution.
 *
 * Models are always fetched from Hugging Face — local `/models` paths are
 * disabled because weights are not bundled under `public/`.
 */
function configureTransformersEnv(env: {
  allowLocalModels: boolean;
  allowRemoteModels: boolean;
  remoteHost: string;
  remotePathTemplate: string;
  useBrowserCache: boolean;
  useFSCache: boolean;
}) {
  // Never load from /models on this origin — files are not bundled under public/.
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
  env.remoteHost = "https://huggingface.co/";
  // Default template: {model}/resolve/{revision}/ — do not use {path}; filenames are appended separately.
  env.remotePathTemplate = "{model}/resolve/{revision}/";

  if (typeof window !== "undefined") {
    // Browser: download from Hugging Face on first use, then cache in IndexedDB.
    env.useBrowserCache = true;
    env.useFSCache = false;
  } else {
    // Node (build:corpus): fetch once per build, no browser cache.
    env.useBrowserCache = false;
  }
}

/**
 * Eagerly download and warm the embedding pipeline.
 *
 * Reports progress through an optional callback suitable for terminal status lines.
 */
export async function loadEmbeddingModel(onProgress?: (message: string) => void): Promise<void> {
  onProgress?.(
    typeof window !== "undefined"
      ? "Downloading embedding model (first use only)..."
      : "Loading embedding model..."
  );
  await getPipeline();
  onProgress?.("Embedding model ready.");
}

/**
 * Lazily create and memoize the feature-extraction pipeline singleton.
 */
async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { env, pipeline } = await import("@xenova/transformers");
      configureTransformersEnv(env);
      return (await pipeline("feature-extraction", EMBEDDING_MODEL, {
        quantized: true,
      })) as FeatureExtractionPipeline;
    })();
  }
  return pipelinePromise;
}

/**
 * Embed a single string and return a L2-normalized dense vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  const data = output.data instanceof Float32Array ? Array.from(output.data) : [...output.data];
  return normalizeVector(data);
}

/**
 * Minimal interface for code that needs load-once, embed-many semantics.
 */
export type EmbeddingProvider = {
  load(onProgress?: (message: string) => void): Promise<void>;
  embed(text: string): Promise<number[]>;
};

/**
 * Factory for a stateful embedding provider that skips redundant loads.
 */
export function createEmbeddingProvider(): EmbeddingProvider {
  let loaded = false;
  return {
    async load(onProgress?: (message: string) => void) {
      if (loaded) return;
      await loadEmbeddingModel(onProgress);
      loaded = true;
    },
    embed(text: string) {
      return embedText(text);
    },
  };
}
