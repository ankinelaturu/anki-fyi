/** Format `YYYY-MM` frontmatter values as `Mon YYYY` (e.g. Sep 2024). */
export function formatExperienceMonth(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  const match = value.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return value.trim();

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return value.trim();

  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}
