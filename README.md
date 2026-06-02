# anki.fyi

An IDE-style professional knowledge workspace built with Next.js, TypeScript, Tailwind, and shadcn-inspired UI primitives.

## What this is

This is not a generic portfolio template. It is a markdown-backed workspace:

- Explorer is generated from `/content/**/*.md`
- Center pane renders the selected markdown file
- Right pane shows file metadata, tags, and related files
- Bottom terminal supports CLI commands and **Ask Anki** (local RAG)
- Ask Anki uses build-time semantic embeddings + browser Gemma (WebLLM) — no cloud LLM APIs

## Run locally

```bash
pnpm install
pnpm dev
```

Ask Anki loads `public/assistant/corpus.json` and `vectors.json`. Regenerate after content changes:

```bash
pnpm build:corpus
```

Open http://localhost:3000

## Add content

Add a markdown file under `/content`:

```md
---
title: my-project.md
category: PROJECTS
order: 99
summary: Short summary.
tags: [AI, TypeScript]
---

# My Project

Content here...
```

The Explorer, editor, related files, and terminal search will pick it up automatically.

## Terminal commands

- `help`
- `projects`
- `resume`
- `contact`
- `open lintern.md`
- `search orchestration`
- Ask a natural question (e.g. `What is ZeroFabric?`) or `ask "..."`

Ask Anki requires **WebGPU** (Chrome/Edge recommended). First use downloads model weights into the browser cache.

## Suggested next

- Video/GIF support in content files
- Optional tabs
- Mobile-friendly command palette
