/**
 * Evaluate metadata filters against corpus documents.
 */

import { documentFrontMatter } from "@/lib/assistant/frontMatter";
import type { CorpusDocument } from "@/lib/assistant/types";
import type {
  MetadataFilter,
  MetadataQuery,
  MetadataSort,
} from "@/lib/assistant/metadataQueryTypes";

const IMPORTANCE_RANK: Record<string, number> = {
  flagship: 0,
  major: 1,
  supporting: 2,
  concept: 3,
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function equalsIgnoreCase(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) return Number(match[0]);
  }
  return null;
}

function getFieldValue(document: CorpusDocument, field: string): unknown {
  const frontMatter = documentFrontMatter(document) as Record<string, unknown>;
  return frontMatter[field];
}

function arrayIncludesIgnoreCase(array: string[], needle: string): boolean {
  return array.some((entry) => equalsIgnoreCase(entry, needle));
}

function evaluateFilter(document: CorpusDocument, filter: MetadataFilter): boolean {
  const raw = getFieldValue(document, filter.field);

  switch (filter.op) {
    case "exists":
      if (raw === undefined || raw === null) return false;
      if (Array.isArray(raw)) return raw.length > 0;
      if (typeof raw === "string") return raw.trim().length > 0;
      return true;

    case "eq": {
      if (filter.value === undefined) return false;
      if (Array.isArray(raw)) {
        return typeof filter.value === "string" && arrayIncludesIgnoreCase(raw, filter.value);
      }
      if (typeof raw === "boolean" || typeof filter.value === "boolean") {
        return raw === filter.value;
      }
      if (typeof raw === "number" && typeof filter.value === "number") {
        return raw === filter.value;
      }
      return typeof raw === "string" && typeof filter.value === "string"
        ? equalsIgnoreCase(raw, filter.value)
        : String(raw) === String(filter.value);
    }

    case "neq": {
      if (filter.value === undefined) return false;
      if (typeof raw === "string" && typeof filter.value === "string") {
        return !equalsIgnoreCase(raw, filter.value);
      }
      return raw !== filter.value;
    }

    case "in": {
      if (!Array.isArray(filter.value)) return false;
      if (typeof raw !== "string") return false;
      return filter.value.some(
        (entry) => typeof entry === "string" && equalsIgnoreCase(raw, entry)
      );
    }

    case "contains": {
      if (filter.value === undefined) return false;
      const needle = String(filter.value);
      if (Array.isArray(raw)) {
        return arrayIncludesIgnoreCase(raw, needle);
      }
      if (typeof raw === "string") {
        return normalizeText(raw).includes(normalizeText(needle));
      }
      return false;
    }

    case "containsAll": {
      if (!Array.isArray(filter.value) || !Array.isArray(raw)) return false;
      return filter.value.every(
        (entry) => typeof entry === "string" && arrayIncludesIgnoreCase(raw, entry)
      );
    }

    case "containsAny": {
      if (!Array.isArray(filter.value) || !Array.isArray(raw)) return false;
      return filter.value.some(
        (entry) => typeof entry === "string" && arrayIncludesIgnoreCase(raw, entry)
      );
    }

    case "gte": {
      if (filter.value === undefined) return false;
      const left = toComparableNumber(raw);
      const right = toComparableNumber(filter.value);
      return left !== null && right !== null && left >= right;
    }

    case "lte": {
      if (filter.value === undefined) return false;
      const left = toComparableNumber(raw);
      const right = toComparableNumber(filter.value);
      return left !== null && right !== null && left <= right;
    }

    default:
      return false;
  }
}

/**
 * Special-case kind matching for filmstrip/creative documents.
 */
function matchesKindFilter(document: CorpusDocument, filter: MetadataFilter): boolean {
  if (filter.field !== "kind" || filter.op !== "eq" || typeof filter.value !== "string") {
    return evaluateFilter(document, filter);
  }

  const kind = filter.value.toLowerCase();
  const frontMatter = documentFrontMatter(document);

  if (kind === "filmstrip") {
    return (
      frontMatter.type === "filmstrip" ||
      frontMatter.kind === "filmstrip" ||
      frontMatter.kind === "creative"
    );
  }

  if (kind === "concept") {
    return frontMatter.kind === "concept" || frontMatter.kind === "lab";
  }

  return evaluateFilter(document, filter);
}

/**
 * Returns true when a document satisfies all filters in the query.
 */
export function documentMatchesQuery(document: CorpusDocument, query: MetadataQuery): boolean {
  if (query.action !== "list" || !query.filters?.length) return false;

  return query.filters.every((filter) => {
    if (filter.field === "kind") return matchesKindFilter(document, filter);
    return evaluateFilter(document, filter);
  });
}

function compareField(
  a: CorpusDocument,
  b: CorpusDocument,
  field: string,
  direction: "asc" | "desc"
): number {
  const rawA = getFieldValue(a, field);
  const rawB = getFieldValue(b, field);

  if (field === "importance") {
    const rankA = IMPORTANCE_RANK[String(rawA ?? "supporting")] ?? 2;
    const rankB = IMPORTANCE_RANK[String(rawB ?? "supporting")] ?? 2;
    return direction === "asc" ? rankA - rankB : rankB - rankA;
  }

  if (typeof rawA === "number" && typeof rawB === "number") {
    return direction === "asc" ? rawA - rawB : rawB - rawA;
  }

  const strA = rawA == null ? "" : String(rawA);
  const strB = rawB == null ? "" : String(rawB);
  const cmp = strA.localeCompare(strB);
  return direction === "asc" ? cmp : -cmp;
}

function defaultCompare(a: CorpusDocument, b: CorpusDocument, query: MetadataQuery): number {
  const kindFilter = query.filters?.find((f) => f.field === "kind" && f.op === "eq");
  const kind = typeof kindFilter?.value === "string" ? kindFilter.value : undefined;

  const frontMatterA = documentFrontMatter(a);
  const frontMatterB = documentFrontMatter(b);
  const rankA = IMPORTANCE_RANK[frontMatterA.importance ?? "supporting"] ?? 2;
  const rankB = IMPORTANCE_RANK[frontMatterB.importance ?? "supporting"] ?? 2;
  if (rankA !== rankB) return rankA - rankB;

  const orderA = frontMatterA.order ?? 100;
  const orderB = frontMatterB.order ?? 100;
  if (orderA !== orderB) return orderA - orderB;

  if (kind === "experience") {
    const startA = frontMatterA.startDate ?? "";
    const startB = frontMatterB.startDate ?? "";
    if (startA !== startB) return startB.localeCompare(startA);
  }

  return frontMatterA.title.localeCompare(frontMatterB.title);
}

function compareDocuments(a: CorpusDocument, b: CorpusDocument, query: MetadataQuery): number {
  if (query.sort?.length) {
    for (const sort of query.sort as MetadataSort[]) {
      const cmp = compareField(a, b, sort.field, sort.direction);
      if (cmp !== 0) return cmp;
    }
    return 0;
  }
  return defaultCompare(a, b, query);
}

/**
 * Filter and sort corpus documents for a metadata list query.
 */
export function filterDocumentsForQuery(
  documents: CorpusDocument[],
  query: MetadataQuery
): CorpusDocument[] {
  if (query.action !== "list") return [];

  return documents
    .filter((document) => documentMatchesQuery(document, query))
    .sort((a, b) => compareDocuments(a, b, query));
}

/**
 * Build corpus vocabulary for planner grounding.
 */
export function buildCorpusVocabulary(documents: CorpusDocument[]): {
  technologies: string[];
  tags: string[];
  companies: string[];
  kinds: string[];
  importance: string[];
} {
  const technologies = new Set<string>();
  const tags = new Set<string>();
  const companies = new Set<string>();
  const kinds = new Set<string>();
  const importance = new Set<string>();

  for (const document of documents) {
    const frontMatter = documentFrontMatter(document);
    for (const value of frontMatter.technologies) technologies.add(value);
    for (const value of frontMatter.tags) tags.add(value);
    if (frontMatter.company) companies.add(frontMatter.company);
    if (frontMatter.kind) kinds.add(frontMatter.kind);
    if (frontMatter.importance) importance.add(frontMatter.importance);
  }

  return {
    technologies: [...technologies].sort(),
    tags: [...tags].sort(),
    companies: [...companies].sort(),
    kinds: [...kinds].sort(),
    importance: [...importance].sort(),
  };
}
