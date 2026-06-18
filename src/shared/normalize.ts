import type {
  CategoryCount,
  ChangeSummary,
  FeatureCollection,
  HealthSummary,
  NewsEntry,
  Place,
  PointFeature
} from "./types";

const categoryLabels: Record<string, string> = {
  aed: "AED",
  childcare: "子育て",
  changes: "施設の更新",
  city_admin: "施設・行政",
  disaster: "防災",
  education: "学校",
  event: "イベント",
  facility: "公共施設",
  life: "くらし",
  medical: "医療",
  public_facilities: "公共施設",
  public_toilets: "トイレ",
  public_wifi: "Wi-Fi",
  safety: "安全",
  schools: "学校",
  toilets: "トイレ",
  wifi: "Wi-Fi"
};

const datasetLabels: Record<string, string> = {
  aed: "AED",
  childcare_facilities: "子育て",
  medical_institutions: "医療",
  public_facilities: "公共施設",
  public_toilets: "トイレ",
  public_wifi: "Wi-Fi",
  schools: "学校"
};

export function categoryLabel(id: string | undefined): string {
  if (!id) {
    return "その他";
  }

  return categoryLabels[id] ?? datasetLabels[id] ?? id;
}

export function normalizePlaces(value: unknown): Place[] {
  const list = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.places)
      ? value.places
      : [];

  return list.map(normalizePlace).filter((place): place is Place => place !== null);
}

export function normalizePlace(value: unknown): Place | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = toStringValue(record.id);
  const name = toStringValue(record.name);
  if (!id || !name) {
    return null;
  }

  const category = toStringValue(record.category) ?? toStringValue(record.dataset_id) ?? "other";
  const subcategory = toStringValue(record.subcategory);
  const datasetId = toStringValue(record.dataset_id);
  const attributes = normalizeAttributes(record.attributes ?? record.attributes_json);

  return {
    id,
    name,
    category,
    categoryLabel: categoryLabel(subcategory ?? datasetId ?? category),
    subcategory,
    address: toStringValue(record.address),
    lat: toNumberValue(record.lat),
    lng: toNumberValue(record.lng),
    phone: toStringValue(record.phone),
    officialUrl: toStringValue(record.official_url),
    sourceUrl: toStringValue(record.source_url),
    firstSeenAt: toStringValue(record.first_seen_at),
    lastSeenAt: toStringValue(record.last_seen_at),
    attributes
  };
}

export function normalizeChanges(value: unknown): ChangeSummary[] {
  const list = Array.isArray(value) ? value : [];
  return list.map(normalizeChange).filter((change): change is ChangeSummary => change !== null);
}

export function normalizeChange(value: unknown): ChangeSummary | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = toStringValue(record.id);
  const type = toStringValue(record.change_type) ?? "changed";
  const changedAt = toStringValue(record.changed_at);
  if (!id || !changedAt) {
    return null;
  }

  const place = normalizePlace(record.after ?? record.before);

  return {
    id,
    label: changeLabel(type),
    changedAt,
    placeName: place?.name,
    placeId: place?.id,
    address: place?.address
  };
}

export function normalizeNews(value: unknown): NewsEntry[] {
  const list = Array.isArray(value) ? value : [];
  return list.map(normalizeNewsEntry).filter((entry): entry is NewsEntry => entry !== null);
}

export function normalizeNewsEntry(value: unknown): NewsEntry | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = toStringValue(record.id);
  const title = toStringValue(record.title);
  const link = toStringValue(record.link);
  if (!id || !title || !link) {
    return null;
  }

  const category = toStringValue(record.category) ?? "life";
  const tags = Array.isArray(record.tags)
    ? record.tags.map(toStringValue).filter((tag): tag is string => Boolean(tag))
    : [];

  return {
    id,
    title,
    link,
    category,
    categoryLabel: categoryLabel(category),
    publishedAt: toStringValue(record.published_at),
    tags
  };
}

export function normalizeFeatureCollection(value: unknown): FeatureCollection {
  const record = asRecord(value);
  const features = record && Array.isArray(record.features) ? record.features : [];

  return {
    type: "FeatureCollection",
    features: features.map(normalizePointFeature).filter((feature): feature is PointFeature => feature !== null)
  };
}

export function placesToFeatureCollection(places: Place[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: places
      .filter((place) => place.lat !== undefined && place.lng !== undefined)
      .map((place) => ({
        type: "Feature",
        id: place.id,
        geometry: {
          type: "Point",
          coordinates: [place.lng as number, place.lat as number]
        },
        properties: {
          name: place.name,
          dataset_id: place.subcategory,
          category: place.subcategory ?? place.category,
          source_name: "郡山市オープンデータ",
          unofficial: true
        }
      }))
  };
}

export function normalizeHealth(value: unknown): HealthSummary {
  const record = asRecord(value);
  const datasets = asRecord(record?.datasets);
  const rss = asRecord(record?.rss);
  const failed = Array.isArray(datasets?.failed) ? datasets.failed.length : 0;

  return {
    status: failed > 0 ? "degraded" : "ok",
    datasetsTotal: toNumberValue(datasets?.total),
    placesCount: toNumberValue(datasets?.places_count),
    lastSuccessAt: toStringValue(datasets?.last_success_at),
    rssLastSuccessAt: toStringValue(rss?.last_success_at)
  };
}

export function categoryCountsFromHealth(value: unknown): CategoryCount[] {
  const record = asRecord(value);
  const datasets = asRecord(record?.datasets);
  const fetches = Array.isArray(datasets?.recent_fetches) ? datasets.recent_fetches : [];
  const latestBySource = new Map<string, number>();

  fetches.forEach((item) => {
    const source = asRecord(item);
    const id = toStringValue(source?.source_id);
    const count = toNumberValue(source?.records_count);
    if (id && count !== undefined && !latestBySource.has(id)) {
      latestBySource.set(id, count);
    }
  });

  return Array.from(latestBySource.entries())
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      id,
      label: categoryLabel(id),
      count
    }));
}

function normalizePointFeature(value: unknown): PointFeature | null {
  const record = asRecord(value);
  const geometry = asRecord(record?.geometry);
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  const lng = toNumberValue(coordinates[0]);
  const lat = toNumberValue(coordinates[1]);

  if (geometry?.type !== "Point" || lng === undefined || lat === undefined) {
    return null;
  }

  const properties = asRecord(record?.properties) ?? {};

  return {
    type: "Feature",
    id: toStringValue(record?.id),
    geometry: {
      type: "Point",
      coordinates: [lng, lat]
    },
    properties: {
      name: toStringValue(properties.name),
      dataset_id: toStringValue(properties.dataset_id),
      category: toStringValue(properties.category),
      source_name: toStringValue(properties.source_name),
      unofficial: typeof properties.unofficial === "boolean" ? properties.unofficial : undefined
    }
  };
}

function changeLabel(type: string): string {
  if (type.includes("created")) {
    return "新しい地点が追加されました";
  }

  if (type.includes("deleted")) {
    return "地点が削除されました";
  }

  if (type.includes("source")) {
    return "元データが更新されました";
  }

  return "施設情報が更新されました";
}

function normalizeAttributes(value: unknown): Record<string, unknown> | undefined {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
