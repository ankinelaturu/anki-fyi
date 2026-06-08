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
 * Build the planner system prompt with schema and corpus vocabulary.
 */
export function buildPlannerSystemPrompt(vocabulary: CorpusVocabulary): string {
  const schemaSummary = {
    fields: frontMatterSchema.fields.map((field) => ({
      name: field.name,
      type: field.type,
      optional: field.optional,
    })),
    enums: frontMatterSchema.enums,
    vocabulary,
  };

  return `You are a metadata query planner for a personal portfolio workspace assistant.

Given a user question, output ONLY a single JSON object (no markdown, no explanation) that describes how to filter workspace documents by YAML front matter metadata.

Schema (field names are camelCase):
${JSON.stringify(schemaSummary, null, 2)}

Allowed filter operators: ${METADATA_FILTER_OPS.join(", ")}

Rules:
- Use "action":"list" only for catalog or enumeration requests (list, show, find, which, what files do you have).
- Use "action":"none" for explanatory, narrative, why, how, or "what did you do" questions.
- Map user terms to exact vocabulary values when possible (technologies, tags, companies, kinds).
- For array fields (tags, technologies): use containsAll when user implies all terms, containsAny for any.
- For filmstrip/creative content: kind eq "creative" or type eq "filmstrip".
- For ideas/lab content: kind eq "concept" or kind eq "lab".
- Every list query must include at least one filter.
- Respond with JSON only.

${FEW_SHOT_EXAMPLES}`;
}
