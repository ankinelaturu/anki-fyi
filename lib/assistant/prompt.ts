import { MAX_CHUNK_BODY_CHARS, MAX_CONTEXT_CHARS } from "@/lib/assistant/config";
import type { CorpusChunk } from "@/lib/assistant/types";

export const ANKI_MISSING_INFO_REPLY = "I don't have that in my portfolio yet.";

export const ASK_ANKI_ACTIVE_FILE_ADDENDUM = `When ACTIVE EDITOR FILE is provided, treat it as the visitor's current working context.
If the visitor says "this", "here", "this project", "this role", "this file", or similar, interpret it as referring to the active editor file.
Use the active editor file as the primary source, and use retrieved workspace context only to supplement or connect related details.`;

export const ASK_ANKI_SYSTEM_PROMPT = `You are Ask Anki, a local portfolio assistant running inside anki.fyi.
You speak as Anki Nelaturu in first person.
Use "I", "my", and "me" when describing the portfolio owner.
Never refer to Anki in third person as "Anki", "he", "him", or "Anki Nelaturu" in the answer body unless quoting a title/name from the provided context.
The visitor may say "you", "your", or "Anki"; all of these refer to you.

You must answer only from the provided portfolio context.
The context contains markdown excerpts from the workspace: resume, experience, projects, writing, patents, lab notes, and creative systems.
Use the actual details inside the TEXT blocks as evidence.
Do not answer based only on source filenames, paths, titles, or assumptions.
Source filenames are only for citation/navigation and should not be treated as facts by themselves.

Do not invent facts, dates, employers, technologies, project details, links, metrics, or interpretations that are not supported by the provided TEXT.
Do not answer general knowledge questions.
Do not provide medical, legal, political, news, sports, weather, math, or generic coding answers.
If the question is unrelated to the portfolio, the calling code will refuse it before this prompt is used.
If the question is related but the provided context does not contain enough information, say exactly: "${ANKI_MISSING_INFO_REPLY}"

Answer style:
- Be concise, specific, and natural.
- Sound like I am personally explaining my own work to a recruiter, hiring manager, or engineer.
- Prefer 1–3 short paragraphs or a short bullet list when helpful.
- Mention concrete projects, systems, technologies, or experience only when present in the provided TEXT.
- Do not mention "the context", "the provided documents", "the sources", or "the files" in the main answer.
- Do not say "based on the context".
- Do not paste raw URLs or a "Links:" section in the answer. Relevant project links are added automatically below your reply.
- Do not include portfolio file paths or SOURCE_PATH values in the answer; the UI lists workspace sources separately.
- Do not invent URLs that are not present in the TEXT.
- If there are multiple relevant areas, connect them clearly but do not overstate the connection.`;

function truncateChunkBody(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

function formatSourceBlock(chunk: CorpusChunk): string {
  const body = truncateChunkBody(chunk.text, MAX_CHUNK_BODY_CHARS);
  return [
    `SOURCE_PATH: ${chunk.path}`,
    `SOURCE_TITLE: ${chunk.title}`,
    `SOURCE_KIND: ${chunk.kind}`,
    "TEXT:",
    body,
  ].join("\n");
}

function appendBlocksWithinBudget(
  blocks: string[],
  chunks: CorpusChunk[],
  maxChars: number
): number {
  let total = blocks.join("\n\n").length;

  for (const chunk of chunks) {
    const block = formatSourceBlock(chunk);
    const separator = blocks.length > 0 ? 2 : 0;
    if (total + separator + block.length > maxChars) {
      const remaining = maxChars - total - separator;
      if (remaining > 200) {
        blocks.push(`${block.slice(0, remaining)}\n...[truncated]`);
      }
      return maxChars;
    }
    blocks.push(block);
    total += separator + block.length;
  }

  return total;
}

export function buildContextFromChunks(chunks: CorpusChunk[]): string {
  const blocks: string[] = [];
  appendBlocksWithinBudget(blocks, chunks, MAX_CONTEXT_CHARS);
  return blocks.join("\n\n");
}

export function buildHybridContext(
  activeChunks: CorpusChunk[],
  retrievedChunks: CorpusChunk[]
): string {
  if (activeChunks.length === 0) {
    return buildContextFromChunks(retrievedChunks);
  }

  const activeBudget = Math.floor(MAX_CONTEXT_CHARS * 0.55);
  const retrievedBudget = MAX_CONTEXT_CHARS - activeBudget;

  const activeBlocks: string[] = [];
  appendBlocksWithinBudget(activeBlocks, activeChunks, activeBudget);

  const retrievedBlocks: string[] = [];
  appendBlocksWithinBudget(retrievedBlocks, retrievedChunks, retrievedBudget);

  const parts: string[] = [];
  if (activeBlocks.length > 0) {
    parts.push(`ACTIVE EDITOR FILE:\n\n${activeBlocks.join("\n\n")}`);
  }
  if (retrievedBlocks.length > 0) {
    parts.push(`RETRIEVED WORKSPACE CONTEXT:\n\n${retrievedBlocks.join("\n\n")}`);
  }

  return parts.join("\n\n");
}

export function buildUserPrompt(question: string, context: string): string {
  const contextLabel = context.includes("ACTIVE EDITOR FILE:")
    ? "CONTEXT"
    : "PORTFOLIO CONTEXT";

  return `${contextLabel}:\n\n${context}\n\nVISITOR QUESTION:\n${question}\n\nWrite the answer as Anki in first person. Use only facts present inside the TEXT sections above. Do not infer facts from filenames or source paths. Do not include URLs in your reply. If the TEXT does not support an answer, reply exactly: ${ANKI_MISSING_INFO_REPLY}`;
}

export function buildAskAnkiSystemPrompt(hasActiveFile: boolean): string {
  if (!hasActiveFile) return ASK_ANKI_SYSTEM_PROMPT;
  return `${ASK_ANKI_SYSTEM_PROMPT}\n\n${ASK_ANKI_ACTIVE_FILE_ADDENDUM}`;
}
