/**
 * Core TypeScript types for workspace content files and folder structure.
 *
 * Shared between the content loader, explorer UI, and Ask Anki active-file context.
 */

import type { DocumentLink } from "@/lib/assistant/documentLinks";

/**
 * High-level category of a workspace markdown document.
 */
export type ContentKind =
  | "profile"
  | "experience"
  | "capability"
  | "project"
  | "writing"
  | "patent"
  | "lab"
  | "creative"
  | "analytics";

/**
 * A single markdown file in the workspace with parsed frontmatter and body.
 */
export type ContentFile = {
  slug: string;
  title: string;
  filename: string;
  category: string;
  kind?: ContentKind | string;
  icon?: string;
  featured: boolean;
  order: number;
  summary?: string;
  elevatorPitch?: string;
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  tags: string[];
  technologies: string[];
  links: DocumentLink[];
  content: string;
  path: string;
  year?: string | number;
  status?: string;
  type?: string;
  description?: string;
  imagePattern?: string;
  totalFrames?: number;
};

/**
 * Alias for `ContentFile` used in workspace-oriented components.
 */
export type WorkspaceFile = ContentFile;

/**
 * A top-level content folder with its contained files for the explorer tree.
 */
export type ContentFolder = {
  name: string;
  files: ContentFile[];
};
