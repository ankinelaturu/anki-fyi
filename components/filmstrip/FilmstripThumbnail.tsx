"use client";

import Image from "next/image";
import type { FilmstripFrame } from "@/lib/filmstrip";
import { cn } from "@/lib/utils";

type FilmstripThumbnailProps = {
  frame: FilmstripFrame;
  selected: boolean;
  onSelect: () => void;
};

export function FilmstripThumbnail({ frame, selected, onSelect }: FilmstripThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-20 shrink-0 flex-col overflow-hidden rounded border bg-[#1b1b1b] text-left transition-colors",
        selected ? "border-ide-blue ring-1 ring-ide-blue/40" : "border-ide-border hover:border-ide-muted"
      )}
    >
      <div className="relative aspect-square w-full bg-[#111]">
        {frame.imageSrc ? (
          <Image
            src={frame.imageSrc}
            alt={frame.title}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-ide-muted">—</div>
        )}
      </div>
      <span className={cn("px-1 py-1 text-center text-[10px]", selected ? "text-ide-blue" : "text-ide-muted")}>
        Day {frame.day}
      </span>
    </button>
  );
}
