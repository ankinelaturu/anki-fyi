import type { ChunkEmbeddingInfo } from "@/lib/assistant/editorEmbeddings";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveSectionTag(
  section: string,
  markdown: string,
  isFilmstrip: boolean
): "h1" | "h2" {
  if (section === "Metadata") return "h2";
  if (isFilmstrip || /^Day(\s+\d+)?$/i.test(section)) return "h2";

  const pattern = new RegExp(`^#\\s+${escapeRegExp(section)}\\s*$`, "m");
  if (pattern.test(markdown)) return "h1";

  return "h2";
}

function sectionChromeLabel(section: string): string {
  return section === "Metadata" ? "Metadata" : section;
}

/** First `#` heading in the markdown body (no chunk if it has no content below it). */
export function extractMainHeading(markdown: string): string | null {
  for (const line of markdown.split("\n")) {
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
      return line.replace(/^#\s+/, "").trim();
    }
  }
  return null;
}

export function getBodyChunks(chunks: ChunkEmbeddingInfo[]): ChunkEmbeddingInfo[] {
  return chunks.filter((chunk) => chunk.section !== "Metadata");
}

export function SectionChrome({
  section,
  markdown,
  isFilmstrip,
}: {
  section: string;
  markdown: string;
  isFilmstrip: boolean;
}) {
  const Tag = resolveSectionTag(section, markdown, isFilmstrip);
  const label = sectionChromeLabel(section);

  if (Tag === "h1") {
    return <h1>{label}</h1>;
  }

  return <h2>{label}</h2>;
}
