import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NewsEntry, NewsListData, PlaceListData, SearchIndexData, SearchIndexItem } from "../src/shared/types";

const generatedDir = join(process.cwd(), "public", "generated");

async function main(): Promise<void> {
  const placesData = await readGenerated<PlaceListData>("places.json");
  const newsData = await readGenerated<NewsListData>("news.json");
  const searchIndex: SearchIndexData = {
    generated_at: placesData.generated_at,
    items: [
      ...placesData.places.map(toPlaceSearchItem),
      ...newsData.entries.map(toNewsSearchItem)
    ]
  };

  await writeFile(
    join(generatedDir, "search-index.json"),
    `${JSON.stringify(searchIndex, null, 2)}\n`,
    "utf8"
  );
  console.log(`generated ${searchIndex.items.length} search index items`);
}

async function readGenerated<T>(name: string): Promise<T> {
  const content = await readFile(join(generatedDir, name), "utf8");
  return JSON.parse(content) as T;
}

function toPlaceSearchItem(place: PlaceListData["places"][number]): SearchIndexItem {
  const keywords = [
    place.name,
    place.category,
    place.categoryLabel,
    place.subcategory,
    place.address,
    place.phone
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return {
    id: place.id,
    type: "place",
    name: place.name,
    category: place.subcategory ?? place.category,
    categoryLabel: place.categoryLabel,
    address: place.address,
    keywords: normalizeSearchText(keywords)
  };
}

function toNewsSearchItem(entry: NewsEntry): SearchIndexItem {
  const keywords = [
    entry.title,
    entry.category,
    entry.categoryLabel,
    entry.feedId,
    ...(entry.feedIds ?? []),
    ...(entry.feedKinds ?? []),
    ...entry.tags
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return {
    id: entry.id,
    type: "news",
    name: entry.title,
    category: entry.category,
    categoryLabel: entry.categoryLabel,
    url: entry.link,
    publishedAt: entry.publishedAt,
    tags: entry.tags,
    keywords: normalizeSearchText(keywords)
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u30fc\u2212]/g, "-")
    .replace(/\s+/g, " ");
}

void main();
