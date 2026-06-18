import { ExternalLink, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import type { Place } from "../../shared/types";
import { formatDateOnly, googleMapsUrl } from "../lib/format";

export function PlaceCard({ place, showMapLink = true }: { place: Place; showMapLink?: boolean }) {
  const mapsUrl = googleMapsUrl(place);

  return (
    <article className="place-card">
      <div className="card-kicker">{place.categoryLabel}</div>
      <h3>
        <Link to={`/place/${encodeURIComponent(place.id)}`}>{place.name}</Link>
      </h3>
      {place.address ? (
        <p className="card-line">
          <MapPin aria-hidden="true" size={16} />
          {place.address}
        </p>
      ) : null}
      {place.phone ? (
        <p className="card-line">
          <Phone aria-hidden="true" size={16} />
          <a href={`tel:${place.phone}`}>{place.phone}</a>
        </p>
      ) : null}
      <div className="card-actions">
        <Link to={`/place/${encodeURIComponent(place.id)}`} className="text-link">
          詳細を見る
        </Link>
        {showMapLink && mapsUrl ? (
          <a className="text-link" href={mapsUrl} target="_blank" rel="noreferrer">
            Google Mapsで見る
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        ) : null}
      </div>
      {place.lastSeenAt ? <p className="card-meta">データ確認日 {formatDateOnly(place.lastSeenAt)}</p> : null}
    </article>
  );
}
