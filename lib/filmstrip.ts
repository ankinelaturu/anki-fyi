export type FilmstripFrame = {
  day: number;
  title: string;
  imageSrc: string;
  text: string;
  hashtag?: string;
};

const DAY_HEADING_RE = /^## Day (\d+)\s*$/gm;
const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/;
const HASHTAG_RE = /^#([A-Za-z][\w]*)\s*$/;

export function parseFilmstripFrames(markdown: string, imagePattern?: string): FilmstripFrame[] {
  const parts = markdown.split(DAY_HEADING_RE);
  const frames: FilmstripFrame[] = [];

  for (let i = 1; i < parts.length; i += 2) {
    const day = Number.parseInt(parts[i] ?? "", 10);
    const block = parts[i + 1] ?? "";
    if (Number.isNaN(day)) continue;

    const imageMatch = block.match(IMAGE_RE);
    const imageSrc = imageMatch?.[2]?.trim() ?? imagePattern?.replace("{day}", String(day)) ?? "";
    const title = imageMatch?.[1]?.trim() || `Day ${day}`;

    const textLines: string[] = [];
    let hashtag: string | undefined;

    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (hashtag) break;
        if (textLines.length > 0) textLines.push("");
        continue;
      }
      if (IMAGE_RE.test(trimmed)) continue;
      const tagMatch = trimmed.match(HASHTAG_RE);
      if (tagMatch) {
        hashtag = tagMatch[1];
        break;
      }
      if (trimmed === "---" || /^#\s/.test(trimmed)) break;
      textLines.push(line);
    }

    const text = textLines.join("\n").trim();

    frames.push({ day, title, imageSrc, text, hashtag });
  }

  return frames.sort((a, b) => a.day - b.day);
}

export function getFilmstripMaxDay(frames: FilmstripFrame[], totalFrames?: number): number {
  if (frames.length > 0) return frames[frames.length - 1]!.day;
  if (typeof totalFrames === "number" && totalFrames > 0) return totalFrames - 1;
  return 0;
}
