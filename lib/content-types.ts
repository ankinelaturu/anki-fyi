import type { DocumentLink } from "@/lib/assistant/documentLinks";

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

/** @alias ContentFile */
export type WorkspaceFile = ContentFile;

export type ContentFolder = {
  name: string;
  files: ContentFile[];
};
