"use client";

import { useMemo, useState } from "react";
import { FileIcon } from "@/components/workspace/FileIcon";
import type { ContentFile } from "@/lib/content-types";
import { searchContentFiles } from "@/lib/search-content";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchPanelProps = {
  files: ContentFile[];
  activeSlug: string;
  onSelectFile: (slug: string) => void;
};

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-ide-blue/30 text-ide-text">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}

export function SearchPanel({ files, activeSlug, onSelectFile }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const results = useMemo(
    () => searchContentFiles(files, searchQuery),
    [files, searchQuery]
  );

  return (
    <>
      <div className="border-b border-ide-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ide-muted">
        Search
      </div>
      <div className="border-b border-ide-border p-2">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search workspace…"
          aria-label="Search workspace files"
          className="h-8 text-xs"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 text-xs">
        {!searchQuery.trim() ? (
          <p className="px-1 py-2 leading-relaxed text-ide-muted">
            Search titles, summaries, tags, and file content across the workspace.
          </p>
        ) : results.length === 0 ? (
          <p className="px-1 py-2 text-ide-muted">No results found.</p>
        ) : (
          <p className="mb-2 px-1 text-ide-muted">{results.length} result{results.length === 1 ? "" : "s"}</p>
        )}
        <ul className="space-y-1">
          {results.map((result) => {
            const isActive = result.file.slug === activeSlug;
            return (
              <li key={result.file.slug}>
                <button
                  type="button"
                  onClick={() => onSelectFile(result.file.slug)}
                  className={cn(
                    "w-full rounded px-2 py-1.5 text-left hover:bg-ide-active",
                    isActive && "bg-ide-active"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileIcon file={result.file} selected={isActive} />
                    <span className={cn("min-w-0 flex-1 truncate font-medium", isActive && "text-white")}>
                      {result.file.title}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate pl-6 text-[10px] text-ide-muted">{result.file.path}</p>
                  {result.snippets.map((snippet) => (
                    <p
                      key={`${result.file.slug}-${snippet.line}`}
                      className="mt-1 line-clamp-2 pl-6 text-[11px] leading-relaxed text-ide-muted"
                    >
                      <span className="text-ide-green">{snippet.line}: </span>
                      {highlightMatch(snippet.text, searchQuery)}
                    </p>
                  ))}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
