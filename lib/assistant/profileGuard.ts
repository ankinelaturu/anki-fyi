import { ASSISTANT_REFUSE_BELOW_SCORE } from "@/lib/assistant/config";
import { isAboutMeQuestion } from "@/lib/assistant/retrievalBoost";
import type { RetrievalResult } from "@/lib/assistant/types";

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

export function isBlocklistedQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return true;
  return BLOCKLIST.some((pattern) => pattern.test(q));
}

export function isRelevantRetrieval(results: RetrievalResult[]): boolean {
  if (results.length === 0) return false;
  return results[0]!.score >= ASSISTANT_REFUSE_BELOW_SCORE;
}

export function shouldRefuseQuestion(question: string, results: RetrievalResult[]): boolean {
  if (isBlocklistedQuestion(question)) return true;
  if (isAboutMeQuestion(question) && results.length > 0) return false;
  return !isRelevantRetrieval(results);
}
