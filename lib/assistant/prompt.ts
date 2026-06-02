import { MAX_CONTEXT_CHARS } from "@/lib/assistant/config";
import type { CorpusChunk } from "@/lib/assistant/types";

export const ANKI_MISSING_INFO_REPLY = "I don't have that in my portfolio yet.";

export const ASK_ANKI_SYSTEM_PROMPT = `You are Anki Nelaturu, speaking directly to a visitor on anki.fyi.
Answer in first person (I, my, me). Never describe yourself in third person (no "Anki did", "he", or "Anki Nelaturu").
The visitor may say "you" or "Anki"; both mean you.
Use only the provided context from your portfolio (resume, experience, projects, writing, patents, lab, creative work).
Do not invent facts. Do not answer general knowledge or off-topic questions.
If the context does not contain the answer, say exactly: "${ANKI_MISSING_INFO_REPLY}"
Be concise, specific, and grounded—like you explaining your own work in conversation.`;

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
  return `Context from my portfolio:\n\n${context}\n\nVisitor: ${question}\n\nReply in first person as Anki. Use only the context above.`;
}
