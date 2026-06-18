import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BuildMeta,
  CategoryCount,
  ChangeSummary,
  HealthSummary,
  HomeData,
  NewsEntry,
  NewsListData,
  Place,
  PlaceListData
} from "../src/shared/types";
import { changesToNewsEntries, mergeAnnouncements } from "../src/shared/announcements";
import {
  categoryCountsFromHealth,
  categoryLabel,
  normalizeChanges,
  normalizeHealth,
  normalizeNews,
  normalizePlaces,
  placesToFeatureCollection
} from "../src/shared/normalize";

const apiBase = process.env.UPSTREAM_API_BASE ?? "https://koriyama-open-data-hub.alflag.org/api/v2";
const generatedDir = join(process.cwd(), "public", "generated");

type QueryValue = string | number | boolean | undefined | null;

async function main(): Promise<void> {
  await mkdir(generatedDir, { recursive: true });

  try {
    const generatedAt = new Date().toISOString();
    const [places, changes, news, health] = await Promise.all([
      fetchAllPlaces(),
      fetchChanges(),
      fetchNews(),
      fetchHealth()
    ]);
    const categoryCounts = health ? categoryCountsFromHealth(health.raw) : categoryCountsFromPlaces(places);
    const healthSummary = health?.summary ?? fallbackHealth(places);
    const announcements = mergeAnnouncements(news, changes);

    const home: HomeData = {
      generated_at: generatedAt,
      health: healthSummary,
      today_updates: buildTodayUpdates(changes, announcements, healthSummary.placesCount ?? places.length),
      news: announcements.slice(0, 6),
      places: places.slice(0, 8),
      category_counts: categoryCounts
    };

    const placesData: PlaceListData = {
      generated_at: generatedAt,
      places,
      count: places.length
    };

    const newsData: NewsListData = {
      generated_at: generatedAt,
      entries: announcements
    };

    const buildMeta: BuildMeta = {
      generated_at: generatedAt,
      source: "koriyama-open-data-hub",
      api_base: apiBase,
      mode: "scheduled-static-build",
      status: "ok",
      warnings: health ? [] : ["health endpoint could not be fetched"]
    };

    await Promise.all([
      writeGenerated("home.json", home),
      writeGenerated("places.json", placesData),
      writeGenerated("places.geojson", withGeneratedAt(generatedAt, placesToFeatureCollection(places))),
      writeGenerated("news.json", newsData),
      writeGenerated("build-meta.json", buildMeta)
    ]);

    console.log(`generated ${places.length} places and ${announcements.length} announcements`);
  } catch (error) {
    await preserveExistingGenerated(error);
  }
}

async function fetchAllPlaces(): Promise<Place[]> {
  const limit = 1000;
  const places: Place[] = [];

  for (let offset = 0; offset <= 10000; offset += limit) {
    const json = await fetchUpstream("/places", { limit, offset });
    const page = normalizePlaces(getData(json));
    places.push(...page);

    if (page.length < limit) {
      break;
    }
  }

  return places;
}

async function fetchChanges() {
  const json = await fetchUpstream("/changes", { limit: 100, offset: 0 });
  return normalizeChanges(getData(json));
}

async function fetchNews() {
  const json = await fetchUpstream("/rss/entries", { limit: 100, offset: 0 });
  return normalizeNews(getData(json));
}

async function fetchHealth(): Promise<{ raw: unknown; summary: HealthSummary } | undefined> {
  try {
    const json = await fetchUpstream("/health");
    const raw = getData(json);
    return {
      raw,
      summary: normalizeHealth(raw)
    };
  } catch (error) {
    console.warn("health fetch failed; generated health will be derived from places", error);
    return undefined;
  }
}

async function fetchUpstream(path: string, query: Record<string, QueryValue> = {}): Promise<unknown> {
  const url = new URL(path.replace(/^\//, ""), withTrailingSlash(apiBase));
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "koriyama-now-static-build/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream returned ${response.status}: ${url.toString()}`);
  }

  return response.json();
}

function getData(json: unknown): unknown {
  return isRecord(json) && "data" in json ? json.data : json;
}

function buildTodayUpdates(changes: ChangeSummary[], news: NewsEntry[], placesCount: number): string[] {
  const updates: string[] = [];
  if (placesCount > 0) {
    updates.push(`${placesCount.toLocaleString("ja-JP")}件の施設情報を確認できます`);
  }
  const latestChange = changesToNewsEntries(changes.slice(0, 1))[0];
  if (latestChange) {
    updates.push(latestChange.title);
  }
  const latestNews = news.find((entry) => entry.kind !== "change");
  if (latestNews) {
    updates.push(`お知らせ: ${latestNews.title}`);
  }

  return updates.slice(0, 3);
}

function categoryCountsFromPlaces(places: Place[]): CategoryCount[] {
  const counts = new Map<string, number>();
  places.forEach((place) => {
    const id = place.subcategory ?? place.category;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([, left], [, right]) => right - left)
    .map(([id, count]) => ({
      id,
      label: categoryLabel(id),
      count
    }));
}

function fallbackHealth(places: Place[]): HealthSummary {
  return {
    status: "ok",
    placesCount: places.length,
    lastSuccessAt: new Date().toISOString()
  };
}

function withGeneratedAt<T extends object>(generatedAt: string, value: T): T & { generated_at: string } {
  return {
    generated_at: generatedAt,
    ...value
  };
}

async function writeGenerated(name: string, value: unknown): Promise<void> {
  await writeFile(join(generatedDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function preserveExistingGenerated(error: unknown): Promise<void> {
  const required = ["home.json", "places.json", "places.geojson", "news.json"];
  const existing = await Promise.all(required.map((name) => fileExists(join(generatedDir, name))));

  if (!existing.every(Boolean)) {
    throw error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const previousMeta = await readExistingMeta();
  const buildMeta: BuildMeta = {
    generated_at: previousMeta?.generated_at ?? new Date().toISOString(),
    source: "koriyama-open-data-hub",
    api_base: apiBase,
    mode: "scheduled-static-build",
    status: "stale",
    warnings: [`using existing generated data: ${message}`]
  };

  await writeGenerated("build-meta.json", buildMeta);
  console.warn(`using existing generated data: ${message}`);
}

async function readExistingMeta(): Promise<BuildMeta | undefined> {
  try {
    const content = await readFile(join(generatedDir, "build-meta.json"), "utf8");
    const parsed: unknown = JSON.parse(content);
    return isRecord(parsed) && typeof parsed.generated_at === "string" ? (parsed as BuildMeta) : undefined;
  } catch {
    return undefined;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

void main();
