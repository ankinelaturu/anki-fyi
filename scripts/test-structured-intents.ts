import fs from "fs";
import path from "path";
import { answerMetadataQuery } from "../lib/assistant/metadataQuery";
import { validateMetadataQuery } from "../lib/assistant/metadataQueryValidate";
import type { MetadataQuery } from "../lib/assistant/metadataQueryTypes";
import type { CorpusFile } from "../lib/assistant/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/** Expected planner JSON fixtures for metadata list prompts. */
const METADATA_FIXTURES: { prompt: string; query: MetadataQuery }[] = [
  {
    prompt: "List all projects",
    query: {
      action: "list",
      filters: [{ field: "kind", op: "eq", value: "project" }],
    },
  },
  {
    prompt: "Show me your projects",
    query: {
      action: "list",
      filters: [{ field: "kind", op: "eq", value: "project" }],
    },
  },
  {
    prompt: "List projects that use TypeScript",
    query: {
      action: "list",
      filters: [
        { field: "kind", op: "eq", value: "project" },
        { field: "technologies", op: "containsAll", value: ["TypeScript"] },
      ],
    },
  },
  {
    prompt: "Which projects use embeddings?",
    query: {
      action: "list",
      filters: [
        { field: "kind", op: "eq", value: "project" },
        { field: "technologies", op: "containsAny", value: ["embeddings"] },
      ],
    },
  },
  {
    prompt: "Show flagship projects",
    query: {
      action: "list",
      filters: [
        { field: "kind", op: "eq", value: "project" },
        { field: "importance", op: "eq", value: "flagship" },
      ],
    },
  },
  {
    prompt: "List concepts",
    query: {
      action: "list",
      filters: [{ field: "kind", op: "eq", value: "concept" }],
    },
  },
  {
    prompt: "Show flagship concepts",
    query: {
      action: "list",
      filters: [
        { field: "kind", op: "eq", value: "concept" },
        { field: "importance", op: "eq", value: "flagship" },
      ],
    },
  },
  {
    prompt: "List Oracle experience",
    query: {
      action: "list",
      filters: [
        { field: "kind", op: "eq", value: "experience" },
        { field: "company", op: "eq", value: "Oracle" },
      ],
    },
  },
  {
    prompt: "Show experience at Sun Microsystems",
    query: {
      action: "list",
      filters: [
        { field: "kind", op: "eq", value: "experience" },
        { field: "company", op: "eq", value: "Sun Microsystems" },
      ],
    },
  },
  {
    prompt: "List patents",
    query: {
      action: "list",
      filters: [{ field: "kind", op: "eq", value: "patent" }],
    },
  },
  {
    prompt: "What analytics files do you have?",
    query: {
      action: "list",
      filters: [{ field: "kind", op: "eq", value: "analytics" }],
    },
  },
];

const RAG_PROMPTS = [
  "Why did you build Lintern?",
  "How is AstroValley related to browser-native AI?",
  "What did you do at Oracle?",
  "Which projects are most relevant to frontend AI roles?",
  "How does ZeroFabric connect to your Oracle experience?",
];

function testFixtureValidation(): void {
  for (const { prompt, query } of METADATA_FIXTURES) {
    const validated = validateMetadataQuery(query);
    assert(validated.action === "list", `Fixture should validate as list for: ${prompt}`);
    assert(
      (validated.filters?.length ?? 0) > 0,
      `Fixture should retain filters for: ${prompt}`
    );
  }

  for (const prompt of RAG_PROMPTS) {
    const validated = validateMetadataQuery({ action: "none" });
    assert(validated.action === "none", `RAG prompt should use none action: ${prompt}`);
  }
}

function testTypeScriptProjects(corpus: CorpusFile): void {
  const fixture = METADATA_FIXTURES.find((entry) => entry.prompt === "List projects that use TypeScript");
  assert(Boolean(fixture), "TypeScript fixture missing");
  const query = validateMetadataQuery(fixture!.query);
  assert(query.action === "list", "TypeScript project query should validate");

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
  const fixture = METADATA_FIXTURES.find((entry) => entry.prompt === "List all projects");
  assert(Boolean(fixture), "project catalog fixture missing");
  const query = validateMetadataQuery(fixture!.query);
  const response = answerMetadataQuery(query, corpus);
  assert(response.sources.length > 0, "list all projects should return results");

  const projectPaths = new Set(
    corpus.documents
      .filter((doc) => doc.frontMatter?.kind === "project" || doc.kind === "project")
      .map((doc) => doc.path)
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

function testMetadataFixturesReturnResults(corpus: CorpusFile): void {
  for (const { prompt, query } of METADATA_FIXTURES) {
    const validated = validateMetadataQuery(query);
    const response = answerMetadataQuery(validated, corpus);
    assert(response.sources.length > 0, `Expected results for fixture: ${prompt}`);
  }
}

function main(): void {
  const corpusPath = path.join(process.cwd(), "public", "assistant", "corpus.json");
  if (!fs.existsSync(corpusPath)) {
    throw new Error("public/assistant/corpus.json not found — run pnpm build:corpus");
  }

  const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8")) as CorpusFile;
  testFixtureValidation();
  testProjectCatalog(corpus);
  testTypeScriptProjects(corpus);
  testMetadataFixturesReturnResults(corpus);

  console.log("metadata query checks passed");
}

main();
