import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { NewsEntry, NewsListData } from "../../shared/types";
import { NewsCard } from "../components/NewsCard";
import { CardSkeleton, Section, SectionError } from "../components/Section";
import { newsCategories } from "../lib/constants";
import { formatDateOnly } from "../lib/format";
import { generatedFiles, getGeneratedJson } from "../lib/staticDataClient";

const newsPageSize = 24;

export default function News() {
  const [params, setParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(newsPageSize);
  const requestedCategory = params.get("category") ?? "all";
  const category = newsCategories.some((item) => item.id === requestedCategory) ? requestedCategory : "all";
  const categoryLabel = newsCategories.find((item) => item.id === category)?.label ?? "すべて";
  const newsQuery = useQuery({
    queryKey: ["news"],
    queryFn: () => getGeneratedJson<NewsListData>(generatedFiles.news)
  });
  const entries = filterNews(newsQuery.data?.entries ?? [], category);
  const visibleEntries = entries.slice(0, visibleCount);
  const groups = useMemo(() => groupNewsByDate(visibleEntries), [visibleEntries]);
  const sectionTitle =
    category === "all"
      ? `すべてのお知らせ ${entries.length.toLocaleString("ja-JP")}件`
      : `${categoryLabel}のお知らせ ${entries.length.toLocaleString("ja-JP")}件`;

  useEffect(() => {
    setVisibleCount(newsPageSize);
  }, [category]);

  return (
    <div className="page">
      <header className="compact-head">
        <h1>お知らせ</h1>
        <p>市のお知らせをカテゴリ別に見られます。</p>
      </header>

      <div className="news-category-scroll">
        <div className="tab-row news-category-tabs" role="group" aria-label="お知らせカテゴリ">
          {newsCategories.map((item) => (
            <button
              type="button"
              aria-pressed={category === item.id}
              className={`tab${category === item.id ? " is-active" : ""}`}
              key={item.id}
              onClick={() => setParams(item.id === "all" ? {} : { category: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Section
        title={sectionTitle}
        action={
          <a className="section-link" href="https://www.city.koriyama.lg.jp/" target="_blank" rel="noreferrer">
            公式サイト
            <span className="sr-only">（新しいタブで開きます）</span>
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        }
      >
        {newsQuery.isLoading ? <CardSkeleton /> : null}
        {newsQuery.isError ? <SectionError message="お知らせを取得できませんでした。" /> : null}
        {groups.map((group) => (
          <section className="news-date-group" key={group.label} aria-labelledby={`news-date-${group.id}`}>
            <h3 id={`news-date-${group.id}`}>{group.label}</h3>
            <div className="news-date-group__items">
              {group.entries.map((entry) => (
                <NewsCard key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        ))}
        {visibleCount < entries.length ? (
          <button
            type="button"
            className="load-more-button"
            onClick={() => setVisibleCount((count) => count + newsPageSize)}
          >
            さらに表示
          </button>
        ) : null}
      </Section>
    </div>
  );
}

function filterNews(entries: NewsEntry[], category: string): NewsEntry[] {
  if (category === "all") {
    return entries;
  }

  return entries.filter((entry) => entry.category === category);
}

type NewsDateGroup = {
  id: string;
  label: string;
  entries: NewsEntry[];
};

function groupNewsByDate(entries: NewsEntry[]): NewsDateGroup[] {
  const groups = new Map<string, NewsDateGroup>();

  entries.forEach((entry) => {
    const id = entry.publishedAt ? entry.publishedAt.slice(0, 10) : "unknown";
    const label = entry.publishedAt ? formatDateOnly(entry.publishedAt) : "日付未設定";
    const group = groups.get(id) ?? {
      id,
      label,
      entries: []
    };

    group.entries.push(entry);
    groups.set(id, group);
  });

  return Array.from(groups.values());
}
