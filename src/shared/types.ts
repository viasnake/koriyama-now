export type Place = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  categories?: string[];
  categoryLabels?: string[];
  subcategory?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  officialUrl?: string;
  sourceUrl?: string;
  lastSeenAt?: string;
  firstSeenAt?: string;
  changedAt?: string;
  attributes?: Record<string, unknown>;
};

export type NewsEntry = {
  id: string;
  title: string;
  link: string;
  category: string;
  categoryLabel: string;
  feedId?: string;
  feedIds?: string[];
  feedKinds?: string[];
  canonicalUrl?: string;
  publishedAt?: string;
  fetchedAt?: string;
  sourceHash?: string;
  tags: string[];
};

export type OfficialSite = {
  id: string;
  title: string;
  url: string;
  feedId?: string;
  feedKind?: string;
  feedUrl?: string;
  tags: string[];
};

export type CategoryCount = {
  id: string;
  label: string;
  count: number;
};

export type HealthSummary = {
  status: "ok" | "degraded";
  datasetsTotal?: number;
  placesCount?: number;
  lastSuccessAt?: string;
  rssLastSuccessAt?: string;
  rssEntriesCount?: number;
};

export type HomeData = {
  generated_at: string;
  health: HealthSummary;
  featured_topics: NewsEntry[];
  news: NewsEntry[];
  places: Place[];
  category_counts: CategoryCount[];
};

export type PlaceListData = {
  generated_at: string;
  places: Place[];
  count: number;
};

export type NewsListData = {
  generated_at: string;
  entries: NewsEntry[];
  official_sites?: OfficialSite[];
};

export type SearchIndexItem = {
  id: string;
  type: "place" | "news";
  name: string;
  category: string;
  categoryLabel: string;
  categories?: string[];
  address?: string;
  url?: string;
  publishedAt?: string;
  tags?: string[];
  keywords: string;
};

export type SearchIndexData = {
  generated_at: string;
  items: SearchIndexItem[];
};

export type BuildMeta = {
  generated_at: string;
  source: "civic-koriyama-data";
  api_base: string;
  mode: "scheduled-static-build";
  status: "ok" | "stale";
  warnings: string[];
};

export type FeatureProperties = {
  name?: string;
  dataset_id?: string;
  category?: string;
  categories?: string[];
  source_name?: string;
  unofficial?: boolean;
};

export type PointFeature = {
  type: "Feature";
  id?: string | number;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: FeatureProperties;
};

export type FeatureCollection = {
  type: "FeatureCollection";
  features: PointFeature[];
};
