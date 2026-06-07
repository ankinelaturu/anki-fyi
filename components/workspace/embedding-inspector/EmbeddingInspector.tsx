"use client";

import { useMemo, useState } from "react";
import type { ChunkEmbeddingInfo, EmbeddingIndexMeta } from "@/lib/assistant/editorEmbeddings";
import {
  EMBEDDING_DIMENSIONS,
  getEmbeddingVisualizations,
} from "@/lib/assistant/embeddingVisualizations";
import { EmbeddingInspectorFooter } from "@/components/workspace/embedding-inspector/EmbeddingInspectorFooter";
import { FingerprintView } from "@/components/workspace/embedding-inspector/FingerprintView";
import { GenomeStrip } from "@/components/workspace/embedding-inspector/GenomeStrip";
import { HeatmapView } from "@/components/workspace/embedding-inspector/HeatmapView";
import { RawView } from "@/components/workspace/embedding-inspector/RawView";
import { cn } from "@/lib/utils";

const INSPECTOR_TABS = [
  { id: "genome", label: "Genome" },
  { id: "fingerprint", label: "Fingerprint" },
  { id: "heatmap", label: "Heatmap" },
  { id: "raw", label: "Raw" },
] as const;

type InspectorTabId = (typeof INSPECTOR_TABS)[number]["id"];

type EmbeddingInspectorProps = {
  chunk: ChunkEmbeddingInfo;
  indexMeta: EmbeddingIndexMeta;
  className?: string;
};

export function EmbeddingInspector({ chunk, indexMeta, className }: EmbeddingInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTabId>("genome");
  const visualizations = useMemo(
    () => getEmbeddingVisualizations(chunk.chunkId, chunk.embedding),
    [chunk.chunkId, chunk.embedding]
  );

  return (
    <div
      className={cn(
        "w-[min(28rem,calc(100vw-2rem))] rounded border border-ide-border bg-[#252526] p-3 shadow-lg",
        className
      )}
    >
      <div className="mb-2 text-[11px] font-medium text-ide-text">Embedding Inspector</div>

      <div className="mb-3 flex gap-0.5 border-b border-ide-border pb-2">
        {INSPECTOR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] transition-colors",
              activeTab === tab.id
                ? "bg-ide-active text-ide-text"
                : "text-ide-muted hover:bg-ide-active/60 hover:text-ide-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[120px]">
        {activeTab === "genome" ? (
          <div className="space-y-2">
            <GenomeStrip genome={visualizations.genome} className="w-full" />
            <div className="text-[9px] text-ide-muted">
              <div>Dimensions: {EMBEDDING_DIMENSIONS}</div>
              <div>Model: {indexMeta.modelShortName}</div>
              <div>Chunk Length: {chunk.textLength} chars</div>
              <div>Norm: {visualizations.norm.toFixed(6)}</div>
            </div>
          </div>
        ) : null}

        {activeTab === "fingerprint" ? (
          <FingerprintView segments={visualizations.fingerprint} />
        ) : null}

        {activeTab === "heatmap" ? (
          <HeatmapView normalized={visualizations.normalized} embedding={chunk.embedding} />
        ) : null}

        {activeTab === "raw" ? (
          <RawView rawFormatted={visualizations.rawFormatted} embedding={chunk.embedding} />
        ) : null}
      </div>

      <EmbeddingInspectorFooter
        chunk={chunk}
        indexMeta={indexMeta}
        norm={visualizations.norm}
      />
    </div>
  );
}

type GenomeHoverPreviewProps = {
  chunk: ChunkEmbeddingInfo;
  indexMeta: EmbeddingIndexMeta;
  className?: string;
};

export function GenomeHoverPreview({ chunk, indexMeta, className }: GenomeHoverPreviewProps) {
  const visualizations = useMemo(
    () => getEmbeddingVisualizations(chunk.chunkId, chunk.embedding),
    [chunk.chunkId, chunk.embedding]
  );

  return (
    <div
      className={cn(
        "rounded border border-ide-border bg-[#252526] px-2 py-1.5 shadow-md",
        className
      )}
    >
      <div className="mb-1 text-[9px] font-medium text-ide-muted">{chunk.section}</div>
      <GenomeStrip genome={visualizations.genome} compact />
      <div className="mt-1 text-[8px] text-ide-muted">
        {indexMeta.modelShortName} · click for inspector
      </div>
    </div>
  );
}
