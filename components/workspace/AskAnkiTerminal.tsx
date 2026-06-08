"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Terminal, Trash2 } from "lucide-react";
import { askAnki } from "@/lib/assistant/askAnki";
import { PRIVACY_NOTE, type PlannerEngineMode } from "@/lib/assistant/config";
import {
  loadPlannerEngineMode,
  setPlannerEngineMode,
} from "@/lib/assistant/plannerEngineMode";
import { PlannerEngineModeControl } from "@/components/workspace/PlannerEngineModeControl";
import type { AskAnkiActiveFile, AskAnkiSource, AskAnkiTimings } from "@/lib/assistant/types";
import type { ContentFile } from "@/lib/content-types";
import { MarkdownProse } from "@/components/markdown-prose";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  appendCommandHistory,
  createHistoryNavigator,
  loadCommandHistory,
  navigateCommandHistory,
  saveCommandHistory,
  type CommandHistoryNavigator,
} from "@/lib/terminal/commandHistory";
import {
  acceptNextOpenGhostChar,
  buildOpenCommand,
  getOpenGhostSuffix,
  getOpenPathPrefix,
  listOpenCandidates,
} from "@/lib/terminal/openCompletion";

const CLI_COMMANDS = new Set(["help", "resume", "contact", "projects"]);

const SUGGESTED_PROMPTS = [
  "Tell me about yourself.",
  "Tell me about Lintern.",
  "What is AstroValley?",
  "What is ZeroFabric?",
  "Which of your projects use local AI?",
  "Tell me about Aimless Dude & Hyper Dog.",
];

type AskAnkiTerminalProps = {
  files: ContentFile[];
  activeFile?: AskAnkiActiveFile | null;
  portraitPanelWidth: number;
  portraitWidth: number;
  portraitHeight: number;
  terminalHeaderHeight: number;
  terminalBodyHeight: number;
  onOpenFile: (slug: string) => void;
};

export type AskAnkiTerminalHandle = {
  /** Run `open <target>` in the terminal (path, slug, or title fragment). */
  runOpenCommand: (target: string) => void;
};

const STATUS_DOT_INTERVAL_MS = 450;

/** Three fixed slots — hidden dots stay in layout so the line never shifts. */
function StatusDots({ visibleCount }: { visibleCount: number }) {
  return (
    <span className="inline-flex font-mono" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span key={index} className={index < visibleCount ? undefined : "invisible"}>
          .
        </span>
      ))}
    </span>
  );
}

function AnimatedStatusLine({ status, animate }: { status: string; animate: boolean }) {
  const [dotCount, setDotCount] = useState(1);
  const base = status.replace(/\.+$/, "");
  const staticDotCount = status.match(/\.+$/)?.[0]?.length ?? 0;

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => {
      setDotCount((count) => (count % 3) + 1);
    }, STATUS_DOT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [animate, status]);

  return (
    <p className="mt-1 text-ide-yellow">
      {base}
      {animate ? (
        <StatusDots visibleCount={dotCount} />
      ) : staticDotCount > 0 ? (
        <StatusDots visibleCount={staticDotCount} />
      ) : null}
    </p>
  );
}

export const AskAnkiTerminal = forwardRef<AskAnkiTerminalHandle, AskAnkiTerminalProps>(
  function AskAnkiTerminal(
    {
      files,
      activeFile,
      portraitPanelWidth,
      portraitWidth,
      portraitHeight,
      terminalHeaderHeight,
      terminalBodyHeight,
      onOpenFile,
    },
    ref
  ) {
  const [query, setQuery] = useState("");
  const [cliLines, setCliLines] = useState<string[]>([
    "Workspace ready.",
    `Indexed ${files.length} workspace files.`,
    "Commands: help, open <file>, search <topic>, resume, contact, projects",
    "Ask me anything about my work, projects, and writing.",
  ]);
  const [previousQuestion, setPreviousQuestion] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AskAnkiSource[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [timings, setTimings] = useState<AskAnkiTimings | null>(null);
  const [engineMode, setEngineMode] = useState<PlannerEngineMode>("shared");
  const [loading, setLoading] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const askAbortRef = useRef(0);
  const commandHistoryRef = useRef<string[]>([]);
  const historyNavRef = useRef<CommandHistoryNavigator>(createHistoryNavigator());
  const queryRef = useRef(query);
  const [openSuggestionIndex, setOpenSuggestionIndex] = useState(0);

  queryRef.current = query;

  useEffect(() => {
    commandHistoryRef.current = loadCommandHistory();
  }, []);

  useEffect(() => {
    const mode = loadPlannerEngineMode();
    setEngineMode(mode);
    setPlannerEngineMode(mode);
  }, []);

  const handleEngineModeChange = useCallback((mode: PlannerEngineMode) => {
    setEngineMode(mode);
    setPlannerEngineMode(mode);
  }, []);

  const recordCommand = useCallback((command: string) => {
    const next = appendCommandHistory(commandHistoryRef.current, command);
    commandHistoryRef.current = next;
    saveCommandHistory(next);
    historyNavRef.current = createHistoryNavigator();
  }, []);

  const navigateHistory = useCallback((direction: "up" | "down") => {
    const result = navigateCommandHistory(
      commandHistoryRef.current,
      historyNavRef.current,
      queryRef.current,
      direction
    );
    if (!result) return;
    historyNavRef.current = result.nav;
    setQuery(result.nextQuery);
  }, []);

  const isBrowsingHistory = () => historyNavRef.current.index !== -1;

  const openPathPrefix = useMemo(() => getOpenPathPrefix(query), [query]);

  const openCandidates = useMemo(() => {
    if (openPathPrefix === null) return [];
    return listOpenCandidates(files, openPathPrefix);
  }, [files, openPathPrefix]);

  const openCompletionActive = openPathPrefix !== null && openCandidates.length > 0;

  const openSuggestionIndexSafe =
    openCandidates.length > 0 ? openSuggestionIndex % openCandidates.length : 0;

  const openSelectedPath = openCandidates[openSuggestionIndexSafe];

  const openGhostSuffix = useMemo(
    () => getOpenGhostSuffix(query, openSelectedPath),
    [query, openSelectedPath]
  );

  useEffect(() => {
    setOpenSuggestionIndex(0);
  }, [openPathPrefix]);

  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [cliLines, answer, status, timings, currentQuestion, sources]);

  const runCliCommand = useCallback(
    (command: string) => {
      let output = "";

      if (command === "help") {
        output = `Available commands:\n\nopen <file>\nsearch <topic>\nresume\ncontact\nprojects\n\nAsk me anything else at the prompt below.`;
      } else if (command === "projects") {
        output = files
          .filter((file) => file.path.startsWith("projects/"))
          .map((file) => file.path)
          .join("\n");
      } else if (command === "resume") {
        const resume = files.find((file) => file.path === "about/resume.md");
        if (resume) onOpenFile(resume.slug);
        output = "Opening resume.md";
      } else if (command === "contact") {
        const contact = files.find((file) => file.path === "about/contact.md");
        if (contact) onOpenFile(contact.slug);
        output = "Opening contact.md";
      } else if (command.startsWith("open ")) {
        const target = command.replace(/^open\s+/, "").replace(/^\//, "").toLowerCase();
        const match = files.find(
          (file) =>
            file.path.toLowerCase().includes(target) ||
            file.title.toLowerCase().includes(target)
        );
        if (match) {
          onOpenFile(match.slug);
          output = `Opening ${match.path}`;
        } else {
          output = `File not found: ${target}`;
        }
      } else if (command.startsWith("search ")) {
        const term = command.replace(/^search\s+/, "").toLowerCase();
        const matches = files
          .filter((file) =>
            `${file.title} ${file.summary} ${file.tags.join(" ")} ${file.content}`
              .toLowerCase()
              .includes(term)
          )
          .slice(0, 8);
        output = matches.length ? matches.map((file) => file.path).join("\n") : `No results for ${term}`;
      } else {
        output = `Unknown command: ${command}\nType help for available commands.`;
      }

      setCliLines((lines) => [...lines, `> ${command}`, output]);
    },
    [files, onOpenFile]
  );

  useImperativeHandle(
    ref,
    () => ({
      runOpenCommand(target: string) {
        runCliCommand(`open ${target}`);
      },
    }),
    [runCliCommand]
  );

  const runAsk = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;

      const askId = ++askAbortRef.current;
      setPreviousQuestion(currentQuestion);
      setCurrentQuestion(q);
      setAnswer("");
      setSources([]);
      setTimings(null);
      setStatus("Starting...");
      setLoading(true);

      try {
        const response = await askAnki(
          {
            question: q,
            activeFile: activeFile ?? undefined,
          },
          {
            onStatus: (message) => {
              if (askAbortRef.current !== askId) return;
              setStatus(message);
            },
            onToken: (token) => {
              if (askAbortRef.current !== askId) return;
              setStatus((prev) => (prev ? null : prev));
              setAnswer((prev) => prev + token);
            },
          }
        );

        if (askAbortRef.current !== askId) return;

        setAnswer(response.answer);
        setSources(response.refused ? [] : response.sources);
        setTimings(response.timings ?? null);
        setStatus(null);
      } catch (error) {
        if (askAbortRef.current !== askId) return;
        setAnswer(error instanceof Error ? error.message : "Ask Anki failed.");
        setSources([]);
        setTimings(null);
        setStatus(null);
      } finally {
        if (askAbortRef.current === askId) setLoading(false);
      }
    },
    [activeFile, currentQuestion]
  );

  const handleSubmit = useCallback(
    (raw: string) => {
      const input = raw.trim();
      if (!input) return;

      recordCommand(input);

      const lower = input.toLowerCase();
      const firstWord = lower.split(/\s+/)[0] ?? "";

      if (
        CLI_COMMANDS.has(firstWord) ||
        lower.startsWith("open ") ||
        lower.startsWith("search ")
      ) {
        runCliCommand(input);
        setQuery("");
        return;
      }

      const question = lower.startsWith("ask ")
        ? input.replace(/^ask\s+/i, "").replace(/^"|"$/g, "")
        : input;
      void runAsk(question);
      setQuery("");
    },
    [recordCommand, runAsk, runCliCommand]
  );

  const clearInput = useCallback(() => {
    setQuery("");
    historyNavRef.current = createHistoryNavigator();
    setOpenSuggestionIndex(0);
  }, []);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        clearInput();
        return;
      }

      if (event.key === "ArrowUp") {
        if (isBrowsingHistory()) {
          event.preventDefault();
          navigateHistory("up");
          return;
        }
        if (openCompletionActive) {
          event.preventDefault();
          setOpenSuggestionIndex(
            (index) => (index - 1 + openCandidates.length) % openCandidates.length
          );
          return;
        }
        event.preventDefault();
        navigateHistory("up");
        return;
      }

      if (event.key === "ArrowDown") {
        if (isBrowsingHistory()) {
          event.preventDefault();
          navigateHistory("down");
          return;
        }
        if (openCompletionActive) {
          event.preventDefault();
          setOpenSuggestionIndex((index) => (index + 1) % openCandidates.length);
          return;
        }
        event.preventDefault();
        navigateHistory("down");
        return;
      }

      if (!openCompletionActive) return;

      if (event.key === "Tab") {
        event.preventDefault();
        const path = openCandidates[openSuggestionIndexSafe];
        if (path) setQuery(buildOpenCommand(path));
        return;
      }

      if (event.key === "ArrowRight" && openGhostSuffix) {
        const input = inputRef.current;
        const atEnd =
          input &&
          input.selectionStart === query.length &&
          input.selectionEnd === query.length;
        if (!atEnd) return;

        const nextQuery = acceptNextOpenGhostChar(query, openGhostSuffix);
        if (nextQuery) {
          event.preventDefault();
          setQuery(nextQuery);
        }
      }
    },
    [
      clearInput,
      navigateHistory,
      openCompletionActive,
      openCandidates,
      openGhostSuffix,
      openSuggestionIndexSafe,
      query,
    ]
  );

  const handleInputChange = useCallback((value: string) => {
    if (historyNavRef.current.index !== -1) {
      historyNavRef.current = createHistoryNavigator();
    }
    setQuery(value);
  }, []);

  const clearTerminal = () => {
    askAbortRef.current += 1;
    setCliLines([]);
    setPreviousQuestion(null);
    setCurrentQuestion(null);
    setAnswer("");
    setSources([]);
    setTimings(null);
    setStatus(null);
    setLoading(false);
  };

  return (
    <footer
      className="flex shrink-0 flex-col bg-[#111]"
      style={{ height: terminalHeaderHeight + terminalBodyHeight }}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-ide-border px-3 text-[11px] uppercase tracking-wider text-ide-muted">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal className="h-3.5 w-3.5 shrink-0" />
          <span>Terminal</span>
          <span className="text-ide-muted">●</span>
          <span className="text-[#f87171]">Grounded Responses</span>
          <span className="mx-1 h-3.5 border-l border-ide-border" aria-hidden />
          <span className="text-[10px] normal-case tracking-normal text-ide-muted">
            WebLLM slot
          </span>
          <PlannerEngineModeControl
            value={engineMode}
            onChange={handleEngineModeChange}
            disabled={loading}
          />
        </div>
        <button
          type="button"
          onClick={clearTerminal}
          className="shrink-0 rounded p-1 text-ide-muted hover:bg-ide-active hover:text-ide-text"
          aria-label="Clear terminal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "flex h-full shrink-0 items-end justify-start border-r border-ide-border bg-[#0d0d0d] max-md:hidden",
            loading && "ask-anki-portrait-active"
          )}
          style={{ width: portraitPanelWidth }}
        >
          <Image
            src="/anki2.png"
            alt="Anki Nelaturu"
            width={portraitWidth}
            height={portraitHeight}
            className="h-full w-auto object-contain object-left-bottom"
            sizes="(max-width: 768px) 0px, 200px"
          />
        </div>

        <form
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(query);
          }}
        >
          <div ref={outputRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-xs leading-relaxed">
            {cliLines.map((line, index) => (
              <pre
                key={`cli-${index}`}
                className={cn("whitespace-pre-wrap", line.startsWith(">") ? "text-ide-blue" : "text-ide-muted")}
              >
                {line}
              </pre>
            ))}

            {previousQuestion && (
              <p className="mt-2 text-[10px] text-ide-muted/70">Previous: {previousQuestion}</p>
            )}

            {currentQuestion && (
              <p className="mt-2 whitespace-pre-wrap text-[12px] text-[#f87171]">› {currentQuestion}</p>
            )}

            {status && (
              <AnimatedStatusLine key={status} status={status} animate={loading} />
            )}

            {answer && (
              <MarkdownProse
                externalLinkIcon
                className="prose-ide mt-2 text-xs leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5"
              >
                {answer}
              </MarkdownProse>
            )}

            {sources.length > 0 && (
              <div className="mt-3 border-t border-ide-border pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-ide-muted">Sources</div>
                <ul className="space-y-1">
                  {sources.map((source) => (
                    <li key={source.path}>
                      <button
                        type="button"
                        onClick={() => runCliCommand(`open ${source.path}`)}
                        className="text-left text-ide-green hover:underline"
                      >
                        ✓ {source.path} — {source.score.toFixed(2)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {timings ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-ide-border bg-[#1b1b1b] px-2 py-0.5 text-[10px] leading-snug text-ide-muted/80">
                  Qwen query: {timings.qwenMs.toFixed(0)} ms
                </span>
                <span className="rounded-full border border-ide-border bg-[#1b1b1b] px-2 py-0.5 text-[10px] leading-snug text-ide-muted/80">
                  Gemma answer: {timings.gemmaMs.toFixed(0)} ms
                </span>
                <span className="rounded-full border border-ide-border bg-[#1b1b1b] px-2 py-0.5 text-[10px] leading-snug text-ide-muted/80">
                  Total: {timings.totalMs.toFixed(0)} ms
                </span>
              </div>
            ) : null}

            <p className="mt-3 text-[10px] leading-snug text-ide-muted/80">{PRIVACY_NOTE}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit(prompt)}
                  className="rounded border border-ide-border bg-[#1b1b1b] px-2 py-0.5 text-[10px] text-ide-muted hover:bg-ide-active hover:text-ide-text disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {activeFile ? (
            <p className="shrink-0 border-t border-ide-border px-3 py-1.5 text-[10px] text-ide-muted">
              Current context: <span className="text-ide-text">{activeFile.title}</span>
            </p>
          ) : null}

          <div className="flex shrink-0 items-center gap-1 border-t border-ide-border px-3 py-2 text-xs">
            <span className="shrink-0 text-[13px] text-[#f87171]">Ask Anki ›</span>
            <div className="relative min-w-0 flex-1">
              {openCompletionActive && openGhostSuffix ? (
                <div
                  className="pointer-events-none absolute inset-0 flex h-7 items-center overflow-hidden px-1 font-mono text-xs"
                  aria-hidden
                >
                  <span className="invisible whitespace-pre">{query}</span>
                  <span className="whitespace-pre text-ide-muted/45">{openGhostSuffix}</span>
                </div>
              ) : null}
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => handleInputChange(event.target.value)}
                onKeyDown={handleInputKeyDown}
                aria-label="Ask Anki a question"
                aria-autocomplete={openCompletionActive ? "list" : undefined}
                aria-expanded={openCompletionActive ? true : undefined}
                disabled={loading}
                className="relative h-7 w-full px-1 font-mono text-xs"
              />
            </div>
          </div>
        </form>
      </div>
    </footer>
  );
  }
);

AskAnkiTerminal.displayName = "AskAnkiTerminal";
