import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { PlaceListData } from "../../shared/types";
import { CardSkeleton, Section, SectionError } from "../components/Section";
import { formatDateOnly, googleMapsUrl } from "../lib/format";
import { generatedFiles, getGeneratedJson } from "../lib/staticDataClient";

const PlaceMap = lazy(() => import("../components/PlaceMap"));

export default function Place() {
  const params = useParams();
  const id = params.id ?? "";
  const placeQuery = useQuery({
    queryKey: ["place", id],
    queryFn: async () => {
      const placesData = await getGeneratedJson<PlaceListData>(generatedFiles.places);
      return placesData.places.find((item) => item.id === id);
    },
    enabled: Boolean(id)
  });
  const place = placeQuery.data;
  const mapsUrl = place ? googleMapsUrl(place) : undefined;
  const hasMap = place?.lat !== undefined && place?.lng !== undefined;

  return (
    <div className="page">
      <header className="compact-head">
        <Link to="/search" className="section-link">
          探すへ
        </Link>
        <h1>{place?.name ?? "地点詳細"}</h1>
        {place ? <p>{place.categoryLabel}</p> : null}
      </header>

      {placeQuery.isLoading ? <CardSkeleton /> : null}
      {placeQuery.isError ? <SectionError message="地点情報を取得できませんでした。" /> : null}

      {place ? (
        <Section title="基本情報">
          {place.address ? (
            <p className="card-line card-line--large">
              <MapPin aria-hidden="true" size={18} />
              {place.address}
            </p>
          ) : null}
          {place.phone ? (
            <p className="card-line card-line--large">
              <Phone aria-hidden="true" size={18} />
              <a href={`tel:${place.phone}`}>{place.phone}</a>
            </p>
          ) : null}
          <div className="sheet-actions">
            {mapsUrl ? (
              <a className="primary-link" href={mapsUrl} target="_blank" rel="noreferrer">
                Google Mapsで見る
                <ExternalLink aria-hidden="true" size={16} />
              </a>
            ) : null}
            {place.officialUrl ? (
              <a className="text-link" href={place.officialUrl} target="_blank" rel="noreferrer">
                公式ページ
                <ExternalLink aria-hidden="true" size={14} />
              </a>
            ) : null}
            {place.sourceUrl ? (
              <a className="text-link" href={place.sourceUrl} target="_blank" rel="noreferrer">
                出典
                <ExternalLink aria-hidden="true" size={14} />
              </a>
            ) : null}
          </div>
          {place.lastSeenAt ? <p className="card-meta">データ確認日 {formatDateOnly(place.lastSeenAt)}</p> : null}
        </Section>
      ) : null}

      {place && hasMap ? (
        <Section title="地図">
          <Suspense fallback={<CardSkeleton />}>
            <PlaceMap place={place} />
          </Suspense>
          <p className="notice-line">地図の位置は目安です。訪問前に公式情報を確認してください。</p>
        </Section>
      ) : null}
    </div>
  );
}
