"use client";

import { useMemo } from "react";
import type { ChunkEmbeddingInfo, EmbeddingIndexMeta } from "@/lib/assistant/editorEmbeddings";
import { extractChunkBody, formatEmbeddingForTooltip, embeddingModelShortName } from "@/lib/assistant/editorEmbeddings";
import {
  EMBEDDING_DIMENSIONS,
  getEmbeddingVisualizations,
} from "@/lib/assistant/embeddingVisualizations";
import { MarkdownProse } from "@/components/markdown-prose";
import { FingerprintView } from "@/components/workspace/embedding-inspector/FingerprintView";
import { GenomeStrip } from "@/components/workspace/embedding-inspector/GenomeStrip";
import { HeatmapView } from "@/components/workspace/embedding-inspector/HeatmapView";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SemanticEditorViewProps = {
  markdown: string;
  chunks: ChunkEmbeddingInfo[];
  indexMeta?: EmbeddingIndexMeta | null;
  isFilmstrip?: boolean;
  className?: string;
};

type ChunkVisualizationPanelProps = {
  chunk: ChunkEmbeddingInfo;
  indexMeta: EmbeddingIndexMeta;
  layout: "horizontal" | "vertical";
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveSectionTag(
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
function extractMainHeading(markdown: string): string | null {
  for (const line of markdown.split("\n")) {
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
      return line.replace(/^#\s+/, "").trim();
    }
  }
  return null;
}

function VizLabel({ children }: { children: string }) {
  return <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-ide-muted">{children}</div>;
}

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

function EmbeddingPill({ embedding }: { embedding: number[] }) {
  const formatted = useMemo(() => formatEmbeddingForTooltip(embedding), [embedding]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-default items-center gap-1 rounded-full border border-ide-border bg-[#1b1b1b] px-2 py-0.5 text-[9px]"
        >
          <span className="text-ide-muted">Embedding</span>
          <span className="font-mono text-ide-text">{EMBEDDING_DIMENSIONS}D</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-md p-0">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-[9px] leading-snug text-ide-text">
          {formatted}
        </pre>
      </TooltipContent>
    </Tooltip>
  );
}

function ChunkStats({
  chunk,
  indexMeta,
}: {
  chunk: ChunkEmbeddingInfo;
  indexMeta: EmbeddingIndexMeta;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <ChunkLengthPill chunk={chunk} />
      <EmbeddingPill embedding={chunk.embedding} />
      <StatPill label="Model" value={indexMeta.modelShortName} />
    </div>
  );
}

function ChunkVisualizationPanel({ chunk, indexMeta, layout }: ChunkVisualizationPanelProps) {
  const visualizations = useMemo(
    () => getEmbeddingVisualizations(chunk.chunkId, chunk.embedding),
    [chunk.chunkId, chunk.embedding]
  );

  if (layout === "vertical") {
    return (
      <div>
        <div className="flex flex-col items-start gap-4 rounded border border-ide-border bg-[#1e1e1e] p-4">
          <div className="w-full">
            <VizLabel>Genome</VizLabel>
            <GenomeStrip genome={visualizations.genome} className="w-full" />
          </div>
          <div>
            <VizLabel>Fingerprint</VizLabel>
            <FingerprintView segments={visualizations.fingerprint} size={140} />
          </div>
          <div className="w-full max-w-xs">
            <VizLabel>Heatmap</VizLabel>
            <HeatmapView normalized={visualizations.normalized} embedding={chunk.embedding} />
          </div>
        </div>
        <ChunkStats chunk={chunk} indexMeta={indexMeta} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-4 rounded border border-ide-border bg-[#1e1e1e] p-4">
        <div className="flex shrink-0 flex-col items-center justify-center self-stretch">
          <VizLabel>Fingerprint</VizLabel>
          <FingerprintView segments={visualizations.fingerprint} size={120} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
          <div className="min-w-0">
            <VizLabel>Genome</VizLabel>
            <GenomeStrip genome={visualizations.genome} className="w-full" />
          </div>
          <div className="min-w-0">
            <VizLabel>Heatmap</VizLabel>
            <HeatmapView normalized={visualizations.normalized} embedding={chunk.embedding} />
          </div>
        </div>
      </div>
      <ChunkStats chunk={chunk} indexMeta={indexMeta} />
    </div>
  );
}

function SectionChrome({
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

export function SemanticEditorView({
  markdown,
  chunks,
  indexMeta,
  isFilmstrip = false,
  className,
}: SemanticEditorViewProps) {
  const layout = isFilmstrip ? "vertical" : "horizontal";
  const resolvedIndexMeta = indexMeta ?? {
    modelShortName: embeddingModelShortName(),
    generatedAt: "",
  };

  if (chunks.length === 0) {
    return (
      <div className={cn("prose-ide max-w-4xl text-sm text-ide-muted", className)}>
        Loading semantic embeddings…
      </div>
    );
  }

  const bodyChunks = chunks.filter((chunk) => chunk.section !== "Metadata");
  const mainHeading = extractMainHeading(markdown);
  const hasMainHeadingChunk = mainHeading
    ? bodyChunks.some((chunk) => chunk.section === mainHeading)
    : false;

  return (
    <div className={cn("prose-ide max-w-4xl", className)}>
      {mainHeading && !hasMainHeadingChunk ? <h1>{mainHeading}</h1> : null}
      {bodyChunks.map((chunk) => (
        <section key={chunk.chunkId} className="mb-8 last:mb-0">
          <SectionChrome section={chunk.section} markdown={markdown} isFilmstrip={isFilmstrip} />
          <ChunkVisualizationPanel chunk={chunk} indexMeta={resolvedIndexMeta} layout={layout} />
        </section>
      ))}
    </div>
  );
}
