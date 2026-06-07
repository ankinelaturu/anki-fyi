"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Binary } from "lucide-react";
import type { ChunkEmbeddingInfo, EmbeddingIndexMeta } from "@/lib/assistant/editorEmbeddings";
import {
  EmbeddingInspector,
  GenomeHoverPreview,
} from "@/components/workspace/embedding-inspector/EmbeddingInspector";
import { cn } from "@/lib/utils";

type EmbeddingVectorIconProps = {
  chunk: ChunkEmbeddingInfo;
  indexMeta: EmbeddingIndexMeta;
  /** Size icon to 1em — use beside section headings. */
  matchFontSize?: boolean;
  className?: string;
};

type PanelPosition = {
  top: number;
  left: number;
};

const PANEL_GAP = 6;

function computePanelPosition(anchor: DOMRect, panelWidth: number, panelHeight: number): PanelPosition {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  let left = anchor.right + PANEL_GAP;
  let top = anchor.top;

  if (left + panelWidth > viewportW - 8) {
    left = Math.max(8, anchor.left - panelWidth - PANEL_GAP);
  }

  if (top + panelHeight > viewportH - 8) {
    top = Math.max(8, viewportH - panelHeight - 8);
  }

  return { top, left };
}

export function EmbeddingVectorIcon({
  chunk,
  indexMeta,
  matchFontSize = false,
  className,
}: EmbeddingVectorIconProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [hoverPreview, setHoverPreview] = useState(false);
  const [hoverPos, setHoverPos] = useState<PanelPosition | null>(null);
  const [inspectorPos, setInspectorPos] = useState<PanelPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateHoverPosition = useCallback(() => {
    const anchor = triggerRef.current?.getBoundingClientRect();
    if (!anchor) return;
    setHoverPos(computePanelPosition(anchor, 140, 48));
  }, []);

  const updateInspectorPosition = useCallback(() => {
    const anchor = triggerRef.current?.getBoundingClientRect();
    if (!anchor) return;
    setInspectorPos(computePanelPosition(anchor, 448, 280));
  }, []);

  useEffect(() => {
    if (!inspectorOpen) return;

    updateInspectorPosition();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectorOpen(false);
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (inspectorRef.current?.contains(target)) return;
      setInspectorOpen(false);
    };

    const onReposition = () => updateInspectorPosition();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [inspectorOpen, updateInspectorPosition]);

  const handleMouseEnter = () => {
    if (inspectorOpen) return;
    updateHoverPosition();
    setHoverPreview(true);
  };

  const handleMouseLeave = () => {
    setHoverPreview(false);
  };

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setHoverPreview(false);
    if (!inspectorOpen) updateInspectorPosition();
    setInspectorOpen((open) => !open);
  };

  const showHover = hoverPreview && !inspectorOpen && mounted;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded text-[#c586c0] opacity-80 transition-opacity hover:bg-ide-active hover:opacity-100",
          matchFontSize ? "p-0 leading-none" : "p-0.5",
          className
        )}
        aria-label={`Embedding vector for ${chunk.section}`}
        aria-expanded={inspectorOpen}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <Binary
          className={cn("shrink-0", matchFontSize ? "h-[1em] w-[1em]" : "h-3.5 w-3.5")}
          strokeWidth={2}
        />
      </button>

      {mounted && showHover && hoverPos
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[100]"
              style={{ top: hoverPos.top, left: hoverPos.left }}
            >
              <GenomeHoverPreview chunk={chunk} indexMeta={indexMeta} />
            </div>,
            document.body
          )
        : null}

      {mounted && inspectorOpen && inspectorPos
        ? createPortal(
            <div
              ref={inspectorRef}
              className="fixed z-[101]"
              style={{ top: inspectorPos.top, left: inspectorPos.left }}
            >
              <EmbeddingInspector chunk={chunk} indexMeta={indexMeta} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
