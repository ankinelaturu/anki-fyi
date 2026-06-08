/**
 * Qwen-based metadata query planner.
 *
 * Produces validated JSON filters before vector retrieval.
 */

import { PLANNER_ENGINE_MODE } from "@/lib/assistant/config";
import { buildCorpusVocabulary } from "@/lib/assistant/metadataQueryEvaluate";
import { parsePlannerMetadataQuery } from "@/lib/assistant/metadataQueryValidate";
import type { MetadataQuery } from "@/lib/assistant/metadataQueryTypes";
import { createQwenPlannerProvider } from "@/lib/assistant/modelProvider";
import { buildPlannerSystemPrompt } from "@/lib/assistant/plannerPrompt";
import type { AskAnkiCallbacks, CorpusFile } from "@/lib/assistant/types";

const NONE_QUERY: MetadataQuery = { action: "none" };

export type PlanMetadataResult = {
  query: MetadataQuery;
  /** Wall time for Qwen load + query generation + parse (ms). */
  elapsedMs: number;
};

let plannerModel = createQwenPlannerProvider();

/**
 * Replace the planner model (for testing).
 */
export function setPlannerModelForTests(model: ReturnType<typeof createQwenPlannerProvider>): void {
  plannerModel = model;
}

/**
 * Reset planner to the default Qwen provider.
 */
export function resetPlannerModel(): void {
  plannerModel = createQwenPlannerProvider();
}

/**
 * Unload the planner model when using shared engine mode before Gemma loads.
 */
export async function unloadPlannerIfShared(): Promise<void> {
  if (PLANNER_ENGINE_MODE === "shared") {
    await plannerModel.unload();
  }
}

/**
 * Plan a metadata query from natural language using Qwen.
 *
 * On load or parse failure, returns `{ action: "none" }` so askAnki falls through to RAG.
 */
export async function planMetadataQuery(
  question: string,
  corpus: CorpusFile,
  callbacks?: AskAnkiCallbacks
): Promise<PlanMetadataResult> {
  const trimmed = question.trim();
  if (!trimmed) return { query: NONE_QUERY, elapsedMs: 0 };

  const vocabulary = buildCorpusVocabulary(corpus.documents);
  const system = buildPlannerSystemPrompt(vocabulary);

  callbacks?.onStatus?.("Planning metadata query (Qwen)...");

  console.log("[Ask Anki] Qwen planner prompt:", {
    messages: [
      { role: "system", content: system },
      { role: "user", content: trimmed },
    ],
  });

  const qwenStart = performance.now();

  try {
    await plannerModel.load((message) => callbacks?.onStatus?.(message));
    const raw = await plannerModel.generatePlanner({ system, question: trimmed });
    const query = parsePlannerMetadataQuery(raw);
    const elapsedMs = performance.now() - qwenStart;

    console.log("[Ask Anki] Qwen planner raw output:\n", raw);
    console.log("[Ask Anki] Metadata query JSON:\n", JSON.stringify(query, null, 2));

    if (PLANNER_ENGINE_MODE === "shared") {
      await plannerModel.unload();
    }

    return { query, elapsedMs };
  } catch (error) {
    const elapsedMs = performance.now() - qwenStart;
    if (process.env.NODE_ENV === "development") {
      console.warn("[Ask Anki] planner failed, falling back to vector search", error);
    }
    await plannerModel.unload();
    return { query: NONE_QUERY, elapsedMs };
  }
}
