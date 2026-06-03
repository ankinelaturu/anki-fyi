import {
  CHUNK_OVERLAP_WORDS,
  CHUNK_TARGET_MAX_WORDS,
  CHUNK_TARGET_MIN_WORDS,
} from "@/lib/assistant/config";
import type { CorpusChunk, CorpusDocument } from "@/lib/assistant/types";

const DAY_HEADING_RE = /^##\s+Day\s+\d+/im;
const HEADING_RE = /^(#{1,3})\s+(.+)$/gm;
const IMAGE_LINE_RE = /!\[[^\]]*\]\([^)]+\)/g;
const IMAGE_PATH_LINE_RE = /^.*\.(png|jpe?g|gif|webp|svg)(\?.*)?\s*$/im;

export function stripFrontmatterBody(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("---", 3);
  if (end === -1) return raw;
  return raw.slice(end + 3).replace(/^\s+/, "");
}

export function sanitizeChunkBody(body: string): string {
  return body
    .split("\n")
    .filter((line) => !IMAGE_PATH_LINE_RE.test(line.trim()))
    .join("\n")
    .replace(IMAGE_LINE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function takeWords(text: string, maxWords: number): { head: string; rest: string } {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return { head: text.trim(), rest: "" };
  const head = words.slice(0, maxWords).join(" ");
  const rest = words.slice(maxWords).join(" ");
  return { head, rest };
}

function takeLastWords(text: string, wordCount: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= wordCount) return text.trim();
  return words.slice(-wordCount).join(" ");
}

type Section = { heading: string; body: string };

function splitByHeadings(markdown: string, filmstrip: boolean): Section[] {
  const body = sanitizeChunkBody(markdown);
  if (!body) return [];

  if (filmstrip && DAY_HEADING_RE.test(body)) {
    const parts = body.split(/(?=^##\s+Day\s+\d+)/im).filter(Boolean);
    return parts.map((part) => {
      const lines = part.trim().split("\n");
      const first = lines[0] ?? "";
      const heading = first.match(/^##\s+(.+)$/i)?.[1]?.trim() ?? "Day";
      const sectionBody = lines.slice(1).join("\n").trim();
      return { heading, body: sectionBody };
    });
  }

  const sections: Section[] = [];
  let lastIndex = 0;
  let currentHeading = "Introduction";
  const matches = [...body.matchAll(HEADING_RE)];

  if (matches.length === 0) {
    return [{ heading: "Introduction", body }];
  }

  for (const match of matches) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      const slice = body.slice(lastIndex, index).trim();
      if (slice) sections.push({ heading: currentHeading, body: slice });
    }
    currentHeading = match[2]?.trim() ?? "Section";
    lastIndex = index + match[0].length;
  }

  const tail = body.slice(lastIndex).trim();
  if (tail) sections.push({ heading: currentHeading, body: tail });

  return sections.filter((s) => s.body.length > 0);
}

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

function packSections(sections: Section[]): { heading: string; body: string }[] {
  const packed: { heading: string; body: string }[] = [];
  let bufferHeading = "";
  let bufferBody = "";

  const flush = () => {
    if (!bufferBody.trim()) return;
    packed.push({ heading: bufferHeading || "Introduction", body: bufferBody.trim() });
    bufferHeading = "";
    bufferBody = "";
  };

  for (const section of sections) {
    const pieces = splitLargeSection(section, CHUNK_TARGET_MAX_WORDS);
    for (const piece of pieces) {
      const pieceWords = countWords(piece.body);
      const bufferWords = countWords(bufferBody);

      if (!bufferBody) {
        bufferHeading = piece.heading;
        bufferBody = piece.body;
        continue;
      }

      if (bufferWords + pieceWords <= CHUNK_TARGET_MAX_WORDS) {
        bufferBody = `${bufferBody}\n\n## ${piece.heading}\n\n${piece.body}`;
        continue;
      }

      if (bufferWords >= CHUNK_TARGET_MIN_WORDS) {
        flush();
        bufferHeading = piece.heading;
        bufferBody = piece.body;
      } else {
        bufferBody = `${bufferBody}\n\n## ${piece.heading}\n\n${piece.body}`;
        if (countWords(bufferBody) >= CHUNK_TARGET_MAX_WORDS) flush();
      }
    }
  }

  flush();
  return packed;
}

function applyOverlap(chunks: { heading: string; body: string }[]): { heading: string; body: string }[] {
  if (chunks.length <= 1) return chunks;

  const withOverlap: { heading: string; body: string }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    let body = chunk.body;
    if (i > 0) {
      const prev = chunks[i - 1]!.body;
      const overlap = takeLastWords(prev, CHUNK_OVERLAP_WORDS);
      if (overlap) body = `${overlap}\n\n${body}`;
    }
    withOverlap.push({ heading: chunk.heading, body });
  }
  return withOverlap;
}

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

export function chunkDocument(doc: {
  id: string;
  path: string;
  title: string;
  kind: string;
  content: string;
  type?: string;
  linksBlock?: string;
}): CorpusChunk[] {
  const markdown = stripFrontmatterBody(doc.content);
  const filmstrip = doc.type === "filmstrip";
  const sections = splitByHeadings(markdown, filmstrip);
  const packed = applyOverlap(packSections(sections));

  return packed.map((section, index) => {
    let body = section.body;
    if (index === 0 && doc.linksBlock) {
      body = `${doc.linksBlock}\n\n${body}`;
    }
    return {
      id: `${doc.id}::${index}`,
      documentId: doc.id,
      path: doc.path,
      title: doc.title,
      kind: doc.kind,
      section: section.heading,
      text: formatChunkText(doc.title, doc.path, section.heading, body),
      chunkIndex: index,
    };
  });
}

export function buildCorpusDocument(input: {
  path: string;
  title: string;
  kind: string;
  summary?: string;
  tags: string[];
  content: string;
  type?: string;
  linksBlock?: string;
}): CorpusDocument {
  const id = input.path.replace(/\.md$/, "");
  const chunks = chunkDocument({
    id,
    path: input.path,
    title: input.title,
    kind: input.kind,
    content: input.content,
    type: input.type,
    linksBlock: input.linksBlock,
  });

  return {
    id,
    path: input.path,
    title: input.title,
    kind: input.kind,
    summary: input.summary,
    tags: input.tags,
    content: stripFrontmatterBody(input.content),
    chunks,
  };
}
