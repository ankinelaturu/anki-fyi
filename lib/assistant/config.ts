export const ASSISTANT_CORPUS_URL = "/assistant/corpus.json";
export const ASSISTANT_VECTORS_URL = "/assistant/vectors.json";

export const ASSISTANT_MIN_SCORE = 0.38;
export const ASSISTANT_TOP_K = 5;

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

export const GEMMA_MODEL_FALLBACK_CHAIN = [
  "gemma-2-2b-it-q4f16_1-MLC",
  "gemma-2-2b-it-q4f32_1-MLC",
  "gemma-2-2b-it-q4f16_1-MLC-1k",
  "gemma-2-2b-it-q4f32_1-MLC-1k",
] as const;

export const REFUSAL_MESSAGE =
  "This assistant only answers questions about Anki\u2019s profile, projects, experience, writing, and portfolio workspace.";

export const PRIVACY_NOTE =
  "Runs locally in your browser. Model weights may download on first use. Answers are grounded in this workspace.";

export const GEMMA_LOAD_ERROR =
  "Local Gemma model failed to load. Please check browser WebGPU/WebAssembly support.";

export const WEBGPU_UNSUPPORTED_MESSAGE =
  "Local Gemma requires WebGPU support in this browser. Try Chrome or Edge with WebGPU enabled.";

/** Rough character budget for retrieved context passed to Gemma. */
export const MAX_CONTEXT_CHARS = 12_000;

export const CHUNK_TARGET_MIN_WORDS = 500;
export const CHUNK_TARGET_MAX_WORDS = 900;
export const CHUNK_OVERLAP_WORDS = 100;

export const CORPUS_FOLDERS = [
  "about",
  "experience",
  "capabilities",
  "projects",
  "writing",
  "patents",
  "lab",
  "creative-systems",
] as const;
