/**
 * Structured metadata list queries answered without Gemma.
 *
 * Filters are planned by Qwen; matching and formatting are deterministic.
 */

import { filterDocumentsForQuery } from "@/lib/assistant/metadataQueryEvaluate";
import type { MetadataQuery } from "@/lib/assistant/metadataQueryTypes";
import type { AskAnkiResponse, AskAnkiSource, CorpusDocument, CorpusFile } from "@/lib/assistant/types";
import { documentFrontMatter } from "@/lib/assistant/frontMatter";

export type { MetadataQuery } from "@/lib/assistant/metadataQueryTypes";

const ZERO_RESULT_SUFFIX =
  "\n\nTry asking about projects, experience, patents, concepts, technologies, or tags.";

/**
 * Prefer summary, then elevator pitch, as a one-line document blurb.
 */
function documentBlurb(document: CorpusDocument): string {
  const frontMatter = documentFrontMatter(document);
  return frontMatter.summary?.trim() || frontMatter.elevatorPitch?.trim() || "";
}

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

function describeFilterValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * Build a first-person intro sentence describing the applied filters.
 */
function buildIntro(query: MetadataQuery): string {
  const filters = query.filters ?? [];
  const kindFilter = filters.find((f) => f.field === "kind" && f.op === "eq");
  const companyFilter = filters.find((f) => f.field === "company" && f.op === "eq");
  const importanceFilter = filters.find((f) => f.field === "importance" && f.op === "eq");
  const techFilter = filters.find(
    (f) => f.field === "technologies" && (f.op === "containsAll" || f.op === "containsAny")
  );
  const tagFilter = filters.find(
    (f) => f.field === "tags" && (f.op === "containsAll" || f.op === "containsAny")
  );

  const kind =
    typeof kindFilter?.value === "string" ? kindFilter.value : undefined;

  if (kind === "experience" && typeof companyFilter?.value === "string") {
    return `Here is my experience at ${companyFilter.value}:`;
  }

  const kindLabel = kind ? kindPluralLabel(kind) : "files";
  let intro = "Here are my";

  if (typeof importanceFilter?.value === "string") {
    intro += ` ${importanceFilter.value}`;
  }
  intro += ` ${kindLabel}`;

  if (techFilter?.value) {
    intro += ` that use ${describeFilterValue(techFilter.value)}`;
  } else if (tagFilter?.value) {
    intro += ` tagged with ${describeFilterValue(tagFilter.value)}`;
  } else if (typeof companyFilter?.value === "string") {
    intro += ` at ${companyFilter.value}`;
  }

  return `${intro}:`;
}

function formatAnswer(intro: string, documents: CorpusDocument[]): string {
  if (documents.length === 0) {
    return `I couldn't find matching files in the workspace metadata.${ZERO_RESULT_SUFFIX}`;
  }

  const lines = documents.map((document) => {
    const blurb = documentBlurb(document);
    const title = documentFrontMatter(document).title;
    return blurb ? `- ${title} — ${blurb}` : `- ${title}`;
  });

  return [intro, "", ...lines].join("\n");
}

function toSources(documents: CorpusDocument[]): AskAnkiSource[] {
  return documents.map((document, index) => ({
    path: document.path,
    title: documentFrontMatter(document).title,
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

  const documents = filterDocumentsForQuery(corpus.documents, query);
  const intro = buildIntro(query);

  return {
    answer: formatAnswer(intro, documents),
    sources: toSources(documents),
    refused: false,
  };
}
