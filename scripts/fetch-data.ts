import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BuildMeta,
  CategoryCount,
  HealthSummary,
  HomeData,
  NewsEntry,
  NewsListData,
  Place,
  PlaceListData
} from "../src/shared/types";
import { mergeAnnouncements } from "../src/shared/announcements";
import {
  categoryCountsFromHealth,
  categoryLabel,
  normalizeHealth,
  normalizeNews,
  normalizePlaces,
  placesToFeatureCollection
} from "../src/shared/normalize";

const apiBase = process.env.UPSTREAM_API_BASE ?? "https://civic-koriyama-data.alflag.org/api/v2";
const generatedDir = join(process.cwd(), "public", "generated");
const featuredTopicLimit = 3;
const featuredTopicLookbackDays = 14;

const featuredTopicKeywords = [
  "補助金",
  "助成",
  "給付",
  "申請",
  "募集中",
  "募集",
  "意見公募",
  "パブリックコメント",
  "説明会",
  "相談会",
  "災害",
  "防災",
  "防犯",
  "詐欺",
  "熱中症",
  "交通事故",
  "事故防止",
  "支援事業"
];

const routineTopicKeywords = [
  "開放状況",
  "受診者数",
  "報道資料",
  "放送のお知らせ",
  "市民相談センターの案内",
  "入札",
  "議案概要",
  "提案理由",
  "実施しました",
  "受付終了",
  "終了しました"
];

type QueryValue = string | number | boolean | undefined | null;

async function main(): Promise<void> {
  await mkdir(generatedDir, { recursive: true });

  try {
    const generatedAt = new Date().toISOString();
    const [places, news, health] = await Promise.all([
      fetchAllPlaces(),
      fetchNews(),
      fetchHealth()
    ]);
    const categoryCounts = health ? categoryCountsFromHealth(health.raw) : categoryCountsFromPlaces(places);
    const healthSummary = health?.summary ?? fallbackHealth(places);
    const announcements = mergeAnnouncements(news);

    const home: HomeData = {
      generated_at: generatedAt,
      health: healthSummary,
      featured_topics: buildFeaturedTopics(announcements, generatedAt),
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
      source: "civic-koriyama-data",
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
      "user-agent": "civic-koriyama-static-build/0.1"
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

function buildFeaturedTopics(news: NewsEntry[], referenceDate: string): NewsEntry[] {
  const referenceTimestamp = Date.parse(referenceDate);
  const cutoff = Number.isFinite(referenceTimestamp)
    ? referenceTimestamp - featuredTopicLookbackDays * 24 * 60 * 60 * 1000
    : 0;
  const seenTitles = new Set<string>();

  return news
    .filter((entry) => {
      const publishedTimestamp = timestamp(entry.publishedAt);
      return publishedTimestamp !== undefined && publishedTimestamp >= cutoff;
    })
    .filter(isFeaturedTopic)
    .filter((entry) => {
      const key = normalizeTopicText(entry.title);
      if (seenTitles.has(key)) {
        return false;
      }
      seenTitles.add(key);
      return true;
    })
    .slice(0, featuredTopicLimit);
}

function isFeaturedTopic(entry: NewsEntry): boolean {
  const text = normalizeTopicText([entry.title, entry.category, entry.categoryLabel, ...entry.tags].join(" "));
  if (routineTopicKeywords.some((keyword) => text.includes(normalizeTopicText(keyword)))) {
    return false;
  }

  return featuredTopicKeywords.some((keyword) => text.includes(normalizeTopicText(keyword)));
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

function timestamp(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeTopicText(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
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
    source: "civic-koriyama-data",
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
