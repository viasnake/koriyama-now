import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { NewsEntry } from "../../shared/types";
import { formatDateOnly } from "../lib/format";
import { HighlightedText } from "./HighlightedText";

type NewsCardProps = {
  entry: NewsEntry;
  className?: string;
  highlightQuery?: string;
};

export function NewsCard({ entry, className, highlightQuery }: NewsCardProps) {
  const isInternalLink = entry.link.startsWith("/");
  const title = <HighlightedText text={entry.title} query={highlightQuery} />;
  const titleLink = isInternalLink ? (
    <Link to={entry.link}>{title}</Link>
  ) : (
    <a href={entry.link} target="_blank" rel="noreferrer">
      {title}
      <span className="sr-only">（新しいタブで開きます）</span>
      <ExternalLink aria-hidden="true" size={15} />
    </a>
  );

  return (
    <article className={`news-card${className ? ` ${className}` : ""}`}>
      <div className="card-kicker">
        {entry.categoryLabel}
        {entry.publishedAt ? ` / ${formatDateOnly(entry.publishedAt)}` : ""}
      </div>
      <h3>{titleLink}</h3>
      {entry.tags.length > 0 ? (
        <div className="tag-row">
          {entry.tags.slice(0, 3).map((tag) => (
            <span key={tag}>
              <HighlightedText text={tag} query={highlightQuery} />
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
