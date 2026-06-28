import { KeyboardEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import type { HomeData } from "../../shared/types";
import { OfficialSearchBox } from "../components/OfficialSiteSearch";
import { CardSkeleton, Section, SectionError } from "../components/Section";
import { NewsCard } from "../components/NewsCard";
import { PlaceCard } from "../components/PlaceCard";
import { SearchBox } from "../components/SearchBox";
import { searchSuggestions } from "../lib/constants";
import { searchConfig } from "../lib/searchConfig";
import { generatedFiles, getGeneratedJson } from "../lib/staticDataClient";

type HomeSearchMode = "local" | "official";

const searchModes = [
  { id: "local", label: "サイト内を探す" },
  { id: "official", label: "公式サイトを探す" }
] as const;

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
  const featuredTopicIds = new Set(home?.featured_topics.map((entry) => entry.id) ?? []);
  const latestNews = home?.news.filter((entry) => !featuredTopicIds.has(entry.id)).slice(0, 3) ?? [];

  return (
    <div className="page page--home">
      <header className="masthead">
        <div className="masthead__brand-row">
          <p className="masthead__eyebrow">Civic Koriyama</p>
          <span>非公式・市民運営</span>
        </div>
        <h1>郡山の施設・お知らせ</h1>
        <p>市の手続き、くらしのお知らせ、施設情報をまとめて探せます。</p>
        <div className="home-search-panel">
          {hasOfficialSearch ? (
            <div className="home-search-tabs" role="tablist" aria-label="検索の種類">
              {searchModes.map((mode) => (
                <button
                  type="button"
                  role="tab"
                  id={`home-search-tab-${mode.id}`}
                  aria-selected={searchMode === mode.id}
                  aria-controls={`home-search-panel-${mode.id}`}
                  tabIndex={searchMode === mode.id ? 0 : -1}
                  className={`home-search-tab${searchMode === mode.id ? " is-active" : ""}`}
                  key={mode.id}
                  onClick={() => setSearchMode(mode.id)}
                  onKeyDown={(event) => handleSearchModeKeyDown(event, searchMode, setSearchMode)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          ) : null}
          {searchMode === "local" ? (
            <div
              role={hasOfficialSearch ? "tabpanel" : undefined}
              id="home-search-panel-local"
              aria-labelledby={hasOfficialSearch ? "home-search-tab-local" : undefined}
            >
              <SearchBox onSearch={(query) => query && navigate(`/search?q=${encodeURIComponent(query)}`)} />
            </div>
          ) : (
            <div
              role="tabpanel"
              id="home-search-panel-official"
              aria-labelledby="home-search-tab-official"
            >
              <OfficialSearchBox cx={searchConfig.programmableSearch.cx} className="official-search-box--masthead" />
            </div>
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

      {homeQuery.isLoading ? (
        <Section title="重要なお知らせ" className="home-featured">
          <CardSkeleton />
        </Section>
      ) : null}
      {home?.featured_topics.length ? (
        <Section title="重要なお知らせ" className="home-featured">
          <div className="featured-topic-list">
            {home.featured_topics.map((entry, index) => (
              <NewsCard
                key={entry.id}
                entry={entry}
                className={index === 0 ? "news-card--featured-primary" : undefined}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        title="最新のお知らせ"
        className="home-news"
        action={
          <Link to="/news" className="section-link">
            一覧
          </Link>
        }
      >
        {homeQuery.isLoading ? <CardSkeleton /> : null}
        {homeQuery.isError ? <SectionError message="お知らせを取得できませんでした。" /> : null}
        {latestNews.map((entry) => <NewsCard key={entry.id} entry={entry} />)}
      </Section>

      <Section title="新しく登録された施設" className="home-places">
        {homeQuery.isLoading ? <CardSkeleton /> : null}
        {homeQuery.isError ? <SectionError message="施設情報を取得できませんでした。" /> : null}
        {home?.places.slice(0, 4).map((place) => <PlaceCard key={place.id} place={place} showMapLink={false} />)}
      </Section>
    </div>
  );
}

function handleSearchModeKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  currentMode: HomeSearchMode,
  setMode: (mode: HomeSearchMode) => void
) {
  const currentIndex = searchModes.findIndex((mode) => mode.id === currentMode);
  const lastIndex = searchModes.length - 1;
  let nextIndex: number | undefined;

  if (event.key === "ArrowRight") {
    nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
  } else if (event.key === "ArrowLeft") {
    nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = lastIndex;
  }

  if (nextIndex === undefined) {
    return;
  }

  event.preventDefault();
  const nextMode = searchModes[nextIndex].id;
  setMode(nextMode);
  requestAnimationFrame(() => {
    document.getElementById(`home-search-tab-${nextMode}`)?.focus();
  });
}
