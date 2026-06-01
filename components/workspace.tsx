"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Search, Sparkles, Terminal, Circle, Github, Linkedin, Mail } from "lucide-react";
import type { ContentFile, ContentFolder } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WorkspaceProps = {
  folders: ContentFolder[];
  initialSlug: string;
};

const folderLabels: Record<string, string> = {
  root: "ABOUT",
  experience: "EXPERIENCE",
  projects: "PROJECTS",
  capabilities: "CAPABILITIES",
  patents: "PATENTS",
  ideas: "IDEAS",
};

function promptAnswer(question: string, files: ContentFile[]) {
  const q = question.toLowerCase();
  const matches = files.filter((file) => {
    const haystack = `${file.title} ${file.summary ?? ""} ${file.tags.join(" ")} ${file.content}`.toLowerCase();
    return q.split(/\s+/).filter(Boolean).some((term) => term.length > 3 && haystack.includes(term));
  }).slice(0, 3);

  if (matches.length === 0) {
    return {
      answer: "I do not have a grounded answer yet. Try asking about Oracle, Action Chain Editor, Lintern, ZeroFabric, AI orchestration, or developer platforms.",
      sources: [] as ContentFile[],
    };
  }

  const summary = matches.map((file) => `• ${file.title.replace(/\.md$/, "")}: ${file.summary}`).join("\n");
  return {
    answer: `Searching local knowledge base...\n\nFound relevant files:\n${summary}\n\nThis is a placeholder terminal assistant for v1. In v2, this will use local embeddings + Gemma/WebLLM to answer from the markdown corpus with source citations.`,
    sources: matches,
  };
}

export function Workspace({ folders, initialSlug }: WorkspaceProps) {
  const allFiles = useMemo(() => folders.flatMap((folder) => folder.files), [folders]);
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true, experience: true, projects: true, capabilities: true, patents: false, ideas: true });
  const [query, setQuery] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "Workspace ready.",
    "Indexed 20 markdown files.",
    "Type help, open lintern.md, search orchestration, or ask \"What is ZeroFabric?\"",
  ]);

  const activeFile = allFiles.find((file) => file.slug === activeSlug) ?? allFiles[0];
  const relatedFiles = allFiles
    .filter((file) => file.slug !== activeFile.slug)
    .map((file) => ({ file, score: file.tags.filter((tag) => activeFile.tags.includes(tag)).length }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.file);

  function runCommand(raw: string) {
    const command = raw.trim();
    if (!command) return;

    let output = "";
    if (command === "help") {
      output = `Available commands:\n\nopen <file>\nsearch <topic>\nask "<question>"\nresume\ncontact\nprojects`;
    } else if (command === "projects") {
      output = allFiles.filter((file) => file.category === "PROJECTS").map((file) => file.path).join("\n");
    } else if (command === "resume") {
      const resume = allFiles.find((file) => file.path === "resume.md");
      if (resume) setActiveSlug(resume.slug);
      output = "Opening RESUME.md";
    } else if (command === "contact") {
      const contact = allFiles.find((file) => file.path === "contact.md");
      if (contact) setActiveSlug(contact.slug);
      output = "Opening CONTACT.md";
    } else if (command.startsWith("open ")) {
      const target = command.replace(/^open\s+/, "").replace(/^\//, "").toLowerCase();
      const match = allFiles.find((file) => file.path.toLowerCase().includes(target) || file.title.toLowerCase().includes(target));
      if (match) {
        setActiveSlug(match.slug);
        output = `Opening ${match.path}`;
      } else {
        output = `File not found: ${target}`;
      }
    } else if (command.startsWith("search ")) {
      const term = command.replace(/^search\s+/, "").toLowerCase();
      const matches = allFiles.filter((file) => `${file.title} ${file.summary} ${file.tags.join(" ")} ${file.content}`.toLowerCase().includes(term)).slice(0, 8);
      output = matches.length ? matches.map((file) => file.path).join("\n") : `No results for ${term}`;
    } else if (command.startsWith("ask ")) {
      const question = command.replace(/^ask\s+/, "").replace(/^"|"$/g, "");
      const result = promptAnswer(question, allFiles);
      output = `${result.answer}${result.sources.length ? `\n\nSources:\n${result.sources.map((file) => `✓ ${file.path}`).join("\n")}` : ""}`;
    } else {
      output = `Unknown command: ${command}\nType help for available commands.`;
    }

    setTerminalHistory((history) => [...history, `> ${command}`, output]);
    setQuery("");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ide-bg text-ide-text">
      <header className="flex h-10 items-center justify-between border-b border-ide-border bg-[#181818] px-3 text-xs">
        <div className="flex items-center gap-2">
          <Circle className="h-3 w-3 fill-[#f87171] text-[#f87171]" />
          <Circle className="h-3 w-3 fill-[#fbbf24] text-[#fbbf24]" />
          <Circle className="h-3 w-3 fill-[#34d399] text-[#34d399]" />
          <span className="ml-3 font-semibold text-ide-blue">anki.fyi</span>
          <span className="text-ide-muted">— professional knowledge workspace</span>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-ide-green">main</span>
          <span className="text-ide-muted">●</span>
          <span className="text-ide-yellow">Local AI placeholder</span>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_300px] max-lg:grid-cols-[240px_minmax(0,1fr)] max-md:grid-cols-1">
        <aside className="min-h-0 border-r border-ide-border bg-ide-panel max-md:hidden">
          <div className="border-b border-ide-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ide-muted">Workspace</div>
          <div className="overflow-auto p-2 text-xs">
            {folders.map((folder) => {
              const isOpen = expanded[folder.name] ?? true;
              return (
                <div key={folder.name} className="mb-1">
                  <button
                    className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-ide-muted hover:bg-ide-active hover:text-ide-text"
                    onClick={() => setExpanded((state) => ({ ...state, [folder.name]: !isOpen }))}
                  >
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {isOpen ? <FolderOpen className="h-3.5 w-3.5 text-ide-blue" /> : <Folder className="h-3.5 w-3.5 text-ide-blue" />}
                    <span>{folderLabels[folder.name] ?? folder.name.toUpperCase()}</span>
                  </button>
                  {isOpen && (
                    <div className="ml-4 border-l border-[#303030] pl-2">
                      {folder.files.map((file) => (
                        <button
                          key={file.slug}
                          onClick={() => setActiveSlug(file.slug)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded px-1 py-1 text-left text-[12px] hover:bg-ide-active",
                            activeFile.slug === file.slug ? "bg-ide-active text-white" : "text-ide-text"
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 text-ide-green" />
                          <span className="truncate">{file.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="min-h-0 bg-ide-bg">
          <div className="flex h-9 items-center border-b border-ide-border bg-[#202020] text-xs">
            <div className="flex h-full items-center border-r border-ide-border bg-ide-bg px-3 text-ide-text">
              <FileText className="mr-2 h-3.5 w-3.5 text-ide-green" />
              {activeFile.title}
            </div>
          </div>
          <div className="h-[calc(100vh-10rem)] overflow-auto px-8 py-6 max-md:h-[calc(100vh-14rem)] max-md:px-4">
            <div className="prose-ide mx-auto max-w-4xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeFile.content}</ReactMarkdown>
            </div>
          </div>
        </section>

        <aside className="min-h-0 border-l border-ide-border bg-ide-panel max-lg:hidden">
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

      <footer className="border-t border-ide-border bg-[#111]">
        <div className="flex h-8 items-center gap-3 border-b border-ide-border px-3 text-[11px] uppercase tracking-wider text-ide-muted">
          <Terminal className="h-3.5 w-3.5" /> Terminal
          <span className="text-ide-green">local knowledge mode</span>
        </div>
        <div className="grid h-28 grid-cols-[1fr_360px] max-md:grid-cols-1">
          <div className="overflow-auto px-3 py-2 text-xs leading-relaxed">
            {terminalHistory.slice(-6).map((line, index) => (
              <pre key={index} className={cn("whitespace-pre-wrap", line.startsWith(">") ? "text-ide-blue" : "text-ide-muted")}>{line}</pre>
            ))}
          </div>
          <form
            className="flex items-center border-l border-ide-border px-2 max-md:border-l-0 max-md:border-t"
            onSubmit={(event) => {
              event.preventDefault();
              runCommand(query);
            }}
          >
            <span className="text-ide-green">$</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={'ask "What is ZeroFabric?"'} />
            <Button variant="terminal" type="submit">Run</Button>
          </form>
        </div>
      </footer>
    </div>
  );
}
