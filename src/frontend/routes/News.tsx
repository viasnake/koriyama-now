import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { NewsEntry, NewsListData } from "../../shared/types";
import { NewsCard } from "../components/NewsCard";
import { CardSkeleton, Section, SectionError } from "../components/Section";
import { newsCategories } from "../lib/constants";
import { generatedFiles, getGeneratedJson } from "../lib/staticDataClient";

export default function News() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "all";
  const newsQuery = useQuery({
    queryKey: ["news"],
    queryFn: () => getGeneratedJson<NewsListData>(generatedFiles.news)
  });
  const entries = filterNews(newsQuery.data?.entries ?? [], category);

  return (
    <div className="page">
      <header className="compact-head">
        <h1>お知らせ</h1>
        <p>市のお知らせと施設情報の更新を、カテゴリ別に見られます。</p>
      </header>

      <div className="news-category-scroll">
        <div className="tab-row news-category-tabs" role="tablist" aria-label="お知らせカテゴリ">
          {newsCategories.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={category === item.id}
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
        title="お知らせ"
        action={
          <a className="section-link" href="https://www.city.koriyama.lg.jp/" target="_blank" rel="noreferrer">
            公式サイト
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        }
      >
        {newsQuery.isLoading ? <CardSkeleton /> : null}
        {newsQuery.isError ? <SectionError message="お知らせを取得できませんでした。" /> : null}
        {entries.map((entry) => (
          <div key={entry.id}>
            <NewsCard entry={entry} />
          </div>
        ))}
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
