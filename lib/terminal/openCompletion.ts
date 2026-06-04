import type { ContentFile } from "@/lib/content-types";

const OPEN_COMMAND_RE = /^open\s+(.*)$/i;

/** True when the input is `open ` or `open <prefix>`. */
export function isOpenCompletionMode(query: string): boolean {
  return /^open\s/i.test(query);
}

export function getOpenPathPrefix(query: string): string | null {
  if (!isOpenCompletionMode(query)) return null;
  const match = query.match(OPEN_COMMAND_RE);
  return match ? match[1]!.replace(/^\//, "") : null;
}

/** Sorted workspace paths; optional prefix filters paths that start with it. */
export function listOpenCandidates(files: ContentFile[], pathPrefix: string): string[] {
  const normalized = pathPrefix.toLowerCase().replace(/^\//, "");
  const paths = [...files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => file.path);

  if (!normalized) return paths;
  return paths.filter((path) => path.toLowerCase().startsWith(normalized));
}

/** Gray ghost suffix shown after the typed query (path portion only). */
export function getOpenGhostSuffix(query: string, selectedPath: string | undefined): string {
  if (!selectedPath || !isOpenCompletionMode(query)) return "";

  const prefix = getOpenPathPrefix(query) ?? "";
  const pathLower = selectedPath.toLowerCase();
  const prefixLower = prefix.toLowerCase();

  if (prefix && !pathLower.startsWith(prefixLower)) return "";
  return selectedPath.slice(prefix.length);
}

export function buildOpenCommand(path: string): string {
  return `open ${path}`;
}
