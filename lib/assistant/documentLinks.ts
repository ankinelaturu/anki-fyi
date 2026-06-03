const LINK_FIELDS: { key: string; label: string }[] = [
  { key: "website", label: "Website" },
  { key: "demo", label: "Demo" },
  { key: "linkedin", label: "LinkedIn" },
];

const PLACEHOLDER_RE = /anki-fixme/i;

function isUsableUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  if (PLACEHOLDER_RE.test(trimmed)) return false;
  return true;
}

/** Markdown block injected into corpus chunks so RAG can surface project links. */
export function formatDocumentLinksBlock(data: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const { key, label } of LINK_FIELDS) {
    const url = data[key];
    if (isUsableUrl(url)) lines.push(`- ${label}: ${url}`);
  }

  if (lines.length === 0) return "";
  return `## Links\n\n${lines.join("\n")}`;
}
