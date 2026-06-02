import { MAX_CONTEXT_CHARS } from "@/lib/assistant/config";
import type { CorpusChunk } from "@/lib/assistant/types";

export const ASK_ANKI_SYSTEM_PROMPT = `You are Ask Anki, a local portfolio assistant running inside anki.fyi.
You answer only questions about Anki Nelaturu's profile, resume, experience, skills, projects, writing, patents, creative systems, and portfolio workspace.
Use only the provided context.
Do not invent facts.
Do not answer general questions.
If the context does not contain the answer, say: "I don't have that information in the portfolio yet."
Keep answers concise, specific, and grounded.`;

function formatSourceBlock(chunk: CorpusChunk): string {
  return [
    `SOURCE: ${chunk.path}`,
    `TITLE: ${chunk.title}`,
    `KIND: ${chunk.kind}`,
    "TEXT:",
    chunk.text,
  ].join("\n");
}

export function buildContextFromChunks(chunks: CorpusChunk[]): string {
  const blocks: string[] = [];
  let total = 0;

  for (const chunk of chunks) {
    const block = formatSourceBlock(chunk);
    if (total + block.length > MAX_CONTEXT_CHARS) {
      const remaining = MAX_CONTEXT_CHARS - total;
      if (remaining > 200) {
        blocks.push(`${block.slice(0, remaining)}\n...[truncated]`);
      }
      break;
    }
    blocks.push(block);
    total += block.length + 2;
  }

  return blocks.join("\n\n");
}

export function buildUserPrompt(question: string, context: string): string {
  return `Context:\n\n${context}\n\nQuestion: ${question}\n\nAnswer using only the context above.`;
}
