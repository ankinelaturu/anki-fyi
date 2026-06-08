/**
 * Runtime WebLLM engine layout for Qwen planner + Gemma (UI-controlled).
 */

import type { PlannerEngineMode } from "@/lib/assistant/config";
import { PLANNER_ENGINE_MODE } from "@/lib/assistant/config";

const STORAGE_KEY = "ask-anki-planner-engine-mode";

let runtimeMode: PlannerEngineMode = PLANNER_ENGINE_MODE;

/**
 * Read persisted engine mode from localStorage (browser only).
 */
export function loadPlannerEngineMode(): PlannerEngineMode {
  if (typeof window === "undefined") return PLANNER_ENGINE_MODE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "shared" || stored === "dual") return stored;
  } catch {
    // ignore quota / private mode
  }
  return PLANNER_ENGINE_MODE;
}

/**
 * Persist and apply engine mode for the current session.
 */
export function setPlannerEngineMode(mode: PlannerEngineMode): void {
  runtimeMode = mode;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

/**
 * Engine mode used by plannerLLM during Ask Anki requests.
 */
export function getPlannerEngineMode(): PlannerEngineMode {
  return runtimeMode;
}
