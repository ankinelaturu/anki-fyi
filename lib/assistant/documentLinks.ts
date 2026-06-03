export const LINK_FIELDS = ["website", "demo", "linkedin", "url"] as const;

export type DocumentLink = {
  label: (typeof LINK_FIELDS)[number];
  url: string;
};

const DISPLAY_LABELS: Record<string, string> = {
  website: "Website",
  demo: "Demo",
  linkedin: "LinkedIn",
  url: "URL",
  link: "Link",
};

export function linkDisplayLabel(label: string): string {
  return DISPLAY_LABELS[label.toLowerCase()] ?? label.charAt(0).toUpperCase() + label.slice(1);
}

const PLACEHOLDER_RE = /anki-fixme/i;

function isUsableUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  if (PLACEHOLDER_RE.test(trimmed)) return false;
  return true;
}

export function extractDocumentLinks(data: Record<string, unknown>): DocumentLink[] {
  const links: DocumentLink[] = [];
  const seenUrls = new Set<string>();

  for (const label of LINK_FIELDS) {
    const url = data[label];
    if (!isUsableUrl(url) || seenUrls.has(url)) continue;
    seenUrls.add(url);
    links.push({ label, url });
  }

  return links;
}

/** Markdown block injected into corpus chunks so RAG can surface project links. */
export function formatDocumentLinksBlock(data: Record<string, unknown>): string {
  const links = extractDocumentLinks(data);
  if (links.length === 0) return "";

  const lines = links.map(({ label, url }) => `- ${label}: ${url}`);
  return `## Links\n\n${lines.join("\n")}`;
}
