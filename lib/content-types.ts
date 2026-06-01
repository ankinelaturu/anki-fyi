export type ContentKind =
  | "profile"
  | "experience"
  | "capability"
  | "project"
  | "writing"
  | "patent"
  | "lab"
  | "creative";

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
  tags: string[];
  content: string;
  path: string;
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
