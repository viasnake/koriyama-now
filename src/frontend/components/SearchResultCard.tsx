import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { NewsEntry, SearchIndexItem } from "../../shared/types";
import { HighlightedText } from "./HighlightedText";
import { NewsCard } from "./NewsCard";

type SearchResultCardProps = {
  item: SearchIndexItem;
  highlightQuery?: string;
};

export function SearchResultCard({ item, highlightQuery }: SearchResultCardProps) {
  if (item.type === "news") {
    return <NewsCard entry={toNewsEntry(item)} highlightQuery={highlightQuery} />;
  }

  return (
    <article className="place-card">
      <div className="card-kicker">施設 / {item.categoryLabel}</div>
      <h3>
        <Link to={`/place/${encodeURIComponent(item.id)}`}>
          <HighlightedText text={item.name} query={highlightQuery} />
        </Link>
      </h3>
      {item.address ? (
        <p className="card-line">
          <MapPin aria-hidden="true" size={16} />
          <HighlightedText text={item.address} query={highlightQuery} />
        </p>
      ) : null}
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
