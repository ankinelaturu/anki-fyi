import { LINK_FIELDS, linkDisplayLabel } from "@/lib/assistant/documentLinks";
import { ANKI_MISSING_INFO_REPLY } from "@/lib/assistant/prompt";
import type { CorpusChunk } from "@/lib/assistant/types";

export type ContextLink = {
  label: string;
  url: string;
};

const LINKS_SECTION_RE = /## Links\r?\n\r?\n([\s\S]*?)(?=\r?\n## |\r?\n>|$)/;
const LINK_LABELS = LINK_FIELDS.join("|");
const LINK_LINE_LABELED_RE = new RegExp(
  `^-\\s+(${LINK_LABELS}):\\s+(https?:\\/\\/\\S+)\\s*$`,
  "i"
);
const LINK_LINE_BARE_RE = /^-\s+(https?:\/\/\S+)\s*$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Labeled URLs under ## Links in retrieved chunk text (from project frontmatter). */
export function extractLinksFromChunkText(text: string): ContextLink[] {
  const section = text.match(LINKS_SECTION_RE)?.[1];
  if (!section) return [];

  const links: ContextLink[] = [];

  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    const labeled = trimmed.match(LINK_LINE_LABELED_RE);
    if (labeled?.[1] && labeled[2]) {
      links.push({ label: labeled[1].toLowerCase(), url: labeled[2] });
      continue;
    }

    const bare = trimmed.match(LINK_LINE_BARE_RE);
    if (bare?.[1]) {
      links.push({ label: "link", url: bare[1] });
    }
  }

  return links;
}

export function extractLinksFromChunks(chunks: CorpusChunk[]): ContextLink[] {
  const seen = new Set<string>();
  const ordered: ContextLink[] = [];

  for (const chunk of chunks) {
    for (const link of extractLinksFromChunkText(chunk.text)) {
      const key = `${link.label}:${link.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(link);
    }
  }

  return ordered;
}

function shouldEnrichAnswer(answer: string): boolean {
  const trimmed = answer.trim();
  if (!trimmed || trimmed === ANKI_MISSING_INFO_REPLY) return false;
  if (/Gemma failed|failed to load|4096 token window/i.test(trimmed)) return false;
  return true;
}

export function formatMarkdownLink({ label, url }: ContextLink): string {
  return `[${linkDisplayLabel(label)}](${url})`;
}

function formatLinkBullet(link: ContextLink): string {
  return `- ${formatMarkdownLink(link)}`;
}

/** Remove Gemma "Links:" blocks and raw URLs before we append labeled markdown links. */
function stripRawLinksFromAnswer(answer: string, links: ContextLink[]): string {
  let text = answer;

  text = text.replace(/^\s*#*\s*Links:\s*$/gim, "");

  for (const link of links) {
    const label = link.label;
    const display = linkDisplayLabel(label);
    const urlBase = link.url.split("?")[0] ?? link.url;

    text = text.replace(new RegExp(`^\\s*${label}\\s*:\\s*https?:\\/\\/\\S+\\s*$`, "gim"), "");
    text = text.replace(
      new RegExp(`^\\s*${label}\\s*:\\s*\\[${escapeRegExp(display)}\\]\\([^)]+\\)\\s*$`, "gim"),
      ""
    );
    text = text.replace(
      new RegExp(`^\\s*-\\s*\\[${escapeRegExp(display)}\\]\\([^)]+\\)\\s*$`, "gim"),
      ""
    );
    text = text.replace(
      new RegExp(
        `^\\s*-\\s*${label}\\s*:\\s*\\[${escapeRegExp(label)}\\]\\([^)]+\\)\\s*$`,
        "gim"
      ),
      ""
    );
    text = text.replace(new RegExp(`^\\s*${escapeRegExp(link.url)}\\s*$`, "gim"), "");
    text = text.replace(new RegExp(`^\\s*${escapeRegExp(urlBase)}\\S*\\s*$`, "gim"), "");
  }

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/** Append clickable link labels only (Website, Demo, LinkedIn) from retrieved context. */
export function enrichAnswerWithContextLinks(answer: string, chunks: CorpusChunk[]): string {
  if (!shouldEnrichAnswer(answer)) return answer;

  const links = extractLinksFromChunks(chunks);
  if (links.length === 0) return answer;

  const cleaned = stripRawLinksFromAnswer(answer, links);
  const block = links.map((link) => formatLinkBullet(link)).join("\n");

  return cleaned ? `${cleaned}\n\n${block}` : block;
}
