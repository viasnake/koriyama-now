import { ExternalLink, MapPin, Phone, X } from "lucide-react";
import type { Place } from "../../shared/types";
import { formatDateOnly, googleMapsUrl } from "../lib/format";

type PlaceDetailSheetProps = {
  place?: Place;
  isLoading?: boolean;
  errorMessage?: string;
  onClose?: () => void;
};

export function PlaceDetailSheet({ place, isLoading = false, errorMessage, onClose }: PlaceDetailSheetProps) {
  if (isLoading) {
    return (
      <aside className="detail-sheet" aria-live="polite">
        <SheetTop onClose={onClose} />
        <p className="card-muted">詳細を読み込んでいます。</p>
      </aside>
    );
  }

  if (errorMessage) {
    return (
      <aside className="detail-sheet" aria-live="polite">
        <SheetTop onClose={onClose} />
        <p className="card-muted">{errorMessage}</p>
      </aside>
    );
  }

  if (!place) {
    return null;
  }

  const mapsUrl = googleMapsUrl(place);

  return (
    <aside className="detail-sheet">
      <SheetTop onClose={onClose} />
      <div className="card-kicker">{place.categoryLabel}</div>
      <h2>{place.name}</h2>
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
      <div className="sheet-actions">
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="primary-link">
            Google Mapsで見る
            <span className="sr-only">（新しいタブで開きます）</span>
            <ExternalLink aria-hidden="true" size={16} />
          </a>
        ) : null}
        {place.officialUrl ? (
          <a href={place.officialUrl} target="_blank" rel="noreferrer" className="text-link">
            公式ページ
            <span className="sr-only">（新しいタブで開きます）</span>
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        ) : null}
      </div>
      {place.lastSeenAt ? <p className="card-meta">データ取得日 {formatDateOnly(place.lastSeenAt)}</p> : null}
    </aside>
  );
}

function SheetTop({ onClose }: { onClose?: () => void }) {
  return (
    <div className="detail-sheet__top">
      <div className="sheet-handle" />
      {onClose ? (
        <button type="button" className="sheet-close" onClick={onClose} aria-label="閉じる">
          <X aria-hidden="true" size={18} />
        </button>
      ) : null}
    </div>
  );
}
