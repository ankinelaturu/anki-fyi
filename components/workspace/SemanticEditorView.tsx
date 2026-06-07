"use client";

import { useMemo } from "react";
import type { ChunkEmbeddingInfo } from "@/lib/assistant/editorEmbeddings";
import { getEmbeddingVisualizations } from "@/lib/assistant/embeddingVisualizations";
import { FingerprintView } from "@/components/workspace/embedding-inspector/FingerprintView";
import { GenomeStrip } from "@/components/workspace/embedding-inspector/GenomeStrip";
import { HeatmapView } from "@/components/workspace/embedding-inspector/HeatmapView";
import { cn } from "@/lib/utils";

type SemanticEditorViewProps = {
  markdown: string;
  chunks: ChunkEmbeddingInfo[];
  isFilmstrip?: boolean;
  className?: string;
};

type ChunkVisualizationPanelProps = {
  chunk: ChunkEmbeddingInfo;
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

function ChunkStats({ chunk, norm }: { chunk: ChunkEmbeddingInfo; norm: number }) {
  return (
    <div className="mt-2 flex gap-4 text-[9px] text-ide-muted">
      <span>
        <span className="text-ide-text/60">Chunk Length:</span> {chunk.textLength} chars
      </span>
      <span>
        <span className="text-ide-text/60">Norm:</span> {norm.toFixed(6)}
      </span>
    </div>
  );
}

function ChunkVisualizationPanel({ chunk, layout }: ChunkVisualizationPanelProps) {
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
        <ChunkStats chunk={chunk} norm={visualizations.norm} />
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
      <ChunkStats chunk={chunk} norm={visualizations.norm} />
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
  isFilmstrip = false,
  className,
}: SemanticEditorViewProps) {
  const layout = isFilmstrip ? "vertical" : "horizontal";

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
          <ChunkVisualizationPanel chunk={chunk} layout={layout} />
        </section>
      ))}
    </div>
  );
}
