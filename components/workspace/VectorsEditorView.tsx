"use client";

import { useMemo } from "react";
import type { ChunkEmbeddingInfo, EmbeddingIndexMeta } from "@/lib/assistant/editorEmbeddings";
import { embeddingModelShortName, formatEmbeddingLines } from "@/lib/assistant/editorEmbeddings";
import { ChunkEmbeddingStats } from "@/components/workspace/ChunkEmbeddingStats";
import {
  extractMainHeading,
  getBodyChunks,
  SectionChrome,
} from "@/components/workspace/chunkEditorSections";
import { cn } from "@/lib/utils";

type VectorsEditorViewProps = {
  markdown: string;
  chunks: ChunkEmbeddingInfo[];
  indexMeta?: EmbeddingIndexMeta | null;
  isFilmstrip?: boolean;
  className?: string;
};

function ChunkVectorPanel({
  chunk,
  indexMeta,
}: {
  chunk: ChunkEmbeddingInfo;
  indexMeta: EmbeddingIndexMeta;
}) {
  const text = useMemo(() => formatEmbeddingLines(chunk.embedding), [chunk.embedding]);

  return (
    <div className="my-2">
      <ChunkEmbeddingStats chunk={chunk} indexMeta={indexMeta} className="mb-2" />
      <div className="w-fit max-w-full rounded border border-ide-border bg-[#1e1e1e] px-4 py-3">
        <div className="whitespace-pre font-mono text-[9px] leading-[1.65] tabular-nums text-[#d4d4d4]">
          {text}
        </div>
      </div>
    </div>
  );
}

export function VectorsEditorView({
  markdown,
  chunks,
  indexMeta,
  isFilmstrip = false,
  className,
}: VectorsEditorViewProps) {
  const resolvedIndexMeta = indexMeta ?? {
    modelShortName: embeddingModelShortName(),
    generatedAt: "",
  };

  if (chunks.length === 0) {
    return (
      <div className={cn("prose-ide text-sm text-ide-muted", className)}>
        Loading vectors…
      </div>
    );
  }

  const bodyChunks = getBodyChunks(chunks);
  const mainHeading = extractMainHeading(markdown);
  const hasMainHeadingChunk = mainHeading
    ? bodyChunks.some((chunk) => chunk.section === mainHeading)
    : false;

  return (
    <div className={cn("prose-ide", className)}>
      {mainHeading && !hasMainHeadingChunk ? <h1>{mainHeading}</h1> : null}
      {bodyChunks.map((chunk) => (
        <div key={chunk.chunkId}>
          <SectionChrome section={chunk.section} markdown={markdown} isFilmstrip={isFilmstrip} />
          <ChunkVectorPanel chunk={chunk} indexMeta={resolvedIndexMeta} />
        </div>
      ))}
    </div>
  );
}
