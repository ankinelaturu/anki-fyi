"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MarkdownProse } from "@/components/markdown-prose";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { FilmstripThumbnail } from "@/components/filmstrip/FilmstripThumbnail";
import { Input } from "@/components/ui/input";
import { getFilmstripMaxDay, parseFilmstripFrames } from "@/lib/filmstrip";
import { cn } from "@/lib/utils";

type ViewMode = "filmstrip" | "markdown";

type FilmstripViewerProps = {
  title: string;
  description?: string;
  markdown: string;
  imagePattern?: string;
  totalFrames?: number;
};

export function FilmstripViewer({ title, description, markdown, imagePattern, totalFrames }: FilmstripViewerProps) {
  const frames = useMemo(() => parseFilmstripFrames(markdown, imagePattern), [markdown, imagePattern]);
  const maxDay = useMemo(() => getFilmstripMaxDay(frames, totalFrames), [frames, totalFrames]);

  const [viewMode, setViewMode] = useState<ViewMode>("filmstrip");
  const [selectedDay, setSelectedDay] = useState(0);
  const [search, setSearch] = useState("");
  const selectedThumbnailRef = useRef<HTMLButtonElement>(null);

  const filteredFrames = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return frames;
    return frames.filter((frame) => {
      const haystack = `${frame.text} ${frame.hashtag ?? ""} ${frame.title}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [frames, search]);

  const selectedFrame = useMemo(
    () => frames.find((frame) => frame.day === selectedDay) ?? frames[0],
    [frames, selectedDay]
  );

  const selectedIndex = frames.findIndex((frame) => frame.day === selectedDay);
  const canGoPrev = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < frames.length - 1;

  const goToDay = useCallback((day: number) => {
    if (frames.some((frame) => frame.day === day)) setSelectedDay(day);
  }, [frames]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setSelectedDay(frames[selectedIndex - 1]!.day);
  }, [canGoPrev, frames, selectedIndex]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setSelectedDay(frames[selectedIndex + 1]!.day);
  }, [canGoNext, frames, selectedIndex]);

  useEffect(() => {
    if (frames.length === 0) return;
    if (!frames.some((frame) => frame.day === selectedDay)) {
      setSelectedDay(frames[0]!.day);
    }
  }, [frames, selectedDay]);

  useEffect(() => {
    if (search.trim() === "") return;
    if (filteredFrames.some((frame) => frame.day === selectedDay)) return;
    if (filteredFrames[0]) setSelectedDay(filteredFrames[0].day);
  }, [filteredFrames, search, selectedDay]);

  useEffect(() => {
    if (viewMode !== "filmstrip") return;
    selectedThumbnailRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedDay, viewMode, filteredFrames]);

  useEffect(() => {
    if (viewMode !== "filmstrip") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewMode, goPrev, goNext]);

  if (viewMode === "markdown") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <FilmstripToolbar
          title={title}
          description={description}
          dayLabel={null}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          search={search}
          onSearchChange={setSearch}
          showSearch={false}
        />
        <div className="min-h-0 flex-1 overflow-auto px-8 py-6 max-md:px-4">
          <MarkdownProse>{markdown}</MarkdownProse>
        </div>
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-ide-muted">
        No filmstrip frames found. Check ## Day headings in the markdown.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FilmstripToolbar
        title={title}
        description={description}
        dayLabel={`Day ${selectedFrame?.day ?? 0} / ${maxDay}`}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={goPrev}
        onNext={goNext}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        showSearch
      />

      <div className="flex min-h-0 flex-1 flex-col p-4 max-lg:flex-col lg:flex-row lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col border-ide-border max-lg:mb-4 max-lg:flex-1 max-lg:border-b max-lg:pb-4 lg:mb-0 lg:flex-[1] lg:basis-1/4 lg:self-stretch lg:border-b-0 lg:border-r lg:pr-4">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex min-h-full flex-col justify-center py-2">
              <pre className="whitespace-pre-wrap font-mono text-[0.8125rem] leading-relaxed text-ide-text">
                {selectedFrame?.text || "—"}
              </pre>
              {selectedFrame?.hashtag && (
                <p className="mt-3 text-ide-green text-xs">#{selectedFrame.hashtag}</p>
              )}
            </div>
          </div>
        </div>

        <div className="relative min-h-0 min-w-0 overflow-hidden max-lg:min-h-72 max-lg:flex-1 lg:min-h-0 lg:flex-[3] lg:basis-3/4 lg:self-stretch lg:pl-4">
          {selectedFrame?.imageSrc ? (
            <Image
              src={selectedFrame.imageSrc}
              alt={selectedFrame.title}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 75vw"
              priority
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-ide-muted">No image</div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-ide-border bg-[#181818] px-3 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredFrames.length === 0 ? (
            <p className="px-2 py-3 text-xs text-ide-muted">No frames match your search.</p>
          ) : (
            filteredFrames.map((frame) => (
              <FilmstripThumbnail
                key={frame.day}
                ref={frame.day === selectedDay ? selectedThumbnailRef : undefined}
                frame={frame}
                selected={frame.day === selectedDay}
                onSelect={() => goToDay(frame.day)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type FilmstripToolbarProps = {
  title: string;
  description?: string;
  dayLabel: string | null;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  search: string;
  onSearchChange: (value: string) => void;
  showSearch: boolean;
};

function FilmstripToolbar({
  title,
  description,
  dayLabel,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  showSearch,
}: FilmstripToolbarProps) {
  return (
    <div className="shrink-0 border-b border-ide-border bg-[#202020] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-ide-blue text-sm font-semibold">{title}</h1>
          {description && <p className="mt-1 text-ide-muted text-xs leading-relaxed">{description}</p>}
          {dayLabel && (
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                disabled={!canGoPrev}
                className="rounded border border-ide-border px-1.5 py-0.5 text-ide-muted hover:bg-ide-active hover:text-ide-text disabled:opacity-40"
                aria-label="Previous frame"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!canGoNext}
                className="rounded border border-ide-border px-1.5 py-0.5 text-ide-muted hover:bg-ide-active hover:text-ide-text disabled:opacity-40"
                aria-label="Next frame"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <span className="text-ide-yellow text-xs">{dayLabel}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showSearch && (
            <div className="flex items-center gap-1 rounded border border-ide-border bg-[#1b1b1b] px-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-ide-muted" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Filter Caiku…"
                className="h-8 w-36 text-xs"
                aria-label="Filter frames by Caiku text"
              />
            </div>
          )}

          <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        </div>
      </div>
    </div>
  );
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex rounded border border-ide-border text-[11px]">
      {(["filmstrip", "markdown"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onViewModeChange(mode)}
          className={cn(
            "px-2.5 py-1 capitalize",
            viewMode === mode ? "bg-ide-active text-ide-text" : "text-ide-muted hover:bg-ide-active/60"
          )}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
