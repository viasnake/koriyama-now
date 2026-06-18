import type { ChangeSummary, NewsEntry } from "./types";

const changeCategory = {
  id: "changes",
  label: "施設の更新"
} as const;

export function mergeAnnouncements(news: NewsEntry[], changes: ChangeSummary[]): NewsEntry[] {
  const newsEntries = news.map((entry): NewsEntry => ({ ...entry, kind: entry.kind ?? "news" }));
  return [...newsEntries, ...changesToNewsEntries(changes)].sort(
    (left, right) => timestamp(right.publishedAt) - timestamp(left.publishedAt)
  );
}

export function changesToNewsEntries(changes: ChangeSummary[]): NewsEntry[] {
  return changes
    .filter((change) => Boolean(change.placeName))
    .map((change) => ({
      id: `change:${change.id}`,
      title: changeTitle(change),
      link: change.placeId ? `/place/${encodeURIComponent(change.placeId)}` : "/news?category=changes",
      category: changeCategory.id,
      categoryLabel: changeCategory.label,
      publishedAt: change.changedAt,
      tags: [change.address].filter((value): value is string => Boolean(value)),
      kind: "change",
      placeId: change.placeId,
      address: change.address
    }));
}

function changeTitle(change: ChangeSummary): string {
  if (!change.placeName) {
    return change.label;
  }

  if (change.label.includes("追加")) {
    return `${change.placeName}を追加しました`;
  }

  if (change.label.includes("削除")) {
    return `${change.placeName}の掲載を終了しました`;
  }

  return `${change.placeName}の情報を更新しました`;
}

function timestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
