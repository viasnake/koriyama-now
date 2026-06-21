import { ExternalLink, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import type { Place } from "../../shared/types";
import { googleMapsUrl } from "../lib/format";

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
        {showMapLink && mapsUrl ? (
          <a className="text-link" href={mapsUrl} target="_blank" rel="noreferrer">
            Google Mapsで見る
            <span className="sr-only">（新しいタブで開きます）</span>
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        ) : null}
      </div>
    </article>
  );
}
