import { documentMatchesQuery } from "../lib/assistant/metadataQueryEvaluate";
import type { MetadataQuery } from "../lib/assistant/metadataQueryTypes";
import type { CorpusDocument } from "../lib/assistant/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function doc(partial: Partial<CorpusDocument> & Pick<CorpusDocument, "path" | "title" | "kind">): CorpusDocument {
  return {
    id: partial.path,
    tags: [],
    content: "",
    chunks: [],
    frontMatter: {
      title: partial.title,
      kind: partial.kind,
      tags: partial.tags ?? [],
      technologies: partial.technologies ?? [],
      company: partial.company,
      importance: partial.importance,
      type: partial.type,
      ...partial.frontMatter,
    },
    ...partial,
  };
}

function testKindEq(): void {
  const project = doc({ path: "projects/a.md", title: "A", kind: "project" });
  const query: MetadataQuery = {
    action: "list",
    filters: [{ field: "kind", op: "eq", value: "project" }],
  };
  assert(documentMatchesQuery(project, query), "project should match kind eq project");
  assert(!documentMatchesQuery(doc({ path: "x.md", title: "X", kind: "writing" }), query), "writing should not match");
}

function testTechnologiesContainsAll(): void {
  const match = doc({
    path: "projects/ts.md",
    title: "TS",
    kind: "project",
    technologies: ["TypeScript", "React"],
  });
  const query: MetadataQuery = {
    action: "list",
    filters: [
      { field: "kind", op: "eq", value: "project" },
      { field: "technologies", op: "containsAll", value: ["TypeScript"] },
    ],
  };
  assert(documentMatchesQuery(match, query), "should match TypeScript technology");
  assert(
    !documentMatchesQuery(doc({ path: "p.md", title: "P", kind: "project", technologies: ["Python"] }), query),
    "Python-only project should not match"
  );
}

function testCompanyEq(): void {
  const oracle = doc({
    path: "experience/oracle.md",
    title: "Oracle",
    kind: "experience",
    company: "Oracle",
  });
  const query: MetadataQuery = {
    action: "list",
    filters: [
      { field: "kind", op: "eq", value: "experience" },
      { field: "company", op: "eq", value: "Oracle" },
    ],
  };
  assert(documentMatchesQuery(oracle, query), "Oracle experience should match");
}

function testFilmstripKind(): void {
  const filmstrip = doc({
    path: "creative-systems/adhd.md",
    title: "ADHD",
    kind: "creative",
    type: "filmstrip",
  });
  const query: MetadataQuery = {
    action: "list",
    filters: [{ field: "kind", op: "eq", value: "filmstrip" }],
  };
  assert(documentMatchesQuery(filmstrip, query), "filmstrip kind alias should match creative filmstrip");
}

function testImportanceEq(): void {
  const flagship = doc({
    path: "projects/flagship.md",
    title: "Flagship",
    kind: "project",
    importance: "flagship",
  });
  const query: MetadataQuery = {
    action: "list",
    filters: [
      { field: "kind", op: "eq", value: "project" },
      { field: "importance", op: "eq", value: "flagship" },
    ],
  };
  assert(documentMatchesQuery(flagship, query), "flagship project should match");
}

function main(): void {
  testKindEq();
  testTechnologiesContainsAll();
  testCompanyEq();
  testFilmstripKind();
  testImportanceEq();
  console.log("metadata query evaluate checks passed");
}

main();
