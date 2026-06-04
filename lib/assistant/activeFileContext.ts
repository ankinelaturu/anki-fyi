import { chunkDocument, sanitizeChunkBody, stripFrontmatterBody } from "@/lib/assistant/chunking";
import { GEMMA_ACTIVE_FILE_MAX_CHUNKS, FILMSTRIP_ACTIVE_DAY_CHUNKS } from "@/lib/assistant/config";
import type { AskAnkiActiveFile } from "@/lib/assistant/types";
import type { CorpusChunk } from "@/lib/assistant/types";

function documentIdFromPath(path: string): string {
  return path.replace(/\.md$/, "");
}

function buildMetadataPreamble(activeFile: AskAnkiActiveFile): string {
  const lines = [
    `Title: ${activeFile.title}`,
    `Path: ${activeFile.path}`,
    activeFile.kind ? `Kind: ${activeFile.kind}` : null,
    activeFile.summary ? `Summary: ${activeFile.summary}` : null,
    activeFile.tags?.length ? `Tags: ${activeFile.tags.join(", ")}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function makeSyntheticChunk(
  activeFile: AskAnkiActiveFile,
  section: string,
  body: string,
  chunkIndex: number
): CorpusChunk {
  const id = documentIdFromPath(activeFile.path);
  return {
    id: `${id}::active::${chunkIndex}`,
    documentId: id,
    path: activeFile.path,
    title: activeFile.title,
    kind: activeFile.kind ?? "document",
    section,
    text: [
      `Title: ${activeFile.title}`,
      `Path: ${activeFile.path}`,
      `Section: ${section}`,
      "",
      body,
    ].join("\n"),
    chunkIndex,
  };
}

function buildFilmstripActiveChunks(activeFile: AskAnkiActiveFile): CorpusChunk[] {
  const id = documentIdFromPath(activeFile.path);
  const kind = activeFile.kind ?? "creative";
  const allChunks = chunkDocument({
    id,
    path: activeFile.path,
    title: activeFile.title,
    kind,
    content: activeFile.content,
    type: "filmstrip",
  });

  const preamble = makeSyntheticChunk(
    activeFile,
    "Overview",
    [
      buildMetadataPreamble(activeFile),
      "",
      "This is a filmstrip diary with many daily entries. Only the overview and first days are included here.",
    ].join("\n"),
    0
  );

  const intro = allChunks.find((c) => /introduction/i.test(c.section)) ?? allChunks[0];
  const dayChunks = allChunks
    .filter((c) => /^day\s+\d+/i.test(c.section) || /^Day\s+\d+/i.test(c.section))
    .slice(0, FILMSTRIP_ACTIVE_DAY_CHUNKS);

  const selected = [preamble, intro, ...dayChunks].filter(
    (chunk): chunk is CorpusChunk => chunk != null
  );

  const seen = new Set<string>();
  const unique: CorpusChunk[] = [];
  for (const chunk of selected) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    unique.push(chunk);
  }

  return unique.slice(0, GEMMA_ACTIVE_FILE_MAX_CHUNKS);
}

/** Chunk the active editor file for pinned prompt context. */
export function buildActiveFileChunks(activeFile: AskAnkiActiveFile): CorpusChunk[] {
  if (activeFile.type === "filmstrip") {
    return buildFilmstripActiveChunks(activeFile);
  }

  const id = documentIdFromPath(activeFile.path);
  const kind = activeFile.kind ?? "document";
  const chunks = chunkDocument({
    id,
    path: activeFile.path,
    title: activeFile.title,
    kind,
    content: activeFile.content,
    type: activeFile.type,
  });

  if (chunks.length === 0) {
    const body = sanitizeChunkBody(stripFrontmatterBody(activeFile.content));
    if (!body) return [];
    return [
      makeSyntheticChunk(
        activeFile,
        "Content",
        [buildMetadataPreamble(activeFile), "", body].join("\n"),
        0
      ),
    ];
  }

  return chunks.slice(0, GEMMA_ACTIVE_FILE_MAX_CHUNKS);
}

export function toAskAnkiActiveFile(file: {
  slug: string;
  path: string;
  title: string;
  kind?: string;
  summary?: string;
  tags?: string[];
  content: string;
  type?: string;
}): AskAnkiActiveFile {
  return {
    slug: file.slug,
    path: file.path,
    title: file.title,
    kind: file.kind,
    summary: file.summary,
    tags: file.tags,
    content: file.content,
    type: file.type,
  };
}
