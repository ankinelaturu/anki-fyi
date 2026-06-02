"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownProse } from "@/components/markdown-prose";
import { FileText, Sparkles, Circle } from "lucide-react";
import { AskAnkiTerminal } from "@/components/workspace/AskAnkiTerminal";
import { FilmstripViewer } from "@/components/filmstrip/FilmstripViewer";
import { PanelResizeHandle } from "@/components/panel-resize-handle";
import { ActivityBar, type SidePanelView } from "@/components/workspace/ActivityBar";
import { ExplorerPanel } from "@/components/workspace/ExplorerPanel";
import { SearchPanel } from "@/components/workspace/SearchPanel";
import { StatusBar } from "@/components/workspace/StatusBar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileIcon } from "@/components/workspace/FileIcon";
import type { ContentFile, ContentFolder } from "@/lib/content-types";
import { FOLDER_LABELS } from "@/lib/folders";
import { usePanelResize } from "@/lib/use-panel-resize";

type WorkspaceProps = {
  folders: ContentFolder[];
  initialSlug: string;
};

const TERMINAL_HEADER_HEIGHT = 32;
const DEFAULT_TERMINAL_BODY_HEIGHT = 300;
const MIN_TERMINAL_BODY_HEIGHT = 64;
const MAX_TERMINAL_BODY_RATIO = 0.55;

const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 520;

const DEFAULT_INSIGHTS_WIDTH = 300;
const MIN_INSIGHTS_WIDTH = 200;
const MAX_INSIGHTS_WIDTH = 520;

const PORTRAIT_WIDTH = 668;
const PORTRAIT_HEIGHT = 882;

export function Workspace({ folders, initialSlug }: WorkspaceProps) {
  const allFiles = useMemo(() => folders.flatMap((folder) => folder.files), [folders]);
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    about: true,
    experience: true,
    capabilities: true,
    projects: true,
    writing: false,
    patents: false,
    lab: true,
    "creative-systems": true,
  });
  const [sidePanelView, setSidePanelView] = useState<SidePanelView>("explorer");
  const getMaxTerminalBodyHeight = useCallback(
    () => Math.max(MIN_TERMINAL_BODY_HEIGHT, Math.floor(window.innerHeight * MAX_TERMINAL_BODY_RATIO)),
    []
  );

  const sidebar = usePanelResize({
    initial: DEFAULT_SIDEBAR_WIDTH,
    min: MIN_SIDEBAR_WIDTH,
    max: MAX_SIDEBAR_WIDTH,
    axis: "x",
  });

  const insights = usePanelResize({
    initial: DEFAULT_INSIGHTS_WIDTH,
    min: MIN_INSIGHTS_WIDTH,
    max: MAX_INSIGHTS_WIDTH,
    axis: "x",
    invertDelta: true,
  });

  const terminal = usePanelResize({
    initial: DEFAULT_TERMINAL_BODY_HEIGHT,
    min: MIN_TERMINAL_BODY_HEIGHT,
    max: getMaxTerminalBodyHeight,
    axis: "y",
    invertDelta: true,
  });

  const { setSize: setTerminalHeight, clamp: clampTerminalHeight } = terminal;

  const portraitPanelWidth = useMemo(
    () => Math.round(terminal.size * (PORTRAIT_WIDTH / PORTRAIT_HEIGHT)),
    [terminal.size]
  );

  useEffect(() => {
    const syncViewport = () => {
      const maxTerminal = getMaxTerminalBodyHeight();
      setTerminalHeight((height) => clampTerminalHeight(Math.min(height, maxTerminal)));
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, [getMaxTerminalBodyHeight, setTerminalHeight, clampTerminalHeight]);

  const activeFile = allFiles.find((file) => file.slug === activeSlug) ?? allFiles[0];
  const activeTabTooltip = useMemo(() => {
    const parts = activeFile.path.split("/");
    if (parts.length === 1) return activeFile.path;
    const folderLabel = FOLDER_LABELS[parts[0]!] ?? parts[0]!.toUpperCase();
    return `${folderLabel}/${parts.slice(1).join("/")}`;
  }, [activeFile.path]);
  const relatedFiles = allFiles
    .filter((file) => file.slug !== activeFile.slug)
    .map((file) => ({ file, score: file.tags.filter((tag) => activeFile.tags.includes(tag)).length }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.file);

  return (
    <TooltipProvider delayDuration={400}>
    <div className="flex h-screen flex-col overflow-hidden bg-ide-bg text-ide-text">
      <header className="flex h-10 items-center justify-between border-b border-ide-border bg-[#181818] px-3 text-xs">
        <div className="flex items-center gap-2">
          <Circle className="h-3 w-3 fill-[#f87171] text-[#f87171]" />
          <Circle className="h-3 w-3 fill-[#fbbf24] text-[#fbbf24]" />
          <Circle className="h-3 w-3 fill-[#34d399] text-[#34d399]" />
          <span className="ml-3 font-semibold text-ide-blue">Anki Nelaturu</span>
          <span className="text-ide-muted">— Principal AI Product Engineer</span>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-ide-green">main</span>
          <span className="text-ide-muted">●</span>
          <span className="text-ide-yellow">Building AI-native systems</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
      <main className="flex min-h-0 flex-1 max-md:flex-col">
        <ActivityBar activeView={sidePanelView} onViewChange={setSidePanelView} />

        <aside
          className="flex min-h-0 shrink-0 flex-col bg-ide-panel max-md:hidden"
          style={{ width: sidebar.size }}
        >
          {sidePanelView === "explorer" ? (
            <ExplorerPanel
              folders={folders}
              activeSlug={activeSlug}
              expanded={expanded}
              onToggleFolder={(folder) =>
                setExpanded((state) => ({ ...state, [folder]: !(state[folder] ?? true) }))
              }
              onSelectFile={setActiveSlug}
            />
          ) : (
            <SearchPanel files={allFiles} activeSlug={activeSlug} onSelectFile={setActiveSlug} />
          )}
        </aside>

        <PanelResizeHandle
          orientation="horizontal"
          active={sidebar.active}
          label="Resize workspace panel"
          className="max-md:hidden"
          onMouseDown={sidebar.onResizeStart}
          onDoubleClick={sidebar.reset}
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-ide-bg">
          <div className="flex h-9 shrink-0 items-center border-b border-ide-border bg-[#202020] text-xs">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-full cursor-default items-center border-r border-ide-border bg-ide-bg px-3 text-ide-text">
                  <FileIcon file={activeFile} selected className="mr-1 text-ide-green" />
                  {activeFile.filename}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">{activeTabTooltip}</TooltipContent>
            </Tooltip>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeFile.type === "filmstrip" ? (
              <FilmstripViewer
                key={activeFile.slug}
                title={activeFile.title}
                description={activeFile.description ?? activeFile.summary}
                markdown={activeFile.content}
                imagePattern={activeFile.imagePattern}
                totalFrames={activeFile.totalFrames}
              />
            ) : (
              <div className="h-full overflow-auto px-8 py-6 max-md:px-4">
                <MarkdownProse>{activeFile.content}</MarkdownProse>
              </div>
            )}
          </div>
        </section>

        <PanelResizeHandle
          orientation="horizontal"
          active={insights.active}
          label="Resize insights panel"
          className="max-lg:hidden"
          onMouseDown={insights.onResizeStart}
          onDoubleClick={insights.reset}
        />

        <aside
          className="flex min-h-0 shrink-0 flex-col bg-ide-panel max-lg:hidden"
          style={{ width: insights.size }}
        >
          <div className="border-b border-ide-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ide-muted">Insights</div>
          <div className="space-y-4 p-4 text-xs">
            <div>
              <div className="mb-2 text-ide-yellow">Current File</div>
              <div className="rounded border border-ide-border bg-[#1b1b1b] p-3">
                <div className="text-ide-blue">{activeFile.title}</div>
                <p className="mt-2 leading-relaxed text-ide-muted">{activeFile.summary}</p>
              </div>
            </div>
            <div>
              <div className="mb-2 text-ide-yellow">Tags</div>
              <div className="flex flex-wrap gap-2">
                {activeFile.tags.map((tag) => (
                  <span key={tag} className="rounded border border-ide-border bg-[#1b1b1b] px-2 py-1 text-ide-green">{tag}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-ide-yellow">Related Files</div>
              <div className="space-y-1">
                {relatedFiles.length ? relatedFiles.map((file) => (
                  <button key={file.slug} onClick={() => setActiveSlug(file.slug)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-ide-active">
                    <FileText className="h-3.5 w-3.5 text-ide-blue" />
                    <span className="truncate">{file.path}</span>
                  </button>
                )) : <div className="text-ide-muted">No related files yet.</div>}
              </div>
            </div>
            <div className="rounded border border-ide-border bg-[#1b1b1b] p-3">
              <div className="mb-2 flex items-center gap-2 text-ide-purple"><Sparkles className="h-4 w-4" /> Quick Facts</div>
              <ul className="space-y-2 text-ide-muted">
                <li>20+ years engineering experience</li>
                <li>Oracle / Sun Microsystems platform background</li>
                <li>4 issued patents</li>
                <li>AI-native systems + developer tooling focus</li>
              </ul>
            </div>
          </div>
        </aside>
      </main>

      <PanelResizeHandle
        orientation="vertical"
        active={terminal.active}
        label="Resize terminal panel"
        onMouseDown={terminal.onResizeStart}
        onDoubleClick={terminal.reset}
      />

      <AskAnkiTerminal
        files={allFiles}
        portraitPanelWidth={portraitPanelWidth}
        portraitWidth={PORTRAIT_WIDTH}
        portraitHeight={PORTRAIT_HEIGHT}
        terminalHeaderHeight={TERMINAL_HEADER_HEIGHT}
        terminalBodyHeight={terminal.size}
        onOpenFile={setActiveSlug}
      />
      </div>

      <StatusBar />
    </div>
    </TooltipProvider>
  );
}
