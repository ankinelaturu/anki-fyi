/**
 * System prompt for the Qwen metadata query planner.
 */

import { frontMatterSchema } from "@/lib/assistant/frontMatterSchema";
import { METADATA_FILTER_OPS } from "@/lib/assistant/metadataQueryTypes";

export type CorpusVocabulary = {
  technologies: string[];
  tags: string[];
  companies: string[];
  kinds: string[];
  importance: string[];
};

const FEW_SHOT_EXAMPLES = `Examples:

Question: List all projects
{"action":"list","filters":[{"field":"kind","op":"eq","value":"project"}]}

Question: List projects that use TypeScript
{"action":"list","filters":[{"field":"kind","op":"eq","value":"project"},{"field":"technologies","op":"containsAll","value":["TypeScript"]}]}

Question: Show flagship projects
{"action":"list","filters":[{"field":"kind","op":"eq","value":"project"},{"field":"importance","op":"eq","value":"flagship"}]}

Question: List Oracle experience
{"action":"list","filters":[{"field":"kind","op":"eq","value":"experience"},{"field":"company","op":"eq","value":"Oracle"}]}

Question: List concepts
{"action":"list","filters":[{"field":"kind","op":"eq","value":"concept"}]}

Question: What analytics files do you have?
{"action":"list","filters":[{"field":"kind","op":"eq","value":"analytics"}]}

Question: Why did you build Lintern?
{"action":"none"}

Question: How is AstroValley related to browser-native AI?
{"action":"none"}

Question: What did you do at Oracle?
{"action":"none"}`;

/**
 * Build the planner system prompt with compact field schema.
 */
export function buildPlannerSystemPrompt(_vocabulary: CorpusVocabulary): string {
  const schemaSummary = {
    fields: frontMatterSchema.fields.map((field) => ({
      name: field.name,
      type: field.type,
    })),
  };

  return `You are a metadata query planner for a personal portfolio workspace assistant.

Given a user question, output ONLY a single JSON object (no markdown, no explanation).

Output shape (ONLY these top-level keys):
- {"action":"none"}
- {"action":"list","filters":[{"field":"...","op":"...","value":...}],"sort":[{"field":"...","direction":"asc|desc"}]}

sort is optional. Never output document fields (title, characters, totalFrames, etc.) at the top level.

Filter "field" must be a metadata field name from the schema below (camelCase).
Allowed filter operators: ${METADATA_FILTER_OPS.join(", ")}

Available metadata fields:
${JSON.stringify(schemaSummary, null, 2)}

Rules:
- Use "action":"list" only for catalog or enumeration requests (list, show, find, which, what files do you have).
- Use "action":"none" for explanatory, narrative, why, how, or "what did you do" questions.
- Use canonical-looking values when obvious: TypeScript, React, WebGPU, Oracle, project, experience, concept, flagship.
- Do not invent metadata fields. Only use fields listed above.
- Values do not need to be pre-validated by the planner; the metadata engine will validate/filter them.
- For array fields (tags, technologies): use containsAll when user implies all terms, containsAny for any.
- For filmstrip/creative content: kind eq "creative" or type eq "filmstrip".
- For ideas/lab content: kind eq "concept" or kind eq "lab".
- Every list query must include at least one filter in the "filters" array.
- Output compact valid JSON on one line. No trailing keys. No code fences.

${FEW_SHOT_EXAMPLES}`;
}
