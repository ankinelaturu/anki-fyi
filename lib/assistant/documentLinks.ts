/**
 * Extraction and formatting of project links from document frontmatter.
 *
 * Normalizes `website`, `demo`, `linkedin`, and `url` fields into markdown
 * `## Links` blocks embedded in corpus chunks for RAG and post-processing.
 */

/**
 * Frontmatter keys scanned for external project links.
 */
export const LINK_FIELDS = ["website", "demo", "linkedin", "url"] as const;

/**
 * A single labeled URL extracted from document metadata.
 */
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

/**
 * Map a lowercase link label to a human-friendly display string.
 */
export function linkDisplayLabel(label: string): string {
  return DISPLAY_LABELS[label.toLowerCase()] ?? label.charAt(0).toUpperCase() + label.slice(1);
}

const PLACEHOLDER_RE = /anki-fixme/i;

/**
 * Returns true for non-placeholder http(s) URL strings.
 */
function isUsableUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  if (PLACEHOLDER_RE.test(trimmed)) return false;
  return true;
}

/**
 * Pull deduplicated document links from a raw frontmatter data object.
 */
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

/**
 * Build a `## Links` markdown block from frontmatter for corpus chunk injection.
 */
export function formatDocumentLinksBlock(data: Record<string, unknown>): string {
  return formatLinksBlockFromDocumentLinks(extractDocumentLinks(data));
}

/**
 * Render a list of document links as a markdown `## Links` section.
 *
 * Returns an empty string when there are no links.
 */
export function formatLinksBlockFromDocumentLinks(links: DocumentLink[]): string {
  if (links.length === 0) return "";

  const lines = links.map(({ label, url }) => `- ${label}: ${url}`);
  return `## Links\n\n${lines.join("\n")}`;
}
