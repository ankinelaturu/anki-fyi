/**
 * Active editor file context for Ask Anki.
 *
 * Chunks live editor content on the fly (mirroring corpus chunking rules) and
 * maps workspace `ContentFile` records into the `AskAnkiActiveFile` shape.
 */

import { chunkDocument } from "@/lib/assistant/chunking";
import { formatLinksBlockFromDocumentLinks } from "@/lib/assistant/documentLinks";
import { parseCorpusFrontMatter } from "@/lib/assistant/frontMatter";
import { GEMMA_ACTIVE_FILE_MAX_CHUNKS, FILMSTRIP_ACTIVE_DAY_CHUNKS } from "@/lib/assistant/config";
import type { AskAnkiActiveFile } from "@/lib/assistant/types";
import type { CorpusChunk } from "@/lib/assistant/types";
import type { ContentFile } from "@/lib/content-types";

/**
 * Derive a stable document id from a workspace-relative markdown path.
 */
function documentIdFromPath(path: string): string {
  return path.replace(/\.md$/, "");
}

/**
 * Returns true for filmstrip day section headings like "Day 12".
 */
function isFilmstripDaySection(section: string): boolean {
  return /^day\s+\d+/i.test(section);
}

/**
 * Chunk the active editor file for pinned Gemma prompt context.
 *
 * For filmstrips, includes metadata plus the first N day sections. For other
 * documents, takes the first `GEMMA_ACTIVE_FILE_MAX_CHUNKS` chunks in order.
 */
export function buildActiveFileChunks(activeFile: AskAnkiActiveFile): CorpusChunk[] {
  const id = documentIdFromPath(activeFile.path);
  const folder = activeFile.path.includes("/") ? activeFile.path.split("/")[0]! : "about";
  const frontMatter = parseCorpusFrontMatter(
    {
      title: activeFile.title,
      kind: activeFile.kind,
      summary: activeFile.summary,
      elevator_pitch: activeFile.elevatorPitch,
      tags: activeFile.tags,
      technologies: activeFile.technologies,
      company: activeFile.company,
      role: activeFile.role,
      start_date: activeFile.startDate,
      end_date: activeFile.endDate,
      year: activeFile.year,
      status: activeFile.status,
      type: activeFile.type,
    },
    {
      relativePath: activeFile.path,
      folder,
      fallbackTitle: activeFile.title,
    }
  );
  const chunks = chunkDocument({
    id,
    path: activeFile.path,
    title: activeFile.title,
    kind: activeFile.kind ?? frontMatter.kind,
    content: activeFile.content,
    type: activeFile.type,
    summary: activeFile.summary,
    elevatorPitch: activeFile.elevatorPitch,
    tags: activeFile.tags,
    technologies: activeFile.technologies,
    company: activeFile.company,
    role: activeFile.role,
    startDate: activeFile.startDate,
    endDate: activeFile.endDate,
    year: activeFile.year,
    status: activeFile.status,
    linksBlock: activeFile.linksBlock,
    frontMatter,
  });

  if (activeFile.type === "filmstrip") {
    const metadata = chunks.find((chunk) => chunk.section === "Metadata");
    const dayChunks = chunks.filter((chunk) => isFilmstripDaySection(chunk.section));
    const selected = [metadata, ...dayChunks.slice(0, FILMSTRIP_ACTIVE_DAY_CHUNKS)].filter(
      (chunk): chunk is CorpusChunk => chunk != null
    );
    return selected.slice(0, GEMMA_ACTIVE_FILE_MAX_CHUNKS);
  }

  return chunks.slice(0, GEMMA_ACTIVE_FILE_MAX_CHUNKS);
}

/**
 * Convert a workspace `ContentFile` into the shape expected by `askAnki`.
 */
export function toAskAnkiActiveFile(file: ContentFile): AskAnkiActiveFile {
  return {
    slug: file.slug,
    path: file.path,
    title: file.title,
    kind: file.kind,
    summary: file.summary,
    elevatorPitch: file.elevatorPitch,
    tags: file.tags,
    technologies: file.technologies,
    company: file.company,
    role: file.role,
    startDate: file.startDate,
    endDate: file.endDate,
    year: file.year,
    status: file.status,
    content: file.content,
    type: file.type,
    linksBlock: formatLinksBlockFromDocumentLinks(file.links),
  };
}
