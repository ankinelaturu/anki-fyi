/**
 * Markdown document chunking for the assistant corpus and live editor context.
 *
 * Splits workspace files into metadata + section chunks with size limits,
 * filmstrip-specific day boundaries, and image stripping for cleaner embeddings.
 */

import { CHUNK_TARGET_MAX_WORDS } from "@/lib/assistant/config";
import type { CorpusChunk, CorpusDocument } from "@/lib/assistant/types";

const DAY_HEADING_RE = /^##\s+Day\s+\d+/im;
const IMAGE_LINE_RE = /!\[[^\]]*\]\([^)]+\)/g;
const IMAGE_PATH_LINE_RE = /^.*\.(png|jpe?g|gif|webp|svg)(\?.*)?\s*$/im;

/**
 * Frontmatter and document fields carried into the metadata chunk body.
 */
export type DocumentChunkMetadata = {
  title: string;
  path: string;
  kind: string;
  summary?: string;
  elevatorPitch?: string;
  order?: number;
  importance?: string;
  tags?: string[];
  technologies?: string[];
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  year?: string | number;
  status?: string;
  linksBlock?: string;
};

/**
 * Input required to chunk a single markdown document into `CorpusChunk` records.
 */
export type ChunkDocumentInput = DocumentChunkMetadata & {
  id: string;
  content: string;
  type?: string;
};

type Section = { heading: string; body: string };

/**
 * Remove YAML frontmatter delimiters and return the markdown body only.
 */
export function stripFrontmatterBody(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("---", 3);
  if (end === -1) return raw;
  return raw.slice(end + 3).replace(/^\s+/, "");
}

/**
 * Strip image markdown and bare image path lines from chunk bodies.
 *
 * Collapses excessive blank lines so embeddings focus on textual content.
 */
export function sanitizeChunkBody(body: string): string {
  return body
    .split("\n")
    .filter((line) => !IMAGE_PATH_LINE_RE.test(line.trim()))
    .join("\n")
    .replace(IMAGE_LINE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Count whitespace-delimited words in a string.
 */
function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Split text at a word boundary, returning head and remainder segments.
 */
function takeWords(text: string, maxWords: number): { head: string; rest: string } {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return { head: text.trim(), rest: "" };
  const head = words.slice(0, maxWords).join(" ");
  const rest = words.slice(maxWords).join(" ");
  return { head, rest };
}

/**
 * Serialize frontmatter fields into the dedicated metadata chunk body.
 */
export function formatMetadataChunkBody(meta: DocumentChunkMetadata): string {
  const lines: string[] = [
    `Title: ${meta.title}`,
    `Path: ${meta.path}`,
    `Kind: ${meta.kind}`,
  ];

  if (meta.summary) lines.push(`Summary: ${meta.summary}`);
  if (meta.elevatorPitch) lines.push(`Elevator pitch: ${meta.elevatorPitch}`);
  if (meta.tags?.length) lines.push(`Tags: ${meta.tags.join(", ")}`);
  if (meta.technologies?.length) lines.push(`Technologies: ${meta.technologies.join(", ")}`);
  if (meta.company) lines.push(`Company: ${meta.company}`);
  if (meta.role) lines.push(`Role: ${meta.role}`);
  if (meta.startDate) lines.push(`Start date: ${meta.startDate}`);
  if (meta.endDate) lines.push(`End date: ${meta.endDate}`);
  if (meta.year != null && meta.year !== "") lines.push(`Year: ${meta.year}`);
  if (meta.status) lines.push(`Status: ${meta.status}`);

  if (meta.linksBlock) {
    lines.push("", meta.linksBlock);
  }

  return lines.join("\n");
}

/**
 * Split an oversized section into multiple parts at word boundaries.
 *
 * Continuation parts receive a `(continued)` suffix on the section heading.
 */
function splitLargeSection(section: Section, maxWords: number): Section[] {
  const words = countWords(section.body);
  if (words <= maxWords) return [section];

  const parts: Section[] = [];
  let rest = section.body;
  let part = 1;

  while (countWords(rest) > maxWords) {
    const { head, rest: remaining } = takeWords(rest, maxWords);
    parts.push({
      heading: part === 1 ? section.heading : `${section.heading} (continued)`,
      body: head,
    });
    rest = remaining;
    part += 1;
  }

  if (rest.trim()) {
    parts.push({
      heading: part === 1 ? section.heading : `${section.heading} (continued)`,
      body: rest.trim(),
    });
  }

  return parts;
}

/**
 * Split markdown on `#` and `##` headings into section chunks.
 *
 * `###+` headings remain nested under their parent `##` section body.
 */
function splitNormalBodySections(markdown: string): Section[] {
  const body = sanitizeChunkBody(markdown);
  if (!body) return [];

  const sections: Section[] = [];
  let heading = "Introduction";
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) sections.push({ heading, body: text });
    buffer = [];
  };

  for (const line of body.split("\n")) {
    const isH1 = /^#\s+/.test(line) && !/^##/.test(line);
    const isH2 = /^##\s+/.test(line) && !/^###/.test(line);

    if (isH1) {
      flush();
      heading = line.replace(/^#\s+/, "").trim();
    } else if (isH2) {
      flush();
      heading = line.replace(/^##\s+/, "").trim();
    } else {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}

/**
 * Split filmstrip markdown on `## Day N` headings.
 *
 * Falls back to normal heading splits when no day headings are detected.
 */
function splitFilmstripSections(markdown: string): Section[] {
  const body = sanitizeChunkBody(markdown);
  if (!body) return [];

  if (!DAY_HEADING_RE.test(body)) {
    return splitNormalBodySections(markdown);
  }

  const parts = body.split(/(?=^##\s+Day\s+\d+)/im).filter(Boolean);
  return parts
    .map((part) => {
      const lines = part.trim().split("\n");
      const first = lines[0] ?? "";
      const heading = first.match(/^##\s+(.+)$/i)?.[1]?.trim() ?? "Day";
      const sectionBody = lines.slice(1).join("\n").trim();
      return { heading, body: sectionBody };
    })
    .filter((section) => section.body.length > 0);
}

/**
 * Format a chunk's searchable text with Title/Path/Section headers.
 */
function formatChunkText(
  title: string,
  path: string,
  section: string,
  body: string
): string {
  return [
    `Title: ${title}`,
    `Path: ${path}`,
    `Section: ${section}`,
    "",
    body,
  ].join("\n");
}

/**
 * Choose filmstrip vs normal section splitting and apply max-word splitting.
 */
function buildBodySections(markdown: string, filmstrip: boolean): Section[] {
  const sections = filmstrip
    ? splitFilmstripSections(markdown)
    : splitNormalBodySections(markdown);

  return sections.flatMap((section) => splitLargeSection(section, CHUNK_TARGET_MAX_WORDS));
}

/**
 * Chunk one document into metadata + body sections ready for embedding.
 */
export function chunkDocument(doc: ChunkDocumentInput): CorpusChunk[] {
  const markdown = stripFrontmatterBody(doc.content);
  const filmstrip = doc.type === "filmstrip";

  const metadataBody = formatMetadataChunkBody(doc);
  const sections: Section[] = [{ heading: "Metadata", body: metadataBody }];

  sections.push(...buildBodySections(markdown, filmstrip));

  return sections.map((section, index) => ({
    id: `${doc.id}::${index}`,
    documentId: doc.id,
    path: doc.path,
    title: doc.title,
    kind: doc.kind,
    section: section.heading,
    text: formatChunkText(doc.title, doc.path, section.heading, section.body),
    chunkIndex: index,
  }));
}

/**
 * Build a full `CorpusDocument` with derived chunks from chunking input.
 *
 * Assigns document id from path and strips frontmatter from stored content.
 */
export function buildCorpusDocument(
  input: Omit<ChunkDocumentInput, "id"> & {
    tags: string[];
  }
): CorpusDocument {
  const id = input.path.replace(/\.md$/, "");
  const chunks = chunkDocument({ ...input, id });

  return {
    id,
    path: input.path,
    title: input.title,
    kind: input.kind,
    summary: input.summary,
    elevatorPitch: input.elevatorPitch,
    order: typeof input.order === "number" ? input.order : undefined,
    importance: typeof input.importance === "string" ? input.importance : undefined,
    startDate: input.startDate,
    company: input.company,
    technologies: input.technologies?.length ? input.technologies : undefined,
    type: input.type,
    tags: input.tags,
    content: stripFrontmatterBody(input.content),
    chunks,
  };
}
