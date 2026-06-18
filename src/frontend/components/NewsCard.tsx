import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { NewsEntry } from "../../shared/types";
import { formatDateOnly } from "../lib/format";

export function NewsCard({ entry }: { entry: NewsEntry }) {
  const isInternalLink = entry.link.startsWith("/");
  const titleLink = isInternalLink ? (
    <Link to={entry.link}>{entry.title}</Link>
  ) : (
    <a href={entry.link} target="_blank" rel="noreferrer">
      {entry.title}
      <ExternalLink aria-hidden="true" size={15} />
    </a>
  );

  return (
    <article className="news-card">
      <div className="card-kicker">
        {entry.categoryLabel}
        {entry.publishedAt ? ` / ${formatDateOnly(entry.publishedAt)}` : ""}
      </div>
      <h3>{titleLink}</h3>
      {entry.tags.length > 0 ? (
        <div className="tag-row">
          {entry.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
