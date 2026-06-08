/**
 * Parsed YAML front matter for corpus documents.
 *
 * Normalizes gray-matter fields into a single shape used by corpus build,
 * metadata chunks, and structured metadata queries.
 */

import type { CorpusDocument } from "@/lib/assistant/types";

/**
 * Canonical front matter stored on each `CorpusDocument`.
 */
export type CorpusFrontMatter = {
  title: string;
  kind: string;
  category?: string;
  summary?: string;
  elevatorPitch?: string;
  order?: number;
  importance?: string;
  tags: string[];
  technologies: string[];
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  year?: string | number;
  status?: string;
  type?: string;
  icon?: string;
  featured?: boolean;
};

const FOLDER_KIND: Record<string, string> = {
  about: "profile",
  experience: "experience",
  capabilities: "capability",
  projects: "project",
  writing: "writing",
  patents: "patent",
  lab: "lab",
  "creative-systems": "creative",
};

const CATEGORY_KIND: Record<string, string> = {
  about: "profile",
  experience: "experience",
  capabilities: "capability",
  capability: "capability",
  projects: "project",
  project: "project",
  writing: "writing",
  patents: "patent",
  patent: "patent",
  lab: "lab",
  "creative systems": "creative",
  "creative-systems": "creative",
  creative: "creative",
  analytics: "analytics",
  concept: "concept",
  profile: "profile",
};

/**
 * Resolve document kind from explicit front matter, category, or content folder.
 */
export function resolveDocumentKind(
  data: Record<string, unknown>,
  folder: string
): string {
  if (typeof data.kind === "string" && data.kind.trim()) {
    return data.kind.trim();
  }

  if (typeof data.category === "string" && data.category.trim()) {
    const categoryKey = data.category.toLowerCase().trim();
    if (CATEGORY_KIND[categoryKey]) return CATEGORY_KIND[categoryKey];
  }

  return FOLDER_KIND[folder] ?? folder;
}

/**
 * Parse gray-matter `data` into normalized corpus front matter.
 */
export function parseCorpusFrontMatter(
  data: Record<string, unknown>,
  ctx: { relativePath: string; folder: string; fallbackTitle: string }
): CorpusFrontMatter {
  return {
    title: typeof data.title === "string" ? data.title : ctx.fallbackTitle,
    kind: resolveDocumentKind(data, ctx.folder),
    category: typeof data.category === "string" ? data.category : undefined,
    summary: typeof data.summary === "string" ? data.summary : undefined,
    elevatorPitch:
      typeof data.elevator_pitch === "string" ? data.elevator_pitch : undefined,
    order: typeof data.order === "number" ? data.order : undefined,
    importance: typeof data.importance === "string" ? data.importance : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    technologies: Array.isArray(data.technologies) ? data.technologies.map(String) : [],
    company: typeof data.company === "string" ? data.company : undefined,
    role: typeof data.role === "string" ? data.role : undefined,
    startDate: typeof data.start_date === "string" ? data.start_date : undefined,
    endDate: typeof data.end_date === "string" ? data.end_date : undefined,
    year:
      typeof data.year === "number" || typeof data.year === "string" ? data.year : undefined,
    status: typeof data.status === "string" ? data.status : undefined,
    type: typeof data.type === "string" ? data.type : undefined,
    icon: typeof data.icon === "string" ? data.icon : undefined,
    featured: data.featured === true ? true : undefined,
  };
}

/**
 * Serialize front matter into the dedicated metadata chunk body.
 */
export function formatFrontMatterForChunk(
  frontMatter: CorpusFrontMatter,
  path: string,
  linksBlock?: string
): string {
  const lines: string[] = [
    `Title: ${frontMatter.title}`,
    `Path: ${path}`,
    `Kind: ${frontMatter.kind}`,
  ];

  if (frontMatter.category) lines.push(`Category: ${frontMatter.category}`);
  if (frontMatter.summary) lines.push(`Summary: ${frontMatter.summary}`);
  if (frontMatter.elevatorPitch) lines.push(`Elevator pitch: ${frontMatter.elevatorPitch}`);
  if (frontMatter.order != null) lines.push(`Order: ${frontMatter.order}`);
  if (frontMatter.importance) lines.push(`Importance: ${frontMatter.importance}`);
  if (frontMatter.tags.length) lines.push(`Tags: ${frontMatter.tags.join(", ")}`);
  if (frontMatter.technologies.length) {
    lines.push(`Technologies: ${frontMatter.technologies.join(", ")}`);
  }
  if (frontMatter.company) lines.push(`Company: ${frontMatter.company}`);
  if (frontMatter.role) lines.push(`Role: ${frontMatter.role}`);
  if (frontMatter.startDate) lines.push(`Start date: ${frontMatter.startDate}`);
  if (frontMatter.endDate) lines.push(`End date: ${frontMatter.endDate}`);
  if (frontMatter.year != null && frontMatter.year !== "") lines.push(`Year: ${frontMatter.year}`);
  if (frontMatter.status) lines.push(`Status: ${frontMatter.status}`);
  if (frontMatter.type) lines.push(`Type: ${frontMatter.type}`);
  if (frontMatter.icon) lines.push(`Icon: ${frontMatter.icon}`);
  if (frontMatter.featured) lines.push("Featured: true");

  if (linksBlock) {
    lines.push("", linksBlock);
  }

  return lines.join("\n");
}

/**
 * Return the front matter object for a corpus document.
 *
 * Falls back to legacy top-level document fields when `frontMatter` is absent
 * (older corpus artifacts).
 */
export function documentFrontMatter(document: CorpusDocument): CorpusFrontMatter {
  if (document.frontMatter) return document.frontMatter;

  return {
    title: document.title,
    kind: document.kind,
    summary: document.summary,
    elevatorPitch: document.elevatorPitch,
    order: document.order,
    importance: document.importance,
    tags: document.tags,
    technologies: document.technologies ?? [],
    company: document.company,
    startDate: document.startDate,
    type: document.type,
  };
}
