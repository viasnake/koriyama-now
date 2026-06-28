import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon } from "lucide-react";
import { KeyboardEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { SearchIndexData, SearchIndexItem } from "../../shared/types";
import { OfficialSearchBox, OfficialSearchResults } from "../components/OfficialSiteSearch";
import { CardSkeleton, EmptyState, Section, SectionError } from "../components/Section";
import { SearchResultCard } from "../components/SearchResultCard";
import { SearchBox } from "../components/SearchBox";
import { placeCategories, searchSuggestions } from "../lib/constants";
import { type SearchResultType, searchLocalItems } from "../lib/localSearch";
import { searchConfig } from "../lib/searchConfig";
import { generatedFiles, getGeneratedJson } from "../lib/staticDataClient";

type SearchMode = "local" | "official";

type SearchResultsData = {
  items: SearchIndexItem[];
  total: number;
};

const searchResultLimit = 40;

const searchModes = [
  { id: "local", label: "サイト内を探す" },
  { id: "official", label: "公式サイトを探す" }
] as const;

const resultTypes = [
  { id: "all", label: "すべて" },
  { id: "place", label: "施設" },
  { id: "news", label: "お知らせ" }
] as const;

export default function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hasOfficialSearch = searchConfig.programmableSearch.enabled;
  const mode = resolveSearchMode(params, hasOfficialSearch);
  const query = mode === "official" ? (params.get("official_q") ?? params.get("q") ?? "") : (params.get("q") ?? "");
  const requestedType = resolveResultType(params.get("type"));
  const category = resolvePlaceCategory(params.get("category"));
  const resultType = category ? "place" : requestedType;
  const searchQuery = useQuery({
    queryKey: ["search", query, resultType, category],
    queryFn: async () => {
      const index = await getGeneratedJson<SearchIndexData>(generatedFiles.searchIndex);
      const results = searchLocalItems(query, index.items, {
        type: resultType,
        category: category ?? undefined
      });

      return {
        items: results.slice(0, searchResultLimit),
        total: results.length
      };
    },
    enabled: mode === "local" && (query.length > 0 || Boolean(category))
  });
  const toSearchPath = (nextMode: SearchMode, nextQuery = query) =>
    buildSearchPath(nextMode, nextQuery, { type: resultType, category });

  return (
    <div className="page page--search">
      <header className="compact-head">
        <h1>探す</h1>
        <p>
          {hasOfficialSearch
            ? "市の手続き、くらしのお知らせ、施設情報をこのサイト内から探せます。市のページを探すときは、公式サイト検索を使えます。"
            : "市の手続き、くらしのお知らせ、施設情報をこのサイト内から探せます。"}
        </p>
      </header>

      {hasOfficialSearch ? (
        <div className="search-mode-tabs" role="tablist" aria-label="検索の種類">
          {searchModes.map((item) => (
            <button
              type="button"
              role="tab"
              id={`search-mode-tab-${item.id}`}
              aria-selected={mode === item.id}
              aria-controls={`search-mode-panel-${item.id}`}
              tabIndex={mode === item.id ? 0 : -1}
              className={`search-mode-tab${mode === item.id ? " is-active" : ""}`}
              key={item.id}
              onClick={() => navigate(toSearchPath(item.id))}
              onKeyDown={(event) => handleSearchModeKeyDown(event, mode, toSearchPath, navigate)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "local" ? (
        <div
          role={hasOfficialSearch ? "tabpanel" : undefined}
          id="search-mode-panel-local"
          aria-labelledby={hasOfficialSearch ? "search-mode-tab-local" : undefined}
        >
          <LocalSearchPanel
            query={query}
            category={category}
            resultType={resultType}
            isLoading={searchQuery.isLoading}
            isError={searchQuery.isError}
            results={searchQuery.data}
            onSearch={(nextQuery) => navigate(buildSearchPath("local", nextQuery, { type: resultType, category }))}
          />
        </div>
      ) : (
        <div role="tabpanel" id="search-mode-panel-official" aria-labelledby="search-mode-tab-official">
          <OfficialSearchPanel query={query} cx={searchConfig.programmableSearch.cx} />
        </div>
      )}
    </div>
  );
}

function LocalSearchPanel({
  query,
  category,
  resultType,
  isLoading,
  isError,
  results,
  onSearch
}: {
  query: string;
  category: string | null;
  resultType: SearchResultType;
  isLoading: boolean;
  isError: boolean;
  results?: SearchResultsData;
  onSearch: (query: string) => void;
}) {
  const navigate = useNavigate();
  const items = results?.items ?? [];
  const hasPlaceResults = Boolean(items.some((item) => item.type === "place")) || Boolean(category);
  const categoryLabel = category ? placeCategories.find((item) => item.id === category)?.label : undefined;
  const title = resultSectionTitle(query, categoryLabel, results?.total);
  const mapPath = category ? `/map?category=${encodeURIComponent(category)}` : `/map?q=${encodeURIComponent(query)}`;

  return (
    <div className="search-panel">
      <SearchBox defaultValue={query} onSearch={onSearch} />

      {!category ? (
        <div className="search-filter-row" role="group" aria-label="検索結果の種類">
          {resultTypes.map((item) => (
            <button
              type="button"
              className={`tab${resultType === item.id ? " is-active" : ""}`}
              aria-pressed={resultType === item.id}
              key={item.id}
              onClick={() => navigate(buildSearchPath("local", query, { type: item.id, category: null }))}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="chip-row" aria-label="検索候補">
        {searchSuggestions.map((suggestion) => (
          <button
            type="button"
            className="chip"
            key={suggestion}
            onClick={() => navigate(buildSearchPath("local", suggestion, { type: resultType, category }))}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <Section
        title={title}
        action={
          (query || category) && (isLoading || hasPlaceResults) ? (
            <Link to={mapPath} className="section-link">
              地図で見る
            </Link>
          ) : null
        }
      >
        {(query || category) && isLoading ? <CardSkeleton /> : null}
        {isError ? <SectionError message="検索結果を取得できませんでした。" /> : null}
        {!query && !category ? <SearchPrompt /> : null}
        {(query || category) && results?.total === 0 ? <ZeroResults /> : null}
        {items.map((item) => (
          <div key={`${item.type}:${item.id}`}>
            <SearchResultCard item={item} highlightQuery={query} />
          </div>
        ))}
        {results && results.total > items.length ? (
          <p className="notice-line">関連度の高い{items.length.toLocaleString("ja-JP")}件を表示しています。</p>
        ) : null}
      </Section>

      {(query || category) && hasPlaceResults ? (
        <Link to={mapPath} className="map-cta map-cta--small">
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

function buildSearchPath(
  mode: SearchMode,
  query: string,
  filters: { type?: SearchResultType; category?: string | null } = {}
): string {
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
  if (mode === "local" && filters.type && filters.type !== "all") {
    params.set("type", filters.type);
  }
  if (mode === "local" && filters.category) {
    params.set("category", filters.category);
  }

  const search = params.toString();
  return search ? `/search?${search}` : "/search";
}

function resolveResultType(value: string | null): SearchResultType {
  return resultTypes.some((item) => item.id === value) ? (value as SearchResultType) : "all";
}

function resolvePlaceCategory(value: string | null): string | null {
  if (!value || value === "all") {
    return null;
  }

  return placeCategories.some((item) => item.id === value && item.id !== "all") ? value : null;
}

function resultSectionTitle(query: string, categoryLabel: string | undefined, total: number | undefined): string {
  const count = total === undefined ? "" : ` ${total.toLocaleString("ja-JP")}件`;

  if (categoryLabel) {
    return query ? `${categoryLabel}の「${query}」${count}` : `${categoryLabel}の施設${count}`;
  }

  return query ? `「${query}」の結果${count}` : "検索結果";
}

function handleSearchModeKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  currentMode: SearchMode,
  toSearchPath: (mode: SearchMode) => string,
  navigate: (path: string) => void
) {
  const currentIndex = searchModes.findIndex((item) => item.id === currentMode);
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
  navigate(toSearchPath(nextMode));
  requestAnimationFrame(() => {
    document.getElementById(`search-mode-tab-${nextMode}`)?.focus();
  });
}

function ZeroResults() {
  return (
    <EmptyState title="見つかりませんでした">
      言葉を短くするか、「ごみ」「防災」「イベント」などで探してみてください。
    </EmptyState>
  );
}

function SearchPrompt() {
  return (
    <EmptyState title="検索語を入力してください">
      手続き、くらしのお知らせ、施設名など、調べたい言葉を入力してください。
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
