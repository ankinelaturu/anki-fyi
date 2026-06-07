"use client";

import { useMemo } from "react";
import type { ChunkEmbeddingInfo } from "@/lib/assistant/editorEmbeddings";
import { extractChunkBody } from "@/lib/assistant/editorEmbeddings";
import type { EmbeddingIndexMeta } from "@/lib/assistant/editorEmbeddings";
import { EMBEDDING_DIMENSIONS } from "@/lib/assistant/embeddingVisualizations";
import { MarkdownProse } from "@/components/markdown-prose";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ide-border bg-[#1b1b1b] px-2 py-0.5 text-[9px]">
      <span className="text-ide-muted">{label}</span>
      <span className="font-mono text-ide-text">{value}</span>
    </span>
  );
}

function ChunkLengthPill({ chunk }: { chunk: ChunkEmbeddingInfo }) {
  const body = useMemo(() => extractChunkBody(chunk.text), [chunk.text]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-default items-center gap-1 rounded-full border border-ide-border bg-[#1b1b1b] px-2 py-0.5 text-[9px]"
        >
          <span className="text-ide-muted">Chunk Length</span>
          <span className="font-mono text-ide-text">{chunk.textLength} chars</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-md p-0">
        <div className="max-h-64 overflow-auto p-3">
          <MarkdownProse className="prose-ide max-w-none text-[10px]">{body}</MarkdownProse>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function EmbeddingPill() {
  return <StatPill label="Embedding" value={`${EMBEDDING_DIMENSIONS}D`} />;
}

export function ChunkEmbeddingStats({
  chunk,
  indexMeta,
  className,
}: {
  chunk: ChunkEmbeddingInfo;
  indexMeta: EmbeddingIndexMeta;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <ChunkLengthPill chunk={chunk} />
      <EmbeddingPill />
      <StatPill label="Model" value={indexMeta.modelShortName} />
    </div>
  );
}
