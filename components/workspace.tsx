"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownProse } from "@/components/markdown-prose";
import type { LucideIcon } from "lucide-react";
import { Binary, ExternalLink, FileText, Fingerprint, Sparkles, Circle, TriangleAlert } from "lucide-react";
import { toAskAnkiActiveFile } from "@/lib/assistant/activeFileContext";
import { linkDisplayLabel } from "@/lib/assistant/documentLinks";
import { EmbeddingVectorIcon } from "@/components/workspace/EmbeddingVectorIcon";
import { SemanticEditorView } from "@/components/workspace/SemanticEditorView";
import { VectorsEditorView } from "@/components/workspace/VectorsEditorView";
import { AskAnkiTerminal, type AskAnkiTerminalHandle } from "@/components/workspace/AskAnkiTerminal";
import { FilmstripViewer } from "@/components/filmstrip/FilmstripViewer";
import { PanelResizeHandle } from "@/components/panel-resize-handle";
import { ActivityBar, type SidePanelView } from "@/components/workspace/ActivityBar";
import { ExperienceInsightsMeta } from "@/components/workspace/ExperienceInsightsMeta";
import { ExplorerPanel } from "@/components/workspace/ExplorerPanel";
import { SearchPanel } from "@/components/workspace/SearchPanel";
import { StatusBar } from "@/components/workspace/StatusBar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileIcon } from "@/components/workspace/FileIcon";
import type { ContentFile, ContentFolder } from "@/lib/content-types";
import { FOLDER_LABELS } from "@/lib/folders";
import { usePanelResize } from "@/lib/use-panel-resize";
import { useEditorChunkEmbeddings } from "@/lib/use-editor-chunk-embeddings";
import {
  WORKSPACE_EDITOR_TAB_BAR_CLASS,
  WORKSPACE_PANEL_TITLE_CLASS,
} from "@/lib/workspace-chrome";
import { cn } from "@/lib/utils";

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

const DEFAULT_INSIGHTS_WIDTH = 360;
const MIN_INSIGHTS_WIDTH = 200;
const MAX_INSIGHTS_WIDTH = 520;

const PORTRAIT_WIDTH = 668;
const PORTRAIT_HEIGHT = 882;

function EditorViewModeButton({
  pressed,
  onClick,
  icon: Icon,
  label,
  tooltip,
  pressedClassName = "bg-ide-active text-ide-text",
}: {
  pressed: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  tooltip: string;
  pressedClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={pressed}
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] tracking-wide transition-colors",
            pressed ? pressedClassName : "text-ide-muted hover:text-ide-text"
          )}
        >
          <Icon className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

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
  const [showEmbeddingVectors, setShowEmbeddingVectors] = useState(false);
  const [editorViewMode, setEditorViewMode] = useState<"normal" | "semantic" | "vectors">("normal");
  const terminalRef = useRef<AskAnkiTerminalHandle>(null);

  const openFile = useCallback(
    (slug: string) => {
      const file = allFiles.find((item) => item.slug === slug);
      if (!file) return;
      terminalRef.current?.runOpenCommand(file.path);
    },
    [allFiles]
  );
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
  const askAnkiActiveFile = useMemo(() => toAskAnkiActiveFile(activeFile), [activeFile]);
  const chunkEmbeddings = useEditorChunkEmbeddings(
    activeFile.path,
    showEmbeddingVectors || editorViewMode === "semantic" || editorViewMode === "vectors"
  );
  const isFilmstripFile = activeFile.type === "filmstrip";
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
          <div
            className="inline-flex rounded border border-ide-border p-0.5"
            role="group"
            aria-label="Editor view mode"
          >
            <EditorViewModeButton
              pressed={editorViewMode === "normal"}
              onClick={() => setEditorViewMode("normal")}
              icon={FileText}
              label="Text"
              tooltip="Read the markdown source for this file."
            />
            <EditorViewModeButton
              pressed={editorViewMode === "semantic"}
              onClick={() => setEditorViewMode("semantic")}
              icon={Fingerprint}
              label="Semantic"
              tooltip="View corpus chunk embeddings as fingerprint, genome, and heatmap visualizations."
              pressedClassName="bg-ide-active text-[#c586c0]"
            />
            <EditorViewModeButton
              pressed={editorViewMode === "vectors"}
              onClick={() => setEditorViewMode("vectors")}
              icon={Binary}
              label="Vectors"
              tooltip="View the raw embedding vector values for each section."
              pressedClassName="bg-ide-active text-[#c586c0]"
            />
          </div>
          <div className="hidden" aria-hidden>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={showEmbeddingVectors}
                  onClick={() => setShowEmbeddingVectors((on) => !on)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] tracking-wide transition-colors",
                    showEmbeddingVectors
                      ? "border-ide-border bg-ide-active text-[#c586c0]"
                      : "border-transparent text-ide-muted hover:border-ide-border hover:bg-ide-active/50 hover:text-ide-text"
                  )}
                >
                  <Binary className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                  Embeddings
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>
                  Show corpus embedding icons on each chunk. Hover for a genome preview; click an
                  icon to open the Embedding Inspector.
                </p>
                <p className="mt-1 text-ide-muted">
                  Currently {showEmbeddingVectors ? "ON" : "OFF"}. Click to turn{" "}
                  {showEmbeddingVectors ? "OFF" : "ON"}.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-ide-muted">●</span>
          <span className="text-ide-green">main</span>
          <span className="text-ide-muted">●</span>
          <span className="text-ide-yellow">Portfolio Assistant</span>
          <span className="text-ide-muted">●</span>  
          <TriangleAlert className="h-3 w-3 text-[#fbbf24]" />
          <span className="text-[#fbbf24]">Work in progress</span>
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
              onSelectFile={openFile}
            />
          ) : (
            <SearchPanel files={allFiles} activeSlug={activeSlug} onSelectFile={openFile} />
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
          <div className={WORKSPACE_EDITOR_TAB_BAR_CLASS}>
            <div className="flex h-full items-center border-r border-ide-border bg-ide-bg">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-full cursor-default items-center px-3 text-ide-text">
                    <FileIcon file={activeFile} selected className="mr-1 text-ide-green" />
                    {activeFile.filename}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">{activeTabTooltip}</TooltipContent>
              </Tooltip>
              {showEmbeddingVectors && chunkEmbeddings?.metadata ? (
                <EmbeddingVectorIcon
                  chunk={chunkEmbeddings.metadata}
                  indexMeta={chunkEmbeddings.indexMeta}
                  className="mr-2"
                />
              ) : null}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {editorViewMode === "semantic" ? (
              <div className="h-full overflow-auto px-8 py-6 max-md:px-4">
                <SemanticEditorView
                  markdown={activeFile.content}
                  chunks={chunkEmbeddings?.ordered ?? []}
                  indexMeta={chunkEmbeddings?.indexMeta}
                  isFilmstrip={isFilmstripFile}
                />
              </div>
            ) : editorViewMode === "vectors" ? (
              <div className="h-full overflow-auto px-8 py-6 max-md:px-4">
                <VectorsEditorView
                  markdown={activeFile.content}
                  chunks={chunkEmbeddings?.ordered ?? []}
                  indexMeta={chunkEmbeddings?.indexMeta}
                  isFilmstrip={isFilmstripFile}
                />
              </div>
            ) : isFilmstripFile ? (
              <FilmstripViewer
                key={activeFile.slug}
                title={activeFile.title}
                description={activeFile.description ?? activeFile.summary}
                markdown={activeFile.content}
                imagePattern={activeFile.imagePattern}
                totalFrames={activeFile.totalFrames}
                chunkEmbeddings={chunkEmbeddings?.bySection}
                indexMeta={chunkEmbeddings?.indexMeta}
              />
            ) : (
              <div className="h-full overflow-auto px-8 py-6 max-md:px-4">
                <MarkdownProse
                  chunkEmbeddings={chunkEmbeddings?.bySection}
                  indexMeta={chunkEmbeddings?.indexMeta}
                >
                  {activeFile.content}
                </MarkdownProse>
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
          <div className={WORKSPACE_PANEL_TITLE_CLASS}>Insights</div>
          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4 text-xs">
            {((activeFile.elevatorPitch || activeFile.summary) ||
              activeFile.links.length > 0 ||
              (activeFile.kind === "experience" &&
                (activeFile.company || activeFile.startDate || activeFile.endDate))) && (
              <div className="space-y-2">
                {(activeFile.elevatorPitch || activeFile.summary) && (
                  <p className="italic leading-relaxed text-ide-muted">
                    {activeFile.elevatorPitch || activeFile.summary}
                  </p>
                )}
                {activeFile.kind === "experience" ? (
                  <ExperienceInsightsMeta file={activeFile} />
                ) : null}
                {activeFile.links.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {activeFile.links.map((link) => (
                      <li key={`${link.label}-${link.url}`}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-[#f87171]/45 bg-[#f87171]/10 px-2 py-1 text-ide-text transition-colors hover:border-[#f87171]/70 hover:bg-[#f87171]/20"
                        >
                          {linkDisplayLabel(link.label)}
                          <ExternalLink
                            className="h-3 w-3 shrink-0 opacity-90"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span className="sr-only"> (opens in new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div>
              <div className="mb-2 text-ide-yellow">Tags</div>
              <div className="flex flex-wrap gap-2">
                {activeFile.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-ide-border bg-[#1b1b1b] px-2 py-1 text-ide-green"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {activeFile.technologies.length > 0 && (
              <div>
                <div className="mb-2 text-ide-yellow">Technologies</div>
                <div className="flex flex-wrap gap-2">
                  {activeFile.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded border border-ide-border bg-[#1b1b1b] px-2 py-1 text-ide-blue"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="mb-2 text-ide-yellow">Related Files</div>
              <div className="space-y-1">
                {relatedFiles.length ? relatedFiles.map((file) => (
                  <button key={file.slug} onClick={() => openFile(file.slug)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-ide-active">
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
        ref={terminalRef}
        files={allFiles}
        activeFile={askAnkiActiveFile}
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
