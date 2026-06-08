/**
 * Pre-generation guardrails that refuse clearly off-topic questions.
 *
 * Runs after vector retrieval so "about me" and active-file questions can bypass
 * low similarity scores when context is otherwise available.
 */

import { ASSISTANT_REFUSE_BELOW_SCORE } from "@/lib/assistant/config";
import { isActiveFileReference } from "@/lib/assistant/activeFileReference";
import { isAboutMeQuestion } from "@/lib/assistant/retrievalBoost";
import type { AskAnkiActiveFile, RetrievalResult } from "@/lib/assistant/types";

const BLOCKLIST: RegExp[] = [
  /\bweather\b/i,
  /\bforecast\b/i,
  /\b(sports?|nba|nfl|mlb)\b/i,
  /\b(president|election|politics|congress)\b/i,
  /\b(psoriasis|medical advice|diagnos(e|is))\b/i,
  /\b(recipe|cooking)\b/i,
  /\b(tell me a joke|make me laugh)\b/i,
  /\b(solve|calculate)\s+[\d+\-*/\s]+=/i,
  /\bwhat is\s+\d+\s*[\+\-\*\/]\s*\d+/i,
  /\b\d+\s*\+\s*\d+\b/,
  /\b(write me a|build me a)\s+(react|python|javascript|typescript)\s+(app|script|program)\b/i,
  /\bgeneric coding help\b/i,
];

/**
 * Returns true when the question matches a hard-coded off-topic blocklist pattern.
 */
export function isBlocklistedQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return true;
  return BLOCKLIST.some((pattern) => pattern.test(q));
}

/**
 * Returns true when the top retrieval hit meets the minimum similarity threshold.
 */
export function isRelevantRetrieval(results: RetrievalResult[]): boolean {
  if (results.length === 0) return false;
  return results[0]!.score >= ASSISTANT_REFUSE_BELOW_SCORE;
}

/**
 * Optional context passed to refusal logic for active-editor exceptions.
 */
export type RefuseQuestionOptions = {
  activeFile?: AskAnkiActiveFile;
};

/**
 * Decide whether to refuse a question before calling Gemma.
 *
 * Refuses blocklisted questions and low-similarity retrieval unless the
 * question is an about-me intro or deictically refers to the active file.
 */
export function shouldRefuseQuestion(
  question: string,
  results: RetrievalResult[],
  options?: RefuseQuestionOptions
): boolean {
  if (isBlocklistedQuestion(question)) return true;
  if (isAboutMeQuestion(question) && results.length > 0) return false;
  if (options?.activeFile && isActiveFileReference(question)) return false;
  return !isRelevantRetrieval(results);
}
