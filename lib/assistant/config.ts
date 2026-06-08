/**
 * Central configuration for the Ask Anki assistant.
 *
 * Tunables cover corpus URLs, retrieval thresholds, Gemma context budgets,
 * embedding model identity, and user-facing error/refusal copy.
 */

/** Public URL of the prebuilt corpus JSON served from `public/assistant/`. */
export const ASSISTANT_CORPUS_URL = "/assistant/corpus.json";

/** Public URL of the precomputed chunk embedding vectors. */
export const ASSISTANT_VECTORS_URL = "/assistant/vectors.json";

/**
 * Minimum top-1 cosine similarity required before calling Gemma.
 *
 * Scores below this threshold indicate the question is clearly off-topic
 * relative to the portfolio corpus.
 */
export const ASSISTANT_REFUSE_BELOW_SCORE = 0.12;

/** Default number of chunks returned by vector search. */
export const ASSISTANT_TOP_K = 5;

/**
 * Maximum retrieved chunks passed into Gemma when no active editor file is open.
 *
 * Kept low because Gemma 2 2B has a 4096-token context window.
 */
export const GEMMA_CONTEXT_TOP_K = 3;

/**
 * Maximum chunks pinned from the active editor file into the prompt.
 */
export const GEMMA_ACTIVE_FILE_MAX_CHUNKS = 3;

/**
 * For filmstrip documents, how many `## Day N` sections to include alongside
 * the metadata chunk when building active-file context.
 */
export const FILMSTRIP_ACTIVE_DAY_CHUNKS = 2;

/**
 * Supplemental retrieved chunks when an active editor file is already pinned.
 */
export const GEMMA_RETRIEVED_WITH_ACTIVE_K = 3;

/**
 * Fewer global retrieval hits when the question deictically refers to the
 * active file ("here", "this project", etc.).
 */
export const GEMMA_RETRIEVED_ACTIVE_REF_K = 2;

/**
 * Cap on newly generated tokens per answer.
 *
 * Leaves headroom in the 4096-token window for system prompt, question, and
 * retrieved context.
 */
export const GEMMA_MAX_NEW_TOKENS = 384;

/** Hugging Face model id used for query and corpus embeddings. */
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

/**
 * Ordered Gemma model ids to try when loading WebLLM.
 *
 * Prefers q4f16 variants, then falls back to q4f32 and 1k-context builds.
 */
export const GEMMA_MODEL_FALLBACK_CHAIN = [
  "gemma-2-2b-it-q4f16_1-MLC",
  "gemma-2-2b-it-q4f32_1-MLC",
  "gemma-2-2b-it-q4f16_1-MLC-1k",
  "gemma-2-2b-it-q4f32_1-MLC-1k",
] as const;

/**
 * Ordered Qwen model ids for metadata query planning.
 *
 * Prefers small instruct models for fast JSON planning.
 */
export const QWEN_PLANNER_MODEL_FALLBACK_CHAIN = [
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
] as const;

/** Max tokens for planner JSON output. */
export const QWEN_PLANNER_MAX_NEW_TOKENS = 256;

/**
 * WebLLM engine layout for planner + Gemma.
 *
 * - `shared`: unload Qwen after planning before loading Gemma (lower VRAM).
 * - `dual`: keep Qwen loaded alongside Gemma (faster repeat metadata queries).
 */
export type PlannerEngineMode = "dual" | "shared";
/** Default engine mode; runtime value is set from the terminal segmented control. */
export const PLANNER_ENGINE_MODE: PlannerEngineMode = "shared";

/** Heading prepended when the local Qwen planner fails to initialize. */
export const QWEN_PLANNER_LOAD_ERROR_HEADING =
  "Local Qwen planner failed to load. Metadata routing will fall back to vector search.";

/** Shown when a question is refused before retrieval or generation runs. */
export const REFUSAL_MESSAGE =
  "I only answer questions about my profile, projects, experience, writing, and portfolio workspace.";

/** Footer note in the Ask Anki terminal about local execution and limitations. */
export const PRIVACY_NOTE =
  "Runs locally in your browser. Model weights may download on first use. Responses are AI-generated and grounded in this workspace.";

/** Heading prepended when the local Gemma model fails to initialize. */
export const GEMMA_LOAD_ERROR_HEADING =
  "Local Gemma model failed to load. Please check browser WebGPU/WebAssembly support.";

/** Heading prepended when Gemma fails mid-generation (non-context errors). */
export const GEMMA_GENERATE_ERROR_HEADING = "Local Gemma failed while generating an answer.";

/** Shown when WebGPU is unavailable and local Gemma cannot run. */
export const WEBGPU_UNSUPPORTED_MESSAGE =
  "Local Gemma requires WebGPU support in this browser. Try Chrome or Edge with WebGPU enabled.";

/**
 * Character budget for retrieved TEXT blocks in the Gemma user prompt.
 *
 * Roughly ~3k tokens together with system prompt and question.
 */
export const MAX_CONTEXT_CHARS = 5_000;

/**
 * Per-chunk body cap inside a source block.
 *
 * Prevents a single long filmstrip day from consuming the entire context window.
 */
export const MAX_CHUNK_BODY_CHARS = 1_800;

/** Target minimum words per body chunk during corpus build. */
export const CHUNK_TARGET_MIN_WORDS = 500;

/** Target maximum words per body chunk before splitting with overlap. */
export const CHUNK_TARGET_MAX_WORDS = 900;

/** Word overlap between consecutive splits of an oversized section. */
export const CHUNK_OVERLAP_WORDS = 100;

/**
 * Top-level content folders scanned when building the assistant corpus.
 */
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
