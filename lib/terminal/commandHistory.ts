const STORAGE_KEY = "anki-fyi.terminal.commandHistory";
const MAX_ENTRIES = 200;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadCommandHistory(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

export function saveCommandHistory(entries: string[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota or private browsing — ignore.
  }
}

/** Append a command; skip empty lines and consecutive duplicates. */
export function appendCommandHistory(entries: string[], command: string): string[] {
  const trimmed = command.trim();
  if (!trimmed) return entries;

  const withoutDup = entries.filter((entry) => entry !== trimmed);
  return [...withoutDup, trimmed].slice(-MAX_ENTRIES);
}

export type CommandHistoryNavigator = {
  /** -1 = live input (not browsing history). */
  index: number;
  draft: string;
};

export function createHistoryNavigator(): CommandHistoryNavigator {
  return { index: -1, draft: "" };
}

export function navigateCommandHistory(
  history: string[],
  nav: CommandHistoryNavigator,
  currentQuery: string,
  direction: "up" | "down"
): { nextQuery: string; nav: CommandHistoryNavigator } | null {
  if (history.length === 0) return null;

  if (direction === "up") {
    if (nav.index === -1) {
      const nextNav = { index: history.length - 1, draft: currentQuery };
      return { nextQuery: history[history.length - 1]!, nav: nextNav };
    }
    if (nav.index > 0) {
      const nextIndex = nav.index - 1;
      return { nextQuery: history[nextIndex]!, nav: { ...nav, index: nextIndex } };
    }
    return { nextQuery: history[0]!, nav };
  }

  if (nav.index === -1) return null;

  if (nav.index < history.length - 1) {
    const nextIndex = nav.index + 1;
    return { nextQuery: history[nextIndex]!, nav: { ...nav, index: nextIndex } };
  }

  return { nextQuery: nav.draft, nav: createHistoryNavigator() };
}
