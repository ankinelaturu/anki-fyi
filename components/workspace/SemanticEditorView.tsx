"use client";

import { useMemo } from "react";
import type { ChunkEmbeddingInfo, EmbeddingIndexMeta } from "@/lib/assistant/editorEmbeddings";
import { embeddingModelShortName } from "@/lib/assistant/editorEmbeddings";
import { getEmbeddingVisualizations } from "@/lib/assistant/embeddingVisualizations";
import { ChunkEmbeddingStats } from "@/components/workspace/ChunkEmbeddingStats";
import {
  extractMainHeading,
  getBodyChunks,
  SectionChrome,
} from "@/components/workspace/chunkEditorSections";
import { FingerprintView } from "@/components/workspace/embedding-inspector/FingerprintView";
import { GenomeStrip } from "@/components/workspace/embedding-inspector/GenomeStrip";
import { HeatmapView } from "@/components/workspace/embedding-inspector/HeatmapView";
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

function VizLabel({ children }: { children: string }) {
  return <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-ide-muted">{children}</div>;
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
        <ChunkEmbeddingStats chunk={chunk} indexMeta={indexMeta} className="mt-2" />
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
      <ChunkEmbeddingStats chunk={chunk} indexMeta={indexMeta} className="mt-2" />
    </div>
  );
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

  const bodyChunks = getBodyChunks(chunks);
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
