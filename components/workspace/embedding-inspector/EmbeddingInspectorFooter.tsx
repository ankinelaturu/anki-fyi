"use client";

import type { ChunkEmbeddingInfo, EmbeddingIndexMeta } from "@/lib/assistant/editorEmbeddings";
import { EMBEDDING_DIMENSIONS } from "@/lib/assistant/embeddingVisualizations";
import { formatGeneratedAt } from "@/lib/assistant/embeddingVisualizations";

type EmbeddingInspectorFooterProps = {
  chunk: ChunkEmbeddingInfo;
  indexMeta: EmbeddingIndexMeta;
  norm: number;
};

export function EmbeddingInspectorFooter({ chunk, indexMeta, norm }: EmbeddingInspectorFooterProps) {
  return (
    <div className="mt-3 border-t border-ide-border pt-2 text-[9px] leading-relaxed text-ide-muted">
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <div>
          <span className="text-ide-text/60">Chunk:</span> {chunk.section}
        </div>
        <div>
          <span className="text-ide-text/60">File:</span> {chunk.filePath}
        </div>
        <div>
          <span className="text-ide-text/60">Dimensions:</span> {EMBEDDING_DIMENSIONS}
        </div>
        <div>
          <span className="text-ide-text/60">Model:</span> {indexMeta.modelShortName}
        </div>
        <div>
          <span className="text-ide-text/60">Chunk Length:</span> {chunk.textLength} chars
        </div>
        <div>
          <span className="text-ide-text/60">Norm:</span> {norm.toFixed(6)}
        </div>
        <div className="col-span-2">
          <span className="text-ide-text/60">Generated:</span>{" "}
          {formatGeneratedAt(indexMeta.generatedAt)}
        </div>
      </div>
    </div>
  );
}
