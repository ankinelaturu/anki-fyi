# anki.fyi

An IDE-style professional knowledge workspace built with Next.js, TypeScript, Tailwind, and shadcn-inspired UI primitives.

## What this is

This is not a generic portfolio template. It is a markdown-backed workspace:

- Explorer is generated from `/content/**/*.md`
- Center pane renders the selected markdown file
- Right pane shows file metadata, tags, and related files
- Bottom terminal supports simple commands
- Terminal AI assistant is a placeholder for local Gemma/WebLLM + embeddings in v2

## Run locally

```bash
pnpm install
pnpm dev
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
- `ask "What is ZeroFabric?"`

## Suggested v2

- Browser-side embedding index over markdown files
- Local Gemma/WebLLM answer generation
- Source citations in terminal answers
- Video/GIF support in content files
- Optional tabs
- Mobile-friendly command palette
