import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import type { HomeData } from "../../shared/types";
import { OfficialSearchBox } from "../components/OfficialSiteSearch";
import { CardSkeleton, EmptyState, Section, SectionError } from "../components/Section";
import { NewsCard } from "../components/NewsCard";
import { PlaceCard } from "../components/PlaceCard";
import { SearchBox } from "../components/SearchBox";
import { searchSuggestions } from "../lib/constants";
import { searchConfig } from "../lib/searchConfig";
import { generatedFiles, getGeneratedJson } from "../lib/staticDataClient";

type HomeSearchMode = "local" | "official";

export default function Home() {
  const navigate = useNavigate();
  const hasOfficialSearch = searchConfig.programmableSearch.enabled;
  const [searchMode, setSearchMode] = useState<HomeSearchMode>("local");
  const homeQuery = useQuery({
    queryKey: ["home"],
    queryFn: () => getGeneratedJson<HomeData>(generatedFiles.home),
    staleTime: 5 * 60_000
  });

  const home = homeQuery.data;

  return (
    <div className="page">
      <header className="masthead">
        <p className="masthead__eyebrow">Koriyama civic data</p>
        <h1>こおりやまの今</h1>
        <p>郡山のお知らせと、身近な施設をまとめて見られます。</p>
        <div className="home-search-panel">
          {hasOfficialSearch ? (
            <div className="home-search-tabs" role="tablist" aria-label="検索の種類">
              <button
                type="button"
                role="tab"
                aria-selected={searchMode === "local"}
                className={`home-search-tab${searchMode === "local" ? " is-active" : ""}`}
                onClick={() => setSearchMode("local")}
              >
                サイト内を探す
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={searchMode === "official"}
                className={`home-search-tab${searchMode === "official" ? " is-active" : ""}`}
                onClick={() => setSearchMode("official")}
              >
                公式サイトを探す
              </button>
            </div>
          ) : null}
          {searchMode === "local" ? (
            <SearchBox onSearch={(query) => query && navigate(`/search?q=${encodeURIComponent(query)}`)} />
          ) : (
            <OfficialSearchBox cx={searchConfig.programmableSearch.cx} className="official-search-box--masthead" />
          )}
        </div>
        {searchMode === "local" ? (
          <div className="chip-row" aria-label="検索例">
            {searchSuggestions.slice(0, 4).map((suggestion) => (
              <button
                type="button"
                className="chip"
                key={suggestion}
                onClick={() => navigate(`/search?q=${encodeURIComponent(suggestion)}`)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <Section title="今日の更新">
        {homeQuery.isLoading ? <CardSkeleton /> : null}
        {homeQuery.isError ? <SectionError message="今日の更新を取得できませんでした。" /> : null}
        {home ? (
          <div className="today-list">
            {(home.today_updates.length > 0 ? home.today_updates : ["現在の更新状況を確認しています。"]).map((item) => (
              <div className="today-list__item" key={item}>
                <span />
                <p>{item}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <Section
        title="お知らせ"
        action={
          <Link to="/news" className="section-link">
            一覧
          </Link>
        }
      >
        {homeQuery.isLoading ? <CardSkeleton /> : null}
        {homeQuery.isError ? <SectionError message="お知らせを取得できませんでした。" /> : null}
        {home?.news.slice(0, 3).map((entry) => <NewsCard key={entry.id} entry={entry} />)}
      </Section>

      <Section title="施設カテゴリ">
        {home?.category_counts.length ? (
          <div className="category-grid">
            {home.category_counts.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                to={`/search?q=${encodeURIComponent(category.label)}`}
                className="category-card"
              >
                <span>{category.label}</span>
                <strong>{category.count.toLocaleString("ja-JP")}</strong>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="カテゴリを準備中">キーワード検索から施設を探せます。</EmptyState>
        )}
      </Section>

      <Section title="最近追加・更新された場所">
        {homeQuery.isLoading ? <CardSkeleton /> : null}
        {homeQuery.isError ? <SectionError message="施設情報を取得できませんでした。" /> : null}
        {home?.places.slice(0, 4).map((place) => <PlaceCard key={place.id} place={place} showMapLink={false} />)}
      </Section>
    </div>
  );
}
