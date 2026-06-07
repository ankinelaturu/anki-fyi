import type { AskAnkiResponse, AskAnkiSource, CorpusDocument, CorpusFile } from "@/lib/assistant/types";

export type StructuredIntent =
  | { type: "list_projects" }
  | { type: "list_concepts" }
  | { type: "list_experience" }
  | { type: "list_patents" }
  | { type: "list_capabilities" }
  | { type: "none" };

const IMPORTANCE_RANK: Record<string, number> = {
  flagship: 0,
  major: 1,
  supporting: 2,
  concept: 3,
};

const LIST_PROJECTS_PATTERNS = [
  /^list\s+(all\s+)?projects$/,
  /^show\s+(me\s+)?(your\s+)?projects$/,
  /^what\s+projects\s+have\s+you\s+built$/,
  /^what\s+projects\s+did\s+you\s+build$/,
];

const LIST_CONCEPTS_PATTERNS = [
  /^list\s+(all\s+)?concepts$/,
  /^show\s+(me\s+)?(your\s+)?concepts$/,
  /^what\s+ideas\s+are\s+concepts$/,
];

const LIST_EXPERIENCE_PATTERNS = [
  /^list\s+(all\s+)?experience$/,
  /^show\s+(me\s+)?(your\s+)?experience$/,
  /^what\s+experience\s+do\s+you\s+have$/,
  /^show\s+(me\s+)?(your\s+)?work\s+history$/,
];

const LIST_PATENTS_PATTERNS = [
  /^list\s+(all\s+)?patents$/,
  /^show\s+(me\s+)?(your\s+)?patents$/,
  /^what\s+patents\s+do\s+you\s+have$/,
];

const LIST_CAPABILITIES_PATTERNS = [
  /^list\s+(all\s+)?capabilities$/,
  /^what\s+are\s+your\s+capabilities$/,
  /^show\s+(me\s+)?(your\s+)?skills$/,
];

export function normalizeStructuredQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[?!.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesPatterns(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

export function detectStructuredIntent(question: string): StructuredIntent {
  const q = normalizeStructuredQuestion(question);
  if (!q) return { type: "none" };

  if (matchesPatterns(q, LIST_PROJECTS_PATTERNS)) return { type: "list_projects" };
  if (matchesPatterns(q, LIST_CONCEPTS_PATTERNS)) return { type: "list_concepts" };
  if (matchesPatterns(q, LIST_EXPERIENCE_PATTERNS)) return { type: "list_experience" };
  if (matchesPatterns(q, LIST_PATENTS_PATTERNS)) return { type: "list_patents" };
  if (matchesPatterns(q, LIST_CAPABILITIES_PATTERNS)) return { type: "list_capabilities" };

  return { type: "none" };
}

function documentBlurb(document: CorpusDocument): string {
  return document.summary?.trim() || document.elevatorPitch?.trim() || "";
}

function formatCatalogAnswer(intro: string, documents: CorpusDocument[]): string {
  if (documents.length === 0) {
    return `${intro}\n\nNo matching documents found in the workspace catalog.`;
  }

  const lines = documents.map((document) => {
    const blurb = documentBlurb(document);
    return blurb ? `- ${document.title} — ${blurb}` : `- ${document.title}`;
  });

  return [intro, "", ...lines].join("\n");
}

function toSources(documents: CorpusDocument[]): AskAnkiSource[] {
  return documents.map((document, index) => ({
    path: document.path,
    title: document.title,
    score: 1 - index * 0.001,
  }));
}

function filterByKind(corpus: CorpusFile, kind: string): CorpusDocument[] {
  return corpus.documents.filter((document) => document.kind === kind);
}

function compareByImportanceThenOrder(a: CorpusDocument, b: CorpusDocument): number {
  const rankA = IMPORTANCE_RANK[a.importance ?? "supporting"] ?? 2;
  const rankB = IMPORTANCE_RANK[b.importance ?? "supporting"] ?? 2;
  if (rankA !== rankB) return rankA - rankB;
  return (a.order ?? 100) - (b.order ?? 100);
}

function compareByStartDateDesc(a: CorpusDocument, b: CorpusDocument): number {
  const startA = a.startDate ?? "";
  const startB = b.startDate ?? "";
  if (startA !== startB) return startB.localeCompare(startA);
  return a.title.localeCompare(b.title);
}

function compareByTitle(a: CorpusDocument, b: CorpusDocument): number {
  return a.title.localeCompare(b.title);
}

export function answerStructuredIntent(
  intent: StructuredIntent,
  corpus: CorpusFile
): AskAnkiResponse | null {
  if (intent.type === "none") return null;

  let documents: CorpusDocument[] = [];
  let intro = "";

  switch (intent.type) {
    case "list_projects":
      intro = "Here are my projects:";
      documents = filterByKind(corpus, "project").sort(compareByImportanceThenOrder);
      break;
    case "list_concepts":
      intro = "Here are my concepts:";
      documents = filterByKind(corpus, "concept").sort(compareByImportanceThenOrder);
      break;
    case "list_experience":
      intro = "Here is my experience:";
      documents = filterByKind(corpus, "experience").sort(compareByStartDateDesc);
      break;
    case "list_patents":
      intro = "Here are my patents:";
      documents = filterByKind(corpus, "patent").sort(compareByTitle);
      break;
    case "list_capabilities":
      intro = "Here are my capabilities:";
      documents = filterByKind(corpus, "capability").sort(compareByTitle);
      break;
  }

  return {
    answer: formatCatalogAnswer(intro, documents),
    sources: toSources(documents),
    refused: false,
  };
}
