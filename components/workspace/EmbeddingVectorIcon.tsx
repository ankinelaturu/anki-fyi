"use client";

import { Binary } from "lucide-react";
import { formatEmbeddingForTooltip } from "@/lib/assistant/editorEmbeddings";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type EmbeddingVectorIconProps = {
  embedding: number[];
  label: string;
  className?: string;
};

export function EmbeddingVectorIcon({ embedding, label, className }: EmbeddingVectorIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded p-0.5 text-[#c586c0] opacity-80 transition-opacity hover:bg-ide-active hover:opacity-100",
            className
          )}
          aria-label={`Embedding vector for ${label}`}
        >
          <Binary className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-md p-2">
        <div className="mb-1 text-[10px] font-medium text-ide-muted">{label}</div>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[9px] leading-snug text-ide-text">
          {formatEmbeddingForTooltip(embedding)}
        </pre>
      </TooltipContent>
    </Tooltip>
  );
}
