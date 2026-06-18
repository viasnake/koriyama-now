import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FeatureCollection, PlaceListData } from "../../shared/types";
import MapCanvas from "../components/MapCanvas";
import { PlaceDetailSheet } from "../components/PlaceDetailSheet";
import { CardSkeleton, SectionError } from "../components/Section";
import { placeCategories, placeCategoryAliases } from "../lib/constants";
import { generatedFiles, getGeneratedJson } from "../lib/staticDataClient";

export default function MapPage() {
  const [params] = useSearchParams();
  const initialCategory = categoryFromQuery(params.get("q") ?? params.get("category") ?? "");
  const [category, setCategory] = useState(initialCategory);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const geoQuery = useQuery({
    queryKey: ["places.geojson"],
    queryFn: () => getGeneratedJson<FeatureCollection>(generatedFiles.geojson)
  });

  const placesQuery = useQuery({
    queryKey: ["places"],
    queryFn: () => getGeneratedJson<PlaceListData>(generatedFiles.places),
    enabled: Boolean(selectedId)
  });

  const selectedPlace = useMemo(() => {
    if (!selectedId) {
      return undefined;
    }

    return placesQuery.data?.places.find((place) => place.id === selectedId);
  }, [placesQuery.data, selectedId]);

  const filteredCount = useMemo(() => {
    if (!geoQuery.data) {
      return 0;
    }

    if (category === "all") {
      return geoQuery.data.features.length;
    }

    return geoQuery.data.features.filter((feature) => featureMatchesCategory(feature, category)).length;
  }, [category, geoQuery.data]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleCategorySelect = useCallback((nextCategory: string) => {
    setCategory(nextCategory);
    setSelectedId(undefined);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedId(undefined);
  }, []);

  return (
    <div className="page page--map">
      <header className="compact-head">
        <h1>地図</h1>
        <p>{filteredCount.toLocaleString("ja-JP")}件を表示しています。</p>
      </header>

      <div className="tab-row tab-row--sticky" role="tablist" aria-label="施設カテゴリ">
        {placeCategories.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={category === item.id}
            className={`tab${category === item.id ? " is-active" : ""}`}
            key={item.id}
            onClick={() => handleCategorySelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {geoQuery.isLoading ? <CardSkeleton /> : null}
      {geoQuery.isError ? <SectionError message="地図データを取得できませんでした。" /> : null}
      {geoQuery.data ? (
        <div className="map-stage">
          <MapCanvas
            collection={geoQuery.data}
            category={category}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
          <p className="map-stage__notice">地図の位置は目安です。訪問前に公式情報を確認してください。</p>
          {selectedId ? (
            <div className="map-detail-popover">
              <PlaceDetailSheet
                place={selectedPlace}
                isLoading={placesQuery.isLoading}
                errorMessage={placesQuery.isError ? "地点の詳細を取得できませんでした。" : undefined}
                onClose={handleCloseDetail}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function categoryFromQuery(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u30fc\u2212]/g, "-");

  return placeCategoryAliases[normalized] ?? "all";
}

function featureMatchesCategory(feature: FeatureCollection["features"][number], category: string): boolean {
  const values = [feature.properties.category, feature.properties.dataset_id].filter(
    (value): value is string => Boolean(value)
  );

  if (category === "aed") {
    return values.includes("aed") || values.includes("safety");
  }
  if (category === "public_wifi") {
    return values.includes("public_wifi") || values.includes("wifi");
  }
  if (category === "public_toilets") {
    return values.includes("public_toilets") || values.includes("toilets");
  }
  if (category === "medical") {
    return values.includes("medical") || values.includes("medical_institutions");
  }
  if (category === "education") {
    return values.includes("education") || values.includes("schools");
  }
  if (category === "childcare") {
    return values.includes("childcare") || values.includes("childcare_facilities");
  }
  if (category === "facility") {
    return values.includes("facility") || values.includes("public_facilities");
  }

  return values.includes(category);
}
