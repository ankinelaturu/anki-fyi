import fs from "fs";
import path from "path";
import { answerMetadataQuery, parseMetadataQuery } from "../lib/assistant/metadataQuery";
import type { CorpusFile } from "../lib/assistant/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const METADATA_PROMPTS = [
  "List all projects",
  "Show me your projects",
  "List projects that use TypeScript",
  "Which projects use embeddings?",
  "Show flagship projects",
  "List concepts",
  "Show flagship concepts",
  "List Oracle experience",
  "Show experience at Sun Microsystems",
  "List patents",
  "What analytics files do you have?",
];

const RAG_PROMPTS = [
  "Why did you build Lintern?",
  "How is AstroValley related to browser-native AI?",
  "What did you do at Oracle?",
  "Which projects are most relevant to frontend AI roles?",
  "How does ZeroFabric connect to your Oracle experience?",
];

function testDetection(corpus: CorpusFile): void {
  for (const prompt of METADATA_PROMPTS) {
    const query = parseMetadataQuery(prompt, corpus);
    assert(query.action === "list", `Expected metadata query for: ${prompt}`);
  }

  for (const prompt of RAG_PROMPTS) {
    const query = parseMetadataQuery(prompt, corpus);
    assert(query.action === "none", `Expected no metadata query for: ${prompt}`);
  }
}

function testTypeScriptProjects(corpus: CorpusFile): void {
  const query = parseMetadataQuery("List projects that use TypeScript", corpus);
  assert(query.action === "list", "TypeScript project query should parse");
  assert(query.kind === "project", "TypeScript project query should target projects");
  assert(
    Boolean(query.technologies?.some((value) => value.toLowerCase() === "typescript")),
    "TypeScript project query should include TypeScript filter"
  );

  const response = answerMetadataQuery(query, corpus);
  assert(response.sources.length > 0, "TypeScript project query should return results");
  assert(
    response.sources.every((source) => source.path.startsWith("projects/")),
    "TypeScript project results should be project files"
  );
  assert(
    response.answer.includes("TypeScript"),
    "TypeScript project answer should mention the filter"
  );
}

function testProjectCatalog(corpus: CorpusFile): void {
  const query = parseMetadataQuery("List all projects", corpus);
  const response = answerMetadataQuery(query, corpus);
  assert(response.sources.length > 0, "list all projects should return results");

  const projectPaths = new Set(
    corpus.documents.filter((doc) => doc.kind === "project").map((doc) => doc.path)
  );
  assert(
    response.sources.every((source) => projectPaths.has(source.path)),
    "list all projects sources must be project documents only"
  );
  assert(
    response.sources.length === projectPaths.size,
    "list all projects should include every project document"
  );
}

function main(): void {
  const corpusPath = path.join(process.cwd(), "public", "assistant", "corpus.json");
  if (!fs.existsSync(corpusPath)) {
    throw new Error("public/assistant/corpus.json not found — run pnpm build:corpus");
  }

  const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8")) as CorpusFile;
  testDetection(corpus);
  testProjectCatalog(corpus);
  testTypeScriptProjects(corpus);

  console.log("metadata query checks passed");
}

main();
