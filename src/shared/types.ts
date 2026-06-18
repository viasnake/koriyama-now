export type Place = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  subcategory?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  officialUrl?: string;
  sourceUrl?: string;
  lastSeenAt?: string;
  firstSeenAt?: string;
  attributes?: Record<string, unknown>;
};

export type ChangeSummary = {
  id: string;
  label: string;
  changedAt: string;
  placeName?: string;
  placeId?: string;
  address?: string;
};

export type NewsEntry = {
  id: string;
  title: string;
  link: string;
  category: string;
  categoryLabel: string;
  publishedAt?: string;
  tags: string[];
  kind?: "news" | "change";
  placeId?: string;
  address?: string;
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
};

export type HomeData = {
  generated_at: string;
  health: HealthSummary;
  today_updates: string[];
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
};

export type SearchIndexItem = {
  id: string;
  type: "place" | "news";
  name: string;
  category: string;
  categoryLabel: string;
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
  source: "koriyama-open-data-hub";
  api_base: string;
  mode: "scheduled-static-build";
  status: "ok" | "stale";
  warnings: string[];
};

export type FeatureProperties = {
  name?: string;
  dataset_id?: string;
  category?: string;
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
