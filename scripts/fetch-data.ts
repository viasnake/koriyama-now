import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BuildMeta,
  CategoryCount,
  HealthSummary,
  HomeData,
  NewsEntry,
  NewsListData,
  OfficialSite,
  Place,
  PlaceListData
} from "../src/shared/types";
import { mergeAnnouncements } from "../src/shared/announcements";
import {
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
const homePlaceLimit = 8;
const siteFeedEntryLimit = 20;
const displayCategoryOrder = [
  "aed",
  "medical",
  "childcare",
  "public_toilets",
  "public_wifi",
  "education",
  "facility"
];

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

const featuredTopicPriorityKeywords = [
  "防災",
  "災害",
  "避難",
  "詐欺",
  "防犯",
  "熱中症",
  "期限",
  "締切",
  "申請期限",
  "受付期限"
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

type RssFeed = {
  id: string;
  kind: string;
  title: string;
  url: string;
};

type NewsSourceData = {
  entries: NewsEntry[];
  officialSites: OfficialSite[];
};

async function main(): Promise<void> {
  await mkdir(generatedDir, { recursive: true });

  try {
    const generatedAt = new Date().toISOString();
    const [rawPlaces, newsSource, health] = await Promise.all([
      fetchAllPlaces(),
      fetchNews(),
      fetchHealth()
    ]);
    const places = mergeDuplicatePlaces(rawPlaces);
    const categoryCounts = categoryCountsFromPlaces(places);
    const healthSummary = {
      ...(health?.summary ?? fallbackHealth(places)),
      placesCount: places.length
    };
    const announcements = mergeAnnouncements(newsSource.entries);

    const home: HomeData = {
      generated_at: generatedAt,
      health: healthSummary,
      featured_topics: buildFeaturedTopics(announcements, generatedAt),
      news: announcements.slice(0, 6),
      places: buildNewlyRegisteredPlaces(places),
      category_counts: categoryCounts
    };

    const placesData: PlaceListData = {
      generated_at: generatedAt,
      places,
      count: places.length
    };

    const newsData: NewsListData = {
      generated_at: generatedAt,
      entries: announcements,
      official_sites: newsSource.officialSites
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

    console.log(
      `generated ${places.length} places (${rawPlaces.length} source records) and ${announcements.length} announcements`
    );
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

async function fetchNews(): Promise<NewsSourceData> {
  const json = await fetchUpstream("/rss/entries", { limit: 1000, offset: 0 });
  const entries = normalizeNews(getData(json));
  const siteFeeds = await fetchSiteFeeds();
  const siteNews = await fetchSiteFeedNews(siteFeeds);
  const officialSites = buildOfficialSites(siteFeeds, siteNews);

  return {
    entries: mergeNewsEntries(entries, siteNews),
    officialSites
  };
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

async function fetchSiteFeeds(): Promise<RssFeed[]> {
  try {
    const json = await fetchUpstream("/rss/feeds", {
      kind: "site",
      include_disabled: true,
      include_unverified: true
    });
    const data = getData(json);
    const feeds = isRecord(data) && Array.isArray(data.feeds) ? data.feeds : [];

    return feeds.map(normalizeRssFeed).filter((feed): feed is RssFeed => feed !== null);
  } catch (error) {
    console.warn("site RSS feed list fetch failed; generated news will use entries endpoint only", error);
    return [];
  }
}

async function fetchSiteFeedNews(feeds: RssFeed[]): Promise<NewsEntry[]> {
  const results = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const xml = await fetchText(feed.url);
        return parseRssXml(xml, feed);
      } catch (error) {
        console.warn(`site RSS fetch failed: ${feed.id}`, error);
        return [];
      }
    })
  );

  return results.flat();
}

function buildOfficialSites(feeds: RssFeed[], siteNews: NewsEntry[]): OfficialSite[] {
  const siteUrlsByFeed = new Map<string, string>();

  siteNews.forEach((entry) => {
    const siteUrl = siteRootFromUrl(entry.link);
    const feedId = entry.feedId;
    if (siteUrl && feedId && !siteUrlsByFeed.has(feedId)) {
      siteUrlsByFeed.set(feedId, siteUrl);
    }
  });

  return feeds
    .map((feed) => {
      const url = siteUrlsByFeed.get(feed.id);
      if (!url) {
        return null;
      }

      return {
        id: `official_site_${feed.id}`,
        title: feed.title,
        url,
        feedId: feed.id,
        feedKind: feed.kind,
        feedUrl: feed.url,
        tags: ["公式サイト", "RSS", feed.title, feed.id]
      };
    })
    .filter((site): site is OfficialSite => site !== null);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
      "user-agent": "civic-koriyama-static-build/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`RSS feed returned ${response.status}: ${url}`);
  }

  return response.text();
}

function parseRssXml(xml: string, feed: RssFeed): NewsEntry[] {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/g))
    .slice(0, siteFeedEntryLimit)
    .map((match) => normalizeRssItem(match[0], feed))
    .filter((entry): entry is NewsEntry => entry !== null);
}

function normalizeRssItem(itemXml: string, feed: RssFeed): NewsEntry | null {
  const title = textFromXml(itemXml, "title");
  const link = textFromXml(itemXml, "link");
  if (!title || !link) {
    return null;
  }

  const rawPublishedAt = textFromXml(itemXml, "dc:date") ?? textFromXml(itemXml, "pubDate");
  const publishedAt = isoDate(rawPublishedAt);
  const sourceHash = hashHex(`${title}|${link}|${rawPublishedAt ?? ""}`);
  const subject = textFromXml(itemXml, "dc:subject");
  const tags = [subject, feed.title, feed.kind].filter((tag): tag is string => Boolean(tag));

  return {
    id: `rss_${sourceHash.slice(0, 16)}`,
    title,
    link,
    category: "other",
    categoryLabel: "その他",
    feedId: feed.id,
    feedIds: [feed.id],
    feedKinds: [feed.kind],
    canonicalUrl: link,
    publishedAt,
    fetchedAt: new Date().toISOString(),
    sourceHash,
    tags
  };
}

function mergeNewsEntries(entries: NewsEntry[], supplementalEntries: NewsEntry[]): NewsEntry[] {
  const seenIds = new Set(entries.map((entry) => entry.id));
  const seenLinkDates = new Set(entries.map(linkDateKey));
  const merged = [...entries];

  supplementalEntries.forEach((entry) => {
    const linkDate = linkDateKey(entry);
    if (seenIds.has(entry.id) || seenLinkDates.has(linkDate)) {
      return;
    }

    seenIds.add(entry.id);
    seenLinkDates.add(linkDate);
    merged.push(entry);
  });

  return merged;
}

function normalizeRssFeed(value: unknown): RssFeed | null {
  const record = isRecord(value) ? value : undefined;
  const id = toStringValue(record?.id);
  const kind = toStringValue(record?.kind);
  const title = toStringValue(record?.title);
  const url = toStringValue(record?.url);

  return id && kind && title && url ? { id, kind, title, url } : null;
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
  const candidates = news
    .filter((entry) => {
      const publishedTimestamp = timestamp(entry.publishedAt);
      return publishedTimestamp !== undefined && publishedTimestamp >= cutoff;
    })
    .map((entry) => ({
      entry,
      score: featuredTopicScore(entry)
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      const publishedDelta = (timestamp(right.entry.publishedAt) ?? 0) - (timestamp(left.entry.publishedAt) ?? 0);
      return right.score - left.score || publishedDelta || left.entry.title.localeCompare(right.entry.title, "ja");
    })
    .filter(({ entry }) => {
      const key = normalizeTopicText(entry.title);
      if (seenTitles.has(key)) {
        return false;
      }
      seenTitles.add(key);
      return true;
    })
    .map(({ entry }) => entry);

  const selected: NewsEntry[] = [];
  const selectedCategories = new Set<string>();

  candidates.forEach((entry) => {
    if (selected.length >= featuredTopicLimit || selectedCategories.has(entry.category)) {
      return;
    }
    selected.push(entry);
    selectedCategories.add(entry.category);
  });

  candidates.forEach((entry) => {
    if (selected.length >= featuredTopicLimit || selected.some((selectedEntry) => selectedEntry.id === entry.id)) {
      return;
    }
    selected.push(entry);
  });

  return selected;
}

function featuredTopicScore(entry: NewsEntry): number {
  const text = normalizeTopicText([entry.title, entry.category, entry.categoryLabel, ...entry.tags].join(" "));
  if (routineTopicKeywords.some((keyword) => text.includes(normalizeTopicText(keyword)))) {
    return 0;
  }

  return (
    featuredTopicKeywords.reduce((score, keyword) => {
      return text.includes(normalizeTopicText(keyword)) ? score + 10 : score;
    }, 0) +
    featuredTopicPriorityKeywords.reduce((score, keyword) => {
      return text.includes(normalizeTopicText(keyword)) ? score + 25 : score;
    }, 0)
  );
}

function categoryCountsFromPlaces(places: Place[]): CategoryCount[] {
  const counts = new Map<string, number>();
  places.forEach((place) => {
    normalizedCategoryIdsForUi(place).forEach((id) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort(([, left], [, right]) => right - left)
    .map(([id, count]) => ({
      id,
      label: categoryLabel(id),
      count
    }));
}

function buildNewlyRegisteredPlaces(places: Place[]): Place[] {
  return [...places]
    .sort((left, right) => {
      const leftTime = timestamp(left.firstSeenAt) ?? timestamp(left.lastSeenAt) ?? 0;
      const rightTime = timestamp(right.firstSeenAt) ?? timestamp(right.lastSeenAt) ?? 0;
      return rightTime - leftTime || left.name.localeCompare(right.name, "ja");
    })
    .slice(0, homePlaceLimit);
}

function mergeDuplicatePlaces(places: Place[]): Place[] {
  const merged = new Map<string, Place>();

  places.forEach((place) => {
    const key = placeMergeKey(place);
    const existing = merged.get(key);

    if (!existing) {
      const categories = categoryIdsForPlace(place);
      merged.set(key, {
        ...place,
        categories,
        categoryLabels: categoryLabelsForIds(categories),
        categoryLabel: categoryLabelsForIds(categories).join("・") || place.categoryLabel
      });
      return;
    }

    const categories = categoryIdsForPlace(existing, place);
    const categoryLabels = categoryLabelsForIds(categories);

    merged.set(key, {
      ...existing,
      categoryLabel: categoryLabels.join("・") || existing.categoryLabel,
      categories,
      categoryLabels,
      address: existing.address ?? place.address,
      lat: existing.lat ?? place.lat,
      lng: existing.lng ?? place.lng,
      phone: existing.phone ?? place.phone,
      officialUrl: existing.officialUrl ?? place.officialUrl,
      sourceUrl: existing.sourceUrl ?? place.sourceUrl,
      firstSeenAt: earliestIso(existing.firstSeenAt, place.firstSeenAt),
      lastSeenAt: latestIso(existing.lastSeenAt, place.lastSeenAt),
      changedAt: latestIso(existing.changedAt, place.changedAt),
      attributes: mergeAttributes(existing.attributes, place.attributes)
    });
  });

  return Array.from(merged.values());
}

function placeMergeKey(place: Place): string {
  const name = normalizePlaceIdentity(place.name);
  const address = normalizePlaceIdentity(place.address);
  if (name && address) {
    return `name-address:${name}\u0000${address}`;
  }

  const coordinate = coordinateKey(place);
  if (name && coordinate) {
    return `name-coordinate:${name}\u0000${coordinate}`;
  }

  return `id:${place.id}`;
}

function normalizePlaceIdentity(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()（）\[\]［］,，、。.．・]/g, "");
}

function coordinateKey(place: Place): string | undefined {
  if (place.lat === undefined || place.lng === undefined) {
    return undefined;
  }

  return `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;
}

function categoryIdsForPlace(...places: Place[]): string[] {
  return uniqueStrings(
    places.flatMap((place) => [
      ...(place.categories ?? []),
      place.subcategory,
      place.category
    ])
  );
}

function normalizedCategoryIdsForUi(place: Place): string[] {
  return uniqueStrings(categoryIdsForPlace(place).map(normalizePlaceCategoryId));
}

function normalizePlaceCategoryId(value: string): string {
  if (value === "safety") {
    return "aed";
  }
  if (value === "medical_institutions") {
    return "medical";
  }
  if (value === "schools") {
    return "education";
  }
  if (value === "childcare_facilities") {
    return "childcare";
  }
  if (value === "public_facilities") {
    return "facility";
  }
  if (value === "toilets") {
    return "public_toilets";
  }
  if (value === "wifi") {
    return "public_wifi";
  }

  return value;
}

function categoryLabelsForIds(ids: string[]): string[] {
  const normalizedIds = uniqueStrings(ids.map(normalizePlaceCategoryId)).sort((left, right) => {
    const leftIndex = displayCategoryOrder.indexOf(left);
    const rightIndex = displayCategoryOrder.indexOf(right);
    const normalizedLeftIndex = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
    const normalizedRightIndex = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;

    return normalizedLeftIndex - normalizedRightIndex || left.localeCompare(right, "ja");
  });

  return uniqueStrings(normalizedIds.map(categoryLabel));
}

function earliestIso(left: string | undefined, right: string | undefined): string | undefined {
  return compareIso(left, right, "earliest");
}

function latestIso(left: string | undefined, right: string | undefined): string | undefined {
  return compareIso(left, right, "latest");
}

function compareIso(
  left: string | undefined,
  right: string | undefined,
  direction: "earliest" | "latest"
): string | undefined {
  const leftTime = timestamp(left);
  const rightTime = timestamp(right);

  if (leftTime === undefined) {
    return right;
  }
  if (rightTime === undefined) {
    return left;
  }

  return direction === "earliest"
    ? leftTime <= rightTime ? left : right
    : leftTime >= rightTime ? left : right;
}

function mergeAttributes(
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!left && !right) {
    return undefined;
  }

  return {
    ...(left ?? {}),
    ...(right ?? {})
  };
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
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

function isoDate(value: string | undefined): string | undefined {
  const parsed = timestamp(value);
  return parsed !== undefined ? new Date(parsed).toISOString() : undefined;
}

function linkDateKey(entry: NewsEntry): string {
  return `${entry.link}\u0000${entry.publishedAt ?? ""}`;
}

function siteRootFromUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/site\/[^/]+\//);
    if (!match) {
      return undefined;
    }

    return `${url.origin}${match[0]}`;
  } catch {
    return undefined;
  }
}

function normalizeTopicText(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function textFromXml(xml: string, tagName: string): string | undefined {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escapedTagName}[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`, "i"));
  return match ? decodeXmlText(match[1]) : undefined;
}

function decodeXmlText(value: string): string | undefined {
  const text = value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
      const normalized = entity.toLowerCase();
      if (normalized === "amp") {
        return "&";
      }
      if (normalized === "lt") {
        return "<";
      }
      if (normalized === "gt") {
        return ">";
      }
      if (normalized === "quot") {
        return "\"";
      }
      if (normalized === "apos") {
        return "'";
      }
      if (normalized.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
      }
      if (normalized.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
      }
      return _;
    })
    .trim();

  return text || undefined;
}

function hashHex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
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
