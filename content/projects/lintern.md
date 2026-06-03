---
title: Lintern
category: PROJECTS
order: 10
summary: Local-first data guardrails for AI workflows.
elevator_pitch: Local-first AI guardrails that detect sensitive information before it reaches external AI systems.
tags:
  - local-first AI
  - data guardrails
  - browser extension
  - embeddings
kind: project
importance: flagship
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

## What It Is

Lintern is a local-first data guardrail system designed for modern AI workflows. It started from a simple observation: people routinely paste internal information into AI tools without realizing how much context they are exposing. Customer information, source code, log files, internal project names, screenshots, support tickets, infrastructure details, and proprietary business information all become part of the prompt.

Lintern explores whether that risk can be reduced before the prompt is ever submitted.

The project combines browser-based inspection, sensitive-data detection, semantic analysis, and explainable feedback into a workflow that runs close to the user. Instead of routing content through another cloud service for inspection, the goal is to keep analysis local whenever possible.

The long-term vision is a privacy-first safety layer that can sit between users and AI systems, helping them understand what they are sharing and why it may matter.

## Why I Built It

Most discussions around AI safety focus on model behavior. I became interested in a different question: what happens before the model sees the prompt?

Enterprise users frequently interact with AI systems while working inside browsers, support tools, developer environments, CRMs, ticketing systems, documentation portals, and internal dashboards. In those environments, accidental disclosure is often a workflow problem rather than a model problem.

Lintern is my attempt to explore that space. The project investigates whether AI governance can become proactive, lightweight, and integrated into everyday work instead of existing only as policy documentation.

## Technical Highlights

- Local-first execution model.
- Browser-extension-friendly architecture.
- DOM-level inspection concepts.
- Sensitive data detection pipelines.
- Semantic matching and contextual classification.
- Explainable findings instead of opaque scores.
- Low-latency execution designed to feel native to user workflows.
- Architecture designed for future policy packs, custom detectors, redaction helpers, and organization-specific rules.

## Key Features

- Scan content before it is submitted to AI systems.
- Detect common sensitive-data patterns.
- Explore semantic detection beyond simple regex matching.
- Browser-extension-friendly workflow integration.
- Local-first processing and analysis.
- Explainable findings instead of black-box scores.
- Foundation for policy packs and organization-specific rules.

## Technical Challenges

The challenge is not detecting obvious items such as email addresses or phone numbers. The difficult part is identifying information that becomes sensitive because of context.

For example, a project codename, an internal customer reference, or a partial log snippet may not match traditional PII patterns yet may still be inappropriate to share externally.

Another challenge is user trust. A tool that flags too much becomes noise. A tool that misses important information becomes unreliable. The detection pipeline must balance recall, precision, transparency, and usability.

## Why It Matters

Lintern reflects several themes that appear throughout my work: local-first AI, browser-native tooling, explainable systems, and practical AI adoption.

More broadly, it explores a question I expect many organizations will face over the next decade:

How do we help people move faster with AI while maintaining privacy, governance, and operational safety?
