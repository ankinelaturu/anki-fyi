import fs from "fs";
import path from "path";
import {
  answerStructuredIntent,
  detectStructuredIntent,
} from "../lib/assistant/structuredIntents";
import type { CorpusFile } from "../lib/assistant/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const STRUCTURED_PROMPTS = [
  "List all projects",
  "Show me your projects",
  "What projects have you built?",
  "List experience",
  "Show patents",
  "List concepts",
  "List capabilities",
  "What are your capabilities?",
  "Show skills",
];

const RAG_PROMPTS = [
  "Why did you build Lintern?",
  "What did you do at Oracle?",
  "How is AstroValley related to local AI?",
  "Which of your projects use local AI?",
];

function testDetection(): void {
  for (const prompt of STRUCTURED_PROMPTS) {
    const intent = detectStructuredIntent(prompt);
    assert(intent.type !== "none", `Expected structured intent for: ${prompt}`);
  }

  for (const prompt of RAG_PROMPTS) {
    const intent = detectStructuredIntent(prompt);
    assert(intent.type === "none", `Expected no structured intent for: ${prompt}`);
  }
}

function testProjectCatalog(corpus: CorpusFile): void {
  const response = answerStructuredIntent({ type: "list_projects" }, corpus);
  if (!response) {
    throw new Error("list_projects should return a response");
  }
  assert(!response.refused, "list_projects should not refuse");
  assert(response.sources.length > 0, "list_projects should include sources");

  const projectPaths = new Set(
    corpus.documents.filter((doc) => doc.kind === "project").map((doc) => doc.path)
  );
  assert(
    response.sources.every((source) => projectPaths.has(source.path)),
    "list_projects sources must be project documents only"
  );
  assert(
    response.sources.length === projectPaths.size,
    "list_projects should include every project document"
  );

  for (const source of response.sources) {
    assert(
      response.answer.includes(source.title),
      `Answer should mention project title: ${source.title}`
    );
  }

  console.log(`list_projects -> ${response.sources.length} projects`);
}

function main(): void {
  testDetection();

  const corpusPath = path.join(process.cwd(), "public", "assistant", "corpus.json");
  if (fs.existsSync(corpusPath)) {
    const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8")) as CorpusFile;
    testProjectCatalog(corpus);
  } else {
    console.warn("Skipping catalog tests: public/assistant/corpus.json not found");
  }

  console.log("structured intent checks passed");
}

main();
