import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { SearchIndexData, SearchIndexItem } from "../../shared/types";
import { OfficialSearchBox, OfficialSearchResults } from "../components/OfficialSiteSearch";
import { CardSkeleton, EmptyState, Section, SectionError } from "../components/Section";
import { SearchResultCard } from "../components/SearchResultCard";
import { SearchBox } from "../components/SearchBox";
import { placeCategories, searchSuggestions } from "../lib/constants";
import { searchLocalItems } from "../lib/localSearch";
import { searchConfig } from "../lib/searchConfig";
import { generatedFiles, getGeneratedJson } from "../lib/staticDataClient";

type SearchMode = "local" | "official";

export default function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hasOfficialSearch = searchConfig.programmableSearch.enabled;
  const mode = resolveSearchMode(params, hasOfficialSearch);
  const query = mode === "official" ? (params.get("official_q") ?? params.get("q") ?? "") : (params.get("q") ?? "");
  const searchQuery = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      const index = await getGeneratedJson<SearchIndexData>(generatedFiles.searchIndex);
      return searchLocalItems(query, index.items).slice(0, 40);
    },
    enabled: mode === "local" && query.length > 0
  });
  const toSearchPath = (nextMode: SearchMode, nextQuery = query) => buildSearchPath(nextMode, nextQuery);

  return (
    <div className="page page--search">
      <header className="compact-head">
        <h1>探す</h1>
        <p>
          {hasOfficialSearch
            ? "施設やお知らせをこのサイト内から探せます。市のページを探すときは、公式サイト検索を使えます。"
            : "AED、トイレ、Wi-Fiなどの施設やお知らせを、このサイト内から探せます。"}
        </p>
      </header>

      {hasOfficialSearch ? (
        <div className="search-mode-tabs" role="tablist" aria-label="検索の種類">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "local"}
            className={`search-mode-tab${mode === "local" ? " is-active" : ""}`}
            onClick={() => navigate(toSearchPath("local"))}
          >
            サイト内を探す
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "official"}
            className={`search-mode-tab${mode === "official" ? " is-active" : ""}`}
            onClick={() => navigate(toSearchPath("official"))}
          >
            公式サイトを探す
          </button>
        </div>
      ) : null}

      {mode === "local" ? (
        <LocalSearchPanel
          query={query}
          isLoading={searchQuery.isLoading}
          isError={searchQuery.isError}
          results={searchQuery.data}
          onSearch={(nextQuery) => navigate(buildSearchPath("local", nextQuery))}
        />
      ) : (
        <OfficialSearchPanel query={query} cx={searchConfig.programmableSearch.cx} />
      )}
    </div>
  );
}

function LocalSearchPanel({
  query,
  isLoading,
  isError,
  results,
  onSearch
}: {
  query: string;
  isLoading: boolean;
  isError: boolean;
  results?: SearchIndexItem[];
  onSearch: (query: string) => void;
}) {
  const navigate = useNavigate();
  const hasPlaceResults = Boolean(results?.some((item) => item.type === "place"));

  return (
    <div className="search-panel">
      <SearchBox defaultValue={query} onSearch={onSearch} />

      <div className="chip-row" aria-label="検索候補">
        {searchSuggestions.map((suggestion) => (
          <button
            type="button"
            className="chip"
            key={suggestion}
            onClick={() => navigate(buildSearchPath("local", suggestion))}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <Section
        title={query ? `「${query}」の結果` : "検索結果"}
        action={
          query && (isLoading || hasPlaceResults) ? (
            <Link to={`/map?q=${encodeURIComponent(query)}`} className="section-link">
              地図で見る
            </Link>
          ) : null
        }
      >
        {query && isLoading ? <CardSkeleton /> : null}
        {isError ? <SectionError message="検索結果を取得できませんでした。" /> : null}
        {!query ? <CategoryPrompt /> : null}
        {query && results?.length === 0 ? <ZeroResults /> : null}
        {results?.map((item) => (
          <div key={`${item.type}:${item.id}`}>
            <SearchResultCard item={item} />
          </div>
        ))}
      </Section>

      {query && hasPlaceResults ? (
        <Link to={`/map?q=${encodeURIComponent(query)}`} className="map-cta map-cta--small">
          <span>
            <MapIcon aria-hidden="true" size={20} />
            地図で見る
          </span>
        </Link>
      ) : null}
    </div>
  );
}

function OfficialSearchPanel({ query, cx }: { query: string; cx: string }) {
  return (
    <div className="search-panel">
      <Section title="公式サイトを探す">
        <OfficialSearchBox cx={cx} initialQuery={query} className="official-search-box--page" />
      </Section>
      <Section title={query ? `「${query}」の結果` : "検索結果"}>
        {query ? <OfficialSearchResults cx={cx} query={query} /> : <OfficialSearchPrompt />}
      </Section>
    </div>
  );
}

function resolveSearchMode(params: URLSearchParams, hasOfficialSearch: boolean): SearchMode {
  if (params.get("mode") === "official" && hasOfficialSearch) {
    return "official";
  }

  if (hasOfficialSearch && params.has("official_q")) {
    return "official";
  }

  return "local";
}

function buildSearchPath(mode: SearchMode, query: string): string {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (mode === "official" && trimmedQuery) {
    params.set("official_q", trimmedQuery);
  } else if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }
  if (mode === "official" && !trimmedQuery) {
    params.set("mode", "official");
  }

  const search = params.toString();
  return search ? `/search?${search}` : "/search";
}

function CategoryPrompt() {
  return (
    <div className="category-grid">
      {placeCategories.slice(1).map((category) => (
        <Link key={category.id} to={`/search?q=${encodeURIComponent(category.label)}`} className="category-card">
          <span>{category.label}</span>
        </Link>
      ))}
    </div>
  );
}

function ZeroResults() {
  return (
    <EmptyState title="見つかりませんでした">
      言葉を短くするか、「AED」「トイレ」「子育て」などで探してみてください。
    </EmptyState>
  );
}

function OfficialSearchPrompt() {
  return (
    <EmptyState title="検索語を入力してください">
      手続きや制度名など、公式サイトで確認したい言葉を入力してください。
    </EmptyState>
  );
}
