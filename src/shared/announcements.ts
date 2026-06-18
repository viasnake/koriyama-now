import type { NewsEntry } from "./types";

export function mergeAnnouncements(news: NewsEntry[]): NewsEntry[] {
  return [...news].sort(
    (left, right) => timestamp(right.publishedAt) - timestamp(left.publishedAt)
  );
}

function timestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
