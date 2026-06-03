import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { FOLDER_ORDER } from "@/lib/folders";

export type { ContentFile, ContentFolder, ContentKind, WorkspaceFile } from "@/lib/content-types";
import type { ContentFile, ContentFolder } from "@/lib/content-types";

const contentDir = path.join(process.cwd(), "content");

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && entry.name.endsWith(".md")) return [full];
    return [];
  });
}

function parseFile(filePath: string): ContentFile {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const relative = path.relative(contentDir, filePath).replace(/\\/g, "/");
  const slug = relative.replace(/\.md$/, "");
  const folder = relative.includes("/") ? relative.split("/")[0]! : "about";

  return {
    slug,
    title: data.title ?? path.basename(filePath, ".md"),
    filename: path.basename(filePath),
    category: data.category ?? folder.toUpperCase(),
    kind: typeof data.kind === "string" ? data.kind : undefined,
    icon: typeof data.icon === "string" ? data.icon : undefined,
    featured: data.featured === true,
    order: typeof data.order === "number" ? data.order : 100,
    summary: typeof data.summary === "string" ? data.summary : "",
    elevatorPitch:
      typeof data.elevator_pitch === "string" ? data.elevator_pitch : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    technologies: Array.isArray(data.technologies) ? data.technologies.map(String) : [],
    content,
    path: relative,
    type: typeof data.type === "string" ? data.type : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    imagePattern: typeof data.imagePattern === "string" ? data.imagePattern : undefined,
    totalFrames: typeof data.totalFrames === "number" ? data.totalFrames : undefined,
  };
}

export function getAllFiles(): ContentFile[] {
  return walk(contentDir).map(parseFile);
}

export function getFile(slug: string): ContentFile | undefined {
  return getAllFiles().find((file) => file.slug === slug);
}

export function getFolders(): ContentFolder[] {
  const files = getAllFiles();
  const groups = new Map<string, ContentFile[]>();

  for (const file of files) {
    const folder = file.path.includes("/") ? file.path.split("/")[0]! : "about";
    groups.set(folder, [...(groups.get(folder) ?? []), file]);
  }

  return FOLDER_ORDER.filter((name) => groups.has(name)).map((name) => ({
    name,
    files: (groups.get(name) ?? []).sort((a, b) => a.order - b.order),
  }));
}
