/**
 * Scan all content markdown files and emit a JSON schema for metadata queries.
 *
 * Output: lib/assistant/generated/frontMatterSchema.json
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { CORPUS_FOLDERS } from "../lib/assistant/config";

const contentDir = path.join(process.cwd(), "content");
const outPath = path.join(process.cwd(), "lib", "assistant", "generated", "frontMatterSchema.json");

/** YAML key → camelCase field name used in CorpusFrontMatter / query filters. */
const YAML_TO_FIELD: Record<string, string> = {
  title: "title",
  kind: "kind",
  category: "category",
  summary: "summary",
  elevator_pitch: "elevatorPitch",
  order: "order",
  importance: "importance",
  tags: "tags",
  technologies: "technologies",
  company: "company",
  role: "role",
  start_date: "startDate",
  end_date: "endDate",
  year: "year",
  status: "status",
  type: "type",
  icon: "icon",
  featured: "featured",
  description: "description",
  imagePattern: "imagePattern",
  totalFrames: "totalFrames",
  characters: "characters",
  screenshot: "screenshot",
  website: "website",
  demo: "demo",
  linkedin: "linkedin",
  url: "url",
};

const ENUM_FIELDS = new Set(["kind", "importance", "status", "type", "icon", "category"]);

type FieldType = "string" | "number" | "boolean" | "string[]" | "string|number";

type FieldDef = {
  name: string;
  yamlKey: string;
  type: FieldType;
  optional: boolean;
  count: number;
  examples: (string | number | boolean)[];
};

function inferType(value: unknown): FieldType {
  if (Array.isArray(value)) return "string[]";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  return "string";
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && entry.name.endsWith(".md")) return [full];
    return [];
  });
}

function isIncluded(relativePath: string): boolean {
  const folder = relativePath.includes("/") ? relativePath.split("/")[0]! : "about";
  return (CORPUS_FOLDERS as readonly string[]).includes(folder);
}

function main(): void {
  const fieldMap = new Map<string, FieldDef>();
  const enumValues: Record<string, Set<string>> = {};
  let fileCount = 0;

  for (const filePath of walk(contentDir)) {
    const relative = path.relative(contentDir, filePath).replace(/\\/g, "/");
    if (!isIncluded(relative)) continue;

    const raw = fs.readFileSync(filePath, "utf8");
    const { data } = matter(raw);
    fileCount += 1;

    for (const [yamlKey, value] of Object.entries(data)) {
      const fieldName = YAML_TO_FIELD[yamlKey] ?? yamlKey;
      const type = inferType(value);

      let existing = fieldMap.get(fieldName);
      if (!existing) {
        existing = {
          name: fieldName,
          yamlKey,
          type,
          optional: true,
          count: 0,
          examples: [],
        };
        fieldMap.set(fieldName, existing);
      }
      existing.count += 1;

      if (existing.examples.length < 3) {
        if (Array.isArray(value)) {
          const sample = value.slice(0, 2).join(", ");
          if (!existing.examples.includes(sample)) existing.examples.push(sample);
        } else if (value !== null && value !== undefined) {
          const sample = value as string | number | boolean;
          if (!existing.examples.includes(sample)) existing.examples.push(sample);
        }
      }

      if (ENUM_FIELDS.has(fieldName) && typeof value === "string") {
        if (!enumValues[fieldName]) enumValues[fieldName] = new Set();
        enumValues[fieldName].add(value);
      }
    }
  }

  const fields = [...fieldMap.values()]
    .map((f) => ({
      ...f,
      optional: f.count < fileCount,
    }))
    .sort((a, b) => b.count - a.count);

  const enums: Record<string, string[]> = {};
  for (const [key, set] of Object.entries(enumValues)) {
    enums[key] = [...set].sort();
  }

  const schema = {
    version: 1,
    generatedAt: new Date().toISOString(),
    fileCount,
    fields,
    enums,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);
  console.log(`Wrote ${outPath} (${fields.length} fields from ${fileCount} files)`);
}

main();
