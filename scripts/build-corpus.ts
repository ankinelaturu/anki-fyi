import Module from "module";

// @xenova/transformers pulls optional sharp; text-only embeddings do not need it.
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "sharp") {
    return {};
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return originalRequire.apply(this, arguments as any);
};

import crypto from "crypto";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { buildCorpusDocument } from "../lib/assistant/chunking";
import { formatDocumentLinksBlock } from "../lib/assistant/documentLinks";
import { CORPUS_FOLDERS, EMBEDDING_MODEL } from "../lib/assistant/config";
import { embedText } from "../lib/assistant/embeddings";
import type { CorpusDocument, CorpusFile, VectorsFile } from "../lib/assistant/types";

const contentDir = path.join(process.cwd(), "content");
const outDir = path.join(process.cwd(), "public", "assistant");

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

function parseMarkdownFile(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const relative = path.relative(contentDir, filePath).replace(/\\/g, "/");
  const folder = relative.includes("/") ? relative.split("/")[0]! : "about";

  return buildCorpusDocument({
    path: relative,
    title: typeof data.title === "string" ? data.title : path.basename(filePath, ".md"),
    kind: typeof data.kind === "string" ? data.kind : folder,
    summary: typeof data.summary === "string" ? data.summary : undefined,
    elevatorPitch:
      typeof data.elevator_pitch === "string" ? data.elevator_pitch : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    technologies: Array.isArray(data.technologies) ? data.technologies.map(String) : [],
    company: typeof data.company === "string" ? data.company : undefined,
    role: typeof data.role === "string" ? data.role : undefined,
    startDate: typeof data.start_date === "string" ? data.start_date : undefined,
    endDate: typeof data.end_date === "string" ? data.end_date : undefined,
    year:
      typeof data.year === "number" || typeof data.year === "string" ? data.year : undefined,
    status: typeof data.status === "string" ? data.status : undefined,
    content,
    type: typeof data.type === "string" ? data.type : undefined,
    linksBlock: formatDocumentLinksBlock(data as Record<string, unknown>),
  });
}

function hashCorpus(chunks: { id: string; text: string }[]): string {
  const payload = chunks.map((c) => `${c.id}:${c.text}`).join("\n");
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

async function main() {
  const files = walk(contentDir)
    .map((filePath) => {
      const relative = path.relative(contentDir, filePath).replace(/\\/g, "/");
      return isIncluded(relative) ? filePath : null;
    })
    .filter((filePath): filePath is string => filePath !== null);

  const documents: CorpusDocument[] = files.map(parseMarkdownFile);
  const chunks = documents.flatMap((doc) => doc.chunks);
  const corpusHash = hashCorpus(chunks);

  const corpus: CorpusFile = {
    version: 1,
    corpusHash,
    generatedAt: new Date().toISOString(),
    documents,
    chunks,
  };

  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Embedding ${chunks.length} chunks with ${EMBEDDING_MODEL}...`);
  const vectors: VectorsFile["vectors"] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const embedding = await embedText(chunk.text);
    vectors.push({ chunkId: chunk.id, embedding });
    if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
      console.log(`  ${i + 1}/${chunks.length}`);
    }
  }

  const vectorsFile: VectorsFile = {
    version: 1,
    corpusHash,
    embeddingModel: EMBEDDING_MODEL,
    vectors,
  };

  fs.writeFileSync(path.join(outDir, "corpus.json"), JSON.stringify(corpus, null, 2));
  fs.writeFileSync(path.join(outDir, "vectors.json"), JSON.stringify(vectorsFile));

  console.log(`Wrote ${chunks.length} chunks from ${documents.length} documents to public/assistant/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
