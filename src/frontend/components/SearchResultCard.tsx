import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { NewsEntry, SearchIndexItem } from "../../shared/types";
import { NewsCard } from "./NewsCard";

type SearchResultCardProps = {
  item: SearchIndexItem;
};

export function SearchResultCard({ item }: SearchResultCardProps) {
  if (item.type === "news") {
    return <NewsCard entry={toNewsEntry(item)} />;
  }

  return (
    <article className="place-card">
      <div className="card-kicker">施設 / {item.categoryLabel}</div>
      <h3>
        <Link to={`/place/${encodeURIComponent(item.id)}`}>{item.name}</Link>
      </h3>
      {item.address ? (
        <p className="card-line">
          <MapPin aria-hidden="true" size={16} />
          {item.address}
        </p>
      ) : null}
      <div className="card-actions">
        <Link to={`/place/${encodeURIComponent(item.id)}`} className="text-link">
          詳細を見る
        </Link>
      </div>
    </article>
  );
}

function toNewsEntry(item: SearchIndexItem): NewsEntry {
  return {
    id: item.id,
    title: item.name,
    link: item.url ?? "/news",
    category: item.category,
    categoryLabel: item.categoryLabel,
    publishedAt: item.publishedAt,
    tags: item.tags ?? []
  };
}
