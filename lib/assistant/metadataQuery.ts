/**
 * Structured metadata list queries answered without Gemma.
 *
 * Detects "list/show/find" questions with workspace filters (kind, technology,
 * tag, importance, company) and formats deterministic bullet-list responses.
 */

import type { AskAnkiResponse, AskAnkiSource, CorpusDocument, CorpusFile } from "@/lib/assistant/types";

/**
 * Parsed intent for a metadata-driven list query.
 *
 * `action: "none"` means the question should fall through to vector search.
 */
export type MetadataQuery = {
  action: "list" | "none";
  kind?: string;
  technologies?: string[];
  tags?: string[];
  importance?: string;
  company?: string;
};

const IMPORTANCE_RANK: Record<string, number> = {
  flagship: 0,
  major: 1,
  supporting: 2,
  concept: 3,
};

const KIND_ALIASES: { kind: string; pattern: RegExp }[] = [
  { kind: "project", pattern: /\bprojects?\b/i },
  { kind: "concept", pattern: /\bconcepts?\b|\bideas\b/i },
  { kind: "experience", pattern: /\bexperience\b|\bwork history\b|\broles?\b/i },
  { kind: "patent", pattern: /\bpatents?\b/i },
  { kind: "capability", pattern: /\bcapabilities\b|\bskills\b/i },
  { kind: "analytics", pattern: /\banalytics\b|\bstats\b|\banalysis\b/i },
  { kind: "writing", pattern: /\bwriting\b|\barticles?\b|\bposts?\b/i },
  { kind: "filmstrip", pattern: /\bfilmstrip\b|\bcreative\b|\bcaikus?\b/i },
];

const LIST_TRIGGER_PATTERNS = [
  /\blist\b/i,
  /\bshow\b/i,
  /\bfind\b/i,
  /\bwhat are\b/i,
  /\bwhich\b/i,
  /\bgive me\b/i,
  /\bwhat\b.+\b(do you have|have you built|did you build)\b/i,
  /\bwhat\b.+\bfiles\b/i,
];

const METADATA_QUERY_BLOCKLIST = [
  /\bwhy\b/i,
  /\bhow\b/i,
  /\bmost relevant\b/i,
  /\brelevant to\b/i,
  /\brelate\b/i,
  /\bconnect\b/i,
  /\btell me about\b/i,
  /\bwhat did you do\b/i,
  /\bwhat did you\b/i,
];

const ZERO_RESULT_SUFFIX =
  "\n\nTry asking about projects, experience, patents, concepts, technologies, or tags.";

type MetadataLookups = {
  technologies: string[];
  tags: string[];
  importance: string[];
  companies: string[];
};

/**
 * Normalize text for case-insensitive substring matching.
 */
function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Case-insensitive equality after normalization.
 */
function equalsIgnoreCase(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}

/**
 * Returns true when at least one metadata filter field is set.
 */
function hasFilters(query: MetadataQuery): boolean {
  return Boolean(
    query.technologies?.length ||
      query.tags?.length ||
      query.importance ||
      query.company
  );
}

/**
 * Build sorted lookup tables of unique metadata values across the corpus.
 *
 * Longer technology/tag strings are sorted first for greedy substring matching.
 */
function buildMetadataLookups(corpus: CorpusFile): MetadataLookups {
  const technologies = new Set<string>();
  const tags = new Set<string>();
  const importance = new Set<string>();
  const companies = new Set<string>();

  for (const document of corpus.documents) {
    for (const value of document.technologies ?? []) technologies.add(value);
    for (const value of document.tags) tags.add(value);
    if (document.importance) importance.add(document.importance);
    if (document.company) companies.add(document.company);
  }

  return {
    technologies: [...technologies].sort((a, b) => b.length - a.length),
    tags: [...tags].sort((a, b) => b.length - a.length),
    importance: [...importance],
    companies: [...companies].sort((a, b) => b.length - a.length),
  };
}

/**
 * Returns true when the question uses list/show/find phrasing.
 */
function isListTriggerQuestion(question: string): boolean {
  return LIST_TRIGGER_PATTERNS.some((pattern) => pattern.test(question));
}

/**
 * Returns true for explanatory questions that should not use metadata shortcuts.
 */
function isBlockedMetadataQuestion(question: string): boolean {
  return METADATA_QUERY_BLOCKLIST.some((pattern) => pattern.test(question));
}

/**
 * Detect the primary document kind filter from natural language aliases.
 */
function detectKind(question: string): string | undefined {
  for (const alias of KIND_ALIASES) {
    if (alias.pattern.test(question)) return alias.kind;
  }
  return undefined;
}

/**
 * Special-case tag matching for multi-word tags like "local ai".
 */
function tagMatchesQuestion(tag: string, question: string): boolean {
  const q = normalizeText(question);
  const normalizedTag = normalizeText(tag);
  if (q.includes(normalizedTag)) return true;

  if (normalizedTag.includes("local") && normalizedTag.includes("ai") && q.includes("local ai")) {
    return true;
  }

  return false;
}

/**
 * Extract technology, tag, importance, and company filters mentioned in the question.
 */
function detectFilters(
  question: string,
  lookups: MetadataLookups
): Pick<MetadataQuery, "technologies" | "tags" | "importance" | "company"> {
  const q = normalizeText(question);
  const technologies = lookups.technologies.filter((value) => q.includes(normalizeText(value)));
  const tags = lookups.tags.filter((value) => {
    if (technologies.some((technology) => normalizeText(technology) === normalizeText(value))) {
      return false;
    }
    return tagMatchesQuestion(value, question);
  });
  const importance = lookups.importance.find((value) => q.includes(normalizeText(value)));
  const company = lookups.companies.find((value) => q.includes(normalizeText(value)));

  return {
    technologies: technologies.length ? technologies : undefined,
    tags: tags.length ? tags : undefined,
    importance,
    company,
  };
}

/**
 * Parse a natural language question into a metadata list query or `{ action: "none" }`.
 *
 * Requires list-trigger phrasing plus at least a kind or metadata filter match.
 */
export function parseMetadataQuery(question: string, corpus: CorpusFile): MetadataQuery {
  const trimmed = question.trim();
  if (!trimmed || !isListTriggerQuestion(trimmed) || isBlockedMetadataQuestion(trimmed)) {
    return { action: "none" };
  }

  const lookups = buildMetadataLookups(corpus);
  const kind = detectKind(trimmed);
  const filters = detectFilters(trimmed, lookups);

  if (!kind && !hasFilters({ action: "list", ...filters })) {
    return { action: "none" };
  }

  return {
    action: "list",
    kind,
    ...filters,
  };
}

/**
 * Match a document against the filmstrip-specific kind rules.
 */
function documentMatchesKind(document: CorpusDocument, kind: string): boolean {
  if (kind === "filmstrip") {
    return document.type === "filmstrip" || document.kind === "filmstrip" || document.kind === "creative";
  }
  return document.kind === kind;
}

/**
 * Returns true when a corpus document satisfies all filters in the query.
 */
function documentMatchesQuery(document: CorpusDocument, query: MetadataQuery): boolean {
  if (query.kind && !documentMatchesKind(document, query.kind)) return false;

  if (query.importance && !equalsIgnoreCase(document.importance ?? "", query.importance)) {
    return false;
  }

  if (query.company && !equalsIgnoreCase(document.company ?? "", query.company)) {
    return false;
  }

  if (query.technologies?.length) {
    const documentTechnologies = document.technologies ?? [];
    if (
      !query.technologies.every((technology) =>
        documentTechnologies.some((value) => equalsIgnoreCase(value, technology))
      )
    ) {
      return false;
    }
  }

  if (query.tags?.length) {
    if (
      !query.tags.every((tag) => document.tags.some((value) => equalsIgnoreCase(value, tag)))
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Sort documents by importance rank, order field, start date (experience), then title.
 */
function compareDocuments(a: CorpusDocument, b: CorpusDocument, kind?: string): number {
  const rankA = IMPORTANCE_RANK[a.importance ?? "supporting"] ?? 2;
  const rankB = IMPORTANCE_RANK[b.importance ?? "supporting"] ?? 2;
  if (rankA !== rankB) return rankA - rankB;

  const orderA = a.order ?? 100;
  const orderB = b.order ?? 100;
  if (orderA !== orderB) return orderA - orderB;

  if (kind === "experience") {
    const startA = a.startDate ?? "";
    const startB = b.startDate ?? "";
    if (startA !== startB) return startB.localeCompare(startA);
  }

  return a.title.localeCompare(b.title);
}

/**
 * Plural display label for a document kind in answer intros.
 */
function kindPluralLabel(kind: string): string {
  switch (kind) {
    case "project":
      return "projects";
    case "concept":
      return "concepts";
    case "experience":
      return "experience";
    case "patent":
      return "patents";
    case "capability":
      return "capabilities";
    case "analytics":
      return "analytics files";
    case "writing":
      return "writing";
    case "filmstrip":
      return "filmstrips";
    default:
      return `${kind}s`;
  }
}

/**
 * Prefer summary, then elevator pitch, as a one-line document blurb.
 */
function documentBlurb(document: CorpusDocument): string {
  return document.summary?.trim() || document.elevatorPitch?.trim() || "";
}

/**
 * Build a first-person intro sentence describing the applied filters.
 */
function buildIntro(query: MetadataQuery): string {
  if (query.kind === "experience" && query.company) {
    return `Here is my experience at ${query.company}:`;
  }

  const kindLabel = query.kind ? kindPluralLabel(query.kind) : "files";
  let intro = "Here are my";

  if (query.importance) intro += ` ${query.importance}`;
  intro += ` ${kindLabel}`;

  if (query.technologies?.length) {
    intro += ` that use ${query.technologies.join(", ")}`;
  } else if (query.tags?.length) {
    intro += ` tagged with ${query.tags.join(", ")}`;
  } else if (query.company) {
    intro += ` at ${query.company}`;
  }

  return `${intro}:`;
}

/**
 * Format the intro and bullet list of matching documents into the answer body.
 */
function formatAnswer(intro: string, documents: CorpusDocument[]): string {
  if (documents.length === 0) {
    return `I couldn't find matching files in the workspace metadata.${ZERO_RESULT_SUFFIX}`;
  }

  const lines = documents.map((document) => {
    const blurb = documentBlurb(document);
    return blurb ? `- ${document.title} — ${blurb}` : `- ${document.title}`;
  });

  return [intro, "", ...lines].join("\n");
}

/**
 * Map matched documents to citation sources with descending pseudo-scores.
 */
function toSources(documents: CorpusDocument[]): AskAnkiSource[] {
  return documents.map((document, index) => ({
    path: document.path,
    title: document.title,
    score: 1 - index * 0.001,
  }));
}

/**
 * Execute a parsed metadata query and return a full `AskAnkiResponse`.
 */
export function answerMetadataQuery(query: MetadataQuery, corpus: CorpusFile): AskAnkiResponse {
  if (query.action === "none") {
    return { answer: "", sources: [], refused: false };
  }

  const documents = corpus.documents
    .filter((document) => documentMatchesQuery(document, query))
    .sort((a, b) => compareDocuments(a, b, query.kind));

  const intro = buildIntro(query);

  return {
    answer: formatAnswer(intro, documents),
    sources: toSources(documents),
    refused: false,
  };
}
