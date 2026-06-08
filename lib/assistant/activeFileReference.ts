/**
 * Deictic phrase detection for questions that refer to the active editor file.
 *
 * Used to relax retrieval refusal thresholds and reduce supplemental global
 * context when the visitor clearly means "this file" rather than the portfolio.
 */

/** Deictic phrases that refer to the active editor file, not the whole portfolio. */
const ACTIVE_FILE_REFERENCE_PATTERNS: RegExp[] = [
  /\bhere\b/i,
  /\bthis file\b/i,
  /\bthis project\b/i,
  /\bthis experience\b/i,
  /\bthis role\b/i,
  /\bcurrent file\b/i,
  /\bcurrent project\b/i,
  /\bwhat did you do here\b/i,
  /\bwhy did you build this\b/i,
  /\bwhat technologies did you use here\b/i,
  /\bhow is this related to your work\b/i,
  /\bwhat is this\b/i,
  /\bwhat's this\b/i,
  /\bwhy did you build\b/i,
  /\bwhat problem does this solve\b/i,
  /\bwhy does this matter\b/i,
  /\bwhat are the technical challenges\b/i,
  /\bwhat was technically interesting about this\b/i,
  /\bhow does this connect\b/i,
  /\bwhat did you do\b/i,
  /\bwhat technologies did you use\b/i,
  /\bhow is this related\b/i,
  /\babout this\b/i,
  /\bin this\b/i,
  /\bfor this\b/i,
  /\bthis\b/i,
];

/**
 * Returns true when the question likely refers to the file open in the editor.
 *
 * Patterns are ordered from specific multi-word phrases to a final broad `\bthis\b`
 * match; any single pattern hit is sufficient.
 */
export function isActiveFileReference(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  return ACTIVE_FILE_REFERENCE_PATTERNS.some((pattern) => pattern.test(q));
}
