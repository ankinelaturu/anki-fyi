import type { ContentFile } from "@/lib/content-types";

export type SearchSnippet = {
  line: number;
  text: string;
};

export type SearchResult = {
  file: ContentFile;
  matchCount: number;
  snippets: SearchSnippet[];
};

const MAX_FILES = 24;
const MAX_SNIPPETS_PER_FILE = 3;
const SNIPPET_RADIUS = 48;

function extractSnippets(content: string, query: string): SearchSnippet[] {
  const lower = content.toLowerCase();
  const snippets: SearchSnippet[] = [];
  let fromIndex = 0;

  while (snippets.length < MAX_SNIPPETS_PER_FILE) {
    const index = lower.indexOf(query, fromIndex);
    if (index === -1) break;

    const lineStart = content.lastIndexOf("\n", index) + 1;
    const lineEnd = content.indexOf("\n", index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const lineNumber = content.slice(0, index).split("\n").length;

    const start = Math.max(0, index - lineStart - SNIPPET_RADIUS);
    const end = Math.min(line.length, index - lineStart + query.length + SNIPPET_RADIUS);
    const text = (start > 0 ? "…" : "") + line.slice(start, end).trim() + (end < line.length ? "…" : "");

    snippets.push({ line: lineNumber, text: text || line.trim() });
    fromIndex = index + query.length;
  }

  return snippets;
}

export function searchContentFiles(files: ContentFile[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const file of files) {
    const haystack = `${file.title}\n${file.summary ?? ""}\n${file.path}\n${file.tags.join(" ")}\n${file.content}`.toLowerCase();
    if (!haystack.includes(q)) continue;

    const matchCount = haystack.split(q).length - 1;
    const snippets = extractSnippets(file.content, q);

    results.push({
      file,
      matchCount,
      snippets: snippets.length > 0 ? snippets : [{ line: 1, text: file.summary || file.title }],
    });
  }

  return results
    .sort((a, b) => b.matchCount - a.matchCount || a.file.title.localeCompare(b.file.title))
    .slice(0, MAX_FILES);
}
