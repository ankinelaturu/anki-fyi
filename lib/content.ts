import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type ContentFile = {
  slug: string;
  title: string;
  category: string;
  order: number;
  summary?: string;
  tags: string[];
  content: string;
  path: string;
};

export type ContentFolder = {
  name: string;
  files: ContentFile[];
};

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

export function getAllFiles(): ContentFile[] {
  return walk(contentDir)
    .map((filePath) => {
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(raw);
      const relative = path.relative(contentDir, filePath).replace(/\\/g, "/");
      const slug = relative.replace(/\.md$/, "");
      return {
        slug,
        title: data.title ?? path.basename(filePath, ".md"),
        category: data.category ?? path.dirname(relative).split("/")[0] ?? "root",
        order: data.order ?? 100,
        summary: data.summary ?? "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        content,
        path: relative,
      } satisfies ContentFile;
    })
    .sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
}

export function getFile(slug: string): ContentFile | undefined {
  return getAllFiles().find((file) => file.slug === slug);
}

export function getFolders(): ContentFolder[] {
  const files = getAllFiles();
  const groups = new Map<string, ContentFile[]>();
  for (const file of files) {
    const folder = file.path.includes("/") ? file.path.split("/")[0] : "root";
    groups.set(folder, [...(groups.get(folder) ?? []), file]);
  }
  const order = ["root", "experience", "projects", "capabilities", "patents", "ideas"];
  return Array.from(groups.entries())
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([name, files]) => ({ name, files }));
}
