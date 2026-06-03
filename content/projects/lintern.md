---
title: Lintern
category: PROJECTS
order: 10
summary: Local-first data guardrails for AI workflows.
tags:
  - local-first AI
  - data guardrails
  - browser extension
  - embeddings
kind: project
icon: lintern-logo
featured: true
technologies:
  - TypeScript
  - React
  - Next.js
  - Chrome Extension APIs
  - DOM interception
  - Embeddings
  - Semantic detection
  - Local browser storage
status: active prototype
year: 2026
website: https://lintern.app
demo: https://anki-fixme/here
linkedin: https://anki-fixme/here
screenshot: /images/projects/lintern-placeholder.png
---

# Lintern

> Local-first data guardrails for AI workflows.

## Project Snapshot

**Status:** Active Prototype  
**Website:** https://lintern.app  
**Demo:** https://anki-fixme/here  
**LinkedIn Post:** https://anki-fixme/here

| Story | Visual |
| --- | --- |
| **What It Is**<br>Lintern is a local-first web application and browser extension that detects sensitive information before it is pasted into AI systems or external services.<br><br>**Why I Built It**<br>As AI tools become part of everyday workflows, accidental disclosure of internal or personal information becomes easier. I wanted to explore whether meaningful AI guardrails could run directly in the browser without requiring another cloud service.<br><br>**Technical Highlights**<br>Local-first processing, browser integration, heuristic detection, semantic matching, and low-latency feedback. | ![Placeholder](/images/projects/lintern-placeholder.png) |

## What It Is

Lintern explores what privacy-first AI safety looks like when the protection layer lives on the user's device. Rather than sending content elsewhere for inspection, Lintern performs analysis locally and provides immediate feedback before content is submitted.

## Why I Built It

Many enterprise AI discussions focus on the model, but the risk often starts much earlier: users copying logs, customer information, internal documents, screenshots, or emails into AI systems. Lintern explores how those risks can be reduced at the interaction layer.

## Technical Highlights

- Local-first architecture
- Chrome extension integration
- DOM-level interception and inspection
- Heuristic and semantic detection pipelines
- Low-latency browser execution
- Foundation for future policy packs, redaction workflows, and explainable detection

## Technical Challenges

The interesting challenge is not finding obvious patterns like email addresses. The harder problem is identifying information that is sensitive because of meaning and context while keeping false positives low enough that users trust the tool.

## Why It Matters

Lintern represents my interest in practical AI adoption. The goal is not simply detecting data. The goal is helping organizations move faster with AI while maintaining privacy, governance, and operational safety.
