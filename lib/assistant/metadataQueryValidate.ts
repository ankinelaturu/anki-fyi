/**
 * Parse and validate planner LLM JSON output into a MetadataQuery.
 */

import { getFrontMatterField, isKnownFrontMatterField } from "@/lib/assistant/frontMatterSchema";
import {
  METADATA_FILTER_OPS,
  type MetadataFilter,
  type MetadataFilterOp,
  type MetadataFilterValue,
  type MetadataQuery,
  type MetadataSort,
} from "@/lib/assistant/metadataQueryTypes";

const NONE_QUERY: MetadataQuery = { action: "none" };

/**
 * Strip markdown code fences and return the inner JSON candidate string.
 */
export function extractJsonCandidate(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]!.trim() : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in planner output");
  }

  return candidate.slice(start, end + 1);
}

/**
 * Fix common small-model mistakes: premature `}` after the filters array.
 */
function repairPrematureCloseAfterFilters(candidate: string): string {
  return candidate.replace(/("filters"\s*:\s*\[[\s\S]*?\])\s*}\s*,/g, "$1,");
}

/**
 * Extract the filters array via bracket matching.
 */
function extractFiltersArray(candidate: string): unknown[] | null {
  const filtersKey = candidate.indexOf('"filters"');
  if (filtersKey === -1) return null;

  const arrayStart = candidate.indexOf("[", filtersKey);
  if (arrayStart === -1) return null;

  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < candidate.length; i++) {
    const ch = candidate[i];
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) return null;

  try {
    const filters = JSON.parse(candidate.slice(arrayStart, arrayEnd + 1));
    return Array.isArray(filters) ? filters : null;
  } catch {
    return null;
  }
}

/**
 * Extract action + filters via bracket matching when JSON.parse fails.
 */
function salvagePlannerObject(candidate: string): unknown | null {
  const actionMatch = candidate.match(/"action"\s*:\s*"(list|none)"/);
  if (actionMatch?.[1] === "none") return { action: "none" };

  const filters = extractFiltersArray(candidate);
  if (!filters || filters.length === 0) return null;

  if (!actionMatch || actionMatch[1] === "list") {
    return { action: "list", filters };
  }

  return null;
}

/**
 * Strip markdown code fences and extract a JSON object from model output.
 */
export function extractJsonObject(text: string): unknown {
  const candidate = extractJsonCandidate(text);

  try {
    return JSON.parse(candidate);
  } catch (firstError) {
    const repaired = repairPrematureCloseAfterFilters(candidate);
    if (repaired !== candidate) {
      try {
        return JSON.parse(repaired);
      } catch {
        // fall through to salvage
      }
    }

    const salvaged = salvagePlannerObject(candidate);
    if (salvaged) return salvaged;

    throw firstError instanceof Error ? firstError : new Error(String(firstError));
  }
}

function isFilterOp(value: unknown): value is MetadataFilterOp {
  return typeof value === "string" && METADATA_FILTER_OPS.includes(value as MetadataFilterOp);
}

function coerceFilterValue(
  field: string,
  value: unknown
): MetadataFilterValue | undefined {
  if (value === undefined || value === null) return undefined;

  const fieldDef = getFrontMatterField(field);
  const type = fieldDef?.type ?? "string";

  if (type === "string[]") {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    if (typeof value === "string") return [value];
    return undefined;
  }

  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }

  if (type === "number") {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return undefined;
  }

  if (type === "string|number") {
    if (typeof value === "number") return value;
    if (typeof value === "string") return value;
    return undefined;
  }

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return undefined;
}

function parseFilter(raw: unknown): MetadataFilter | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const field = typeof record.field === "string" ? record.field.trim() : "";
  const op = record.op;

  if (!field || !isKnownFrontMatterField(field) || !isFilterOp(op)) {
    return null;
  }

  if (op === "exists") {
    return { field, op };
  }

  const value = coerceFilterValue(field, record.value);
  if (value === undefined) return null;

  return { field, op, value };
}

function parseSort(raw: unknown): MetadataSort | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const field = typeof record.field === "string" ? record.field.trim() : "";
  const direction = record.direction;

  if (!field || !isKnownFrontMatterField(field)) return null;
  if (direction !== "asc" && direction !== "desc") return null;

  return { field, direction };
}

/**
 * Validate parsed JSON into a MetadataQuery. Returns `{ action: "none" }` on failure.
 */
function parseFilters(record: Record<string, unknown>): MetadataFilter[] | null {
  const filters: MetadataFilter[] = [];
  if (!Array.isArray(record.filters)) return null;

  for (const entry of record.filters) {
    const filter = parseFilter(entry);
    if (!filter) return null;
    filters.push(filter);
  }

  return filters.length > 0 ? filters : null;
}

/**
 * Qwen sometimes outputs filter objects under "actions" instead of "filters".
 */
function normalizePlannerRecord(record: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(record.filters) && Array.isArray(record.actions)) {
    const { actions, ...rest } = record;
    return { ...rest, action: rest.action ?? "list", filters: actions };
  }
  return record;
}

export function validateMetadataQuery(raw: unknown): MetadataQuery {
  if (!raw || typeof raw !== "object") return NONE_QUERY;

  const record = normalizePlannerRecord(raw as Record<string, unknown>);
  const action = record.action;

  if (action === "none") return NONE_QUERY;

  const filters = parseFilters(record);
  if (!filters) return NONE_QUERY;

  // Qwen often omits action when filters are present — treat as list.
  if (action === "list" || action === undefined) {
    const sort: MetadataSort[] = [];
    if (Array.isArray(record.sort)) {
      for (const entry of record.sort) {
        const parsed = parseSort(entry);
        if (!parsed) return NONE_QUERY;
        sort.push(parsed);
      }
    }

    return {
      action: "list",
      filters,
      sort: sort.length ? sort : undefined,
    };
  }

  return NONE_QUERY;
}

/**
 * Parse planner LLM text output into a validated MetadataQuery.
 */
export function parsePlannerMetadataQuery(text: string): MetadataQuery {
  try {
    const raw = extractJsonObject(text);
    const query = validateMetadataQuery(raw);
    if (query.action === "none" && raw && typeof raw === "object") {
      const record = raw as Record<string, unknown>;
      if (
        record.action === "list" ||
        Array.isArray(record.filters) ||
        Array.isArray(record.actions)
      ) {
        console.warn("[Ask Anki] planner JSON parsed but failed validation", { raw });
      }
    }
    return query;
  } catch (error) {
    console.warn(
      "[Ask Anki] planner JSON parse failed",
      error instanceof Error ? error.message : error,
      "\nRaw:",
      text
    );
    return NONE_QUERY;
  }
}
