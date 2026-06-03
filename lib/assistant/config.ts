export const ASSISTANT_CORPUS_URL = "/assistant/corpus.json";
export const ASSISTANT_VECTORS_URL = "/assistant/vectors.json";

/** Below this top-1 score, refuse before calling Gemma (clearly off-topic). */
export const ASSISTANT_REFUSE_BELOW_SCORE = 0.12;
export const ASSISTANT_TOP_K = 5;

/** Max chunks passed into Gemma (Gemma 2 2B context window is 4096 tokens). */
export const GEMMA_CONTEXT_TOP_K = 3;

/** Max new tokens per answer — leave room for system + retrieved context in 4096 window. */
export const GEMMA_MAX_NEW_TOKENS = 384;

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

export const GEMMA_MODEL_FALLBACK_CHAIN = [
  "gemma-2-2b-it-q4f16_1-MLC",
  "gemma-2-2b-it-q4f32_1-MLC",
  "gemma-2-2b-it-q4f16_1-MLC-1k",
  "gemma-2-2b-it-q4f32_1-MLC-1k",
] as const;

export const REFUSAL_MESSAGE =
  "I only answer questions about my profile, projects, experience, writing, and portfolio workspace.";

export const PRIVACY_NOTE =
  "Runs locally in your browser. Model weights may download on first use. Responses are AI-generated and grounded in this workspace.";

export const GEMMA_LOAD_ERROR_HEADING =
  "Local Gemma model failed to load. Please check browser WebGPU/WebAssembly support.";

export const GEMMA_GENERATE_ERROR_HEADING = "Local Gemma failed while generating an answer.";

export const WEBGPU_UNSUPPORTED_MESSAGE =
  "Local Gemma requires WebGPU support in this browser. Try Chrome or Edge with WebGPU enabled.";

/** Character budget for retrieved TEXT passed to Gemma (~3k tokens with system + question). */
export const MAX_CONTEXT_CHARS = 5_000;

/** Per-chunk body cap so one filmstrip day does not dominate the window. */
export const MAX_CHUNK_BODY_CHARS = 1_800;

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
