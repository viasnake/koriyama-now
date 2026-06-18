import { useQuery } from "@tanstack/react-query";
import type {
  BuildMeta,
  FeatureCollection,
  HomeData,
  NewsListData,
  PlaceListData,
  SearchIndexData
} from "../../shared/types";

export class StaticDataError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaticDataError";
    this.status = status;
  }
}

export async function getGeneratedJson<T>(path: `/generated/${string}`): Promise<T> {
  const response = await fetch(path, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new StaticDataError("生成済みデータを取得できませんでした。", response.status);
  }

  return response.json() as Promise<T>;
}

export function useBuildMeta() {
  return useQuery({
    queryKey: ["generated", "build-meta"],
    queryFn: () => getGeneratedJson<BuildMeta>("/generated/build-meta.json"),
    staleTime: 5 * 60_000
  });
}

export const generatedFiles = {
  home: "/generated/home.json",
  news: "/generated/news.json",
  places: "/generated/places.json",
  geojson: "/generated/places.geojson",
  searchIndex: "/generated/search-index.json"
} satisfies {
  home: `/generated/${string}`;
  news: `/generated/${string}`;
  places: `/generated/${string}`;
  geojson: `/generated/${string}`;
  searchIndex: `/generated/${string}`;
};

export type GeneratedDataMap = {
  home: HomeData;
  news: NewsListData;
  places: PlaceListData;
  geojson: FeatureCollection & { generated_at: string };
  searchIndex: SearchIndexData;
};
