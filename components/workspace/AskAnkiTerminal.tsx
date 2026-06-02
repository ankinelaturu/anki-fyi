"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Terminal, Trash2 } from "lucide-react";
import { askAnki } from "@/lib/assistant/askAnki";
import { PRIVACY_NOTE } from "@/lib/assistant/config";
import type { AskAnkiSource } from "@/lib/assistant/types";
import type { ContentFile } from "@/lib/content-types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CLI_COMMANDS = new Set(["help", "resume", "contact", "projects"]);

const SUGGESTED_PROMPTS = [
  "Tell me about your self.",
  "Tell me about Lintern.",
  "What is AstroValley?",
  "What is ZeroFabric?",
  "Which of your projects use local AI?",
  "Tell me about Aimless Dude & Hyper Dog.",
];

type AskAnkiTerminalProps = {
  files: ContentFile[];
  portraitPanelWidth: number;
  portraitWidth: number;
  portraitHeight: number;
  terminalHeaderHeight: number;
  terminalBodyHeight: number;
  onOpenFile: (slug: string) => void;
};

function pathToSlug(filePath: string): string {
  return filePath.replace(/\.md$/i, "");
}

export function AskAnkiTerminal({
  files,
  portraitPanelWidth,
  portraitWidth,
  portraitHeight,
  terminalHeaderHeight,
  terminalBodyHeight,
  onOpenFile,
}: AskAnkiTerminalProps) {
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
  const [loading, setLoading] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const askAbortRef = useRef(0);

  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [cliLines, answer, status, currentQuestion, sources]);

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

  const runAsk = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;

      const askId = ++askAbortRef.current;
      setPreviousQuestion(currentQuestion);
      setCurrentQuestion(q);
      setAnswer("");
      setSources([]);
      setStatus("Starting...");
      setLoading(true);

      try {
        const response = await askAnki(q, {
          onStatus: (message) => {
            if (askAbortRef.current !== askId) return;
            setStatus(message);
          },
          onToken: (token) => {
            if (askAbortRef.current !== askId) return;
            setAnswer((prev) => prev + token);
          },
        });

        if (askAbortRef.current !== askId) return;

        setAnswer(response.answer);
        setSources(response.refused ? [] : response.sources);
        setStatus(null);
      } catch (error) {
        if (askAbortRef.current !== askId) return;
        setAnswer(error instanceof Error ? error.message : "Ask Anki failed.");
        setSources([]);
        setStatus(null);
      } finally {
        if (askAbortRef.current === askId) setLoading(false);
      }
    },
    [currentQuestion]
  );

  const handleSubmit = useCallback(
    (raw: string) => {
      const input = raw.trim();
      if (!input) return;

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
    [runAsk, runCliCommand]
  );

  const clearTerminal = () => {
    askAbortRef.current += 1;
    setCliLines([]);
    setPreviousQuestion(null);
    setCurrentQuestion(null);
    setAnswer("");
    setSources([]);
    setStatus(null);
    setLoading(false);
  };

  return (
    <footer
      className="flex shrink-0 flex-col bg-[#111]"
      style={{ height: terminalHeaderHeight + terminalBodyHeight }}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-ide-border px-3 text-[11px] uppercase tracking-wider text-ide-muted">
        <div className="flex min-w-0 items-center gap-3">
          <Terminal className="h-3.5 w-3.5 shrink-0" />
          <span>Terminal</span>
          <span className="normal-case text-ide-green">Ask Anki</span>
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
          className="flex h-full shrink-0 items-end justify-start border-r border-ide-border bg-[#0d0d0d] max-md:hidden"
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
              <p className="mt-2 whitespace-pre-wrap text-ide-blue">› {currentQuestion}</p>
            )}

            {status && <p className="mt-1 text-ide-yellow">{status}</p>}

            {answer && <pre className="mt-2 whitespace-pre-wrap text-ide-text">{answer}</pre>}

            {sources.length > 0 && (
              <div className="mt-3 border-t border-ide-border pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-ide-muted">Sources</div>
                <ul className="space-y-1">
                  {sources.map((source) => (
                    <li key={source.path}>
                      <button
                        type="button"
                        onClick={() => onOpenFile(pathToSlug(source.path))}
                        className="text-left text-ide-green hover:underline"
                      >
                        ✓ {source.path} — {source.score.toFixed(2)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

          <div className="flex shrink-0 items-center gap-1 border-t border-ide-border px-3 py-2 text-xs">
            <span className="shrink-0 text-[13px] text-[#f87171]">Ask Anki</span>
            <span className="shrink-0 text-[13px] text-ide-muted">›</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask a question…"
              aria-label="Ask Anki a question"
              disabled={loading}
              className="h-7 px-1 text-xs"
            />
          </div>
        </form>
      </div>
    </footer>
  );
}
