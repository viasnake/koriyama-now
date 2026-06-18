import { useEffect, useRef, useState } from "react";
import { PageLoader, SectionError } from "./Section";

type OfficialSearchBoxProps = {
  cx: string;
  className?: string;
  initialQuery?: string;
};

type OfficialSearchResultsProps = {
  cx: string;
  query: string;
};

type GoogleSearchElementInstance = {
  execute: (query: string) => void;
  prefillQuery?: (query: string) => void;
};

type GoogleSearchComponentConfig = {
  div: string | Element;
  tag: "searchbox-only" | "searchresults-only";
  gname: string;
  attributes?: Record<string, string>;
};

type GoogleSearchElementApi = {
  render: (componentConfig: GoogleSearchComponentConfig) => void;
  getElement: (gname: string) => GoogleSearchElementInstance | undefined;
};

declare global {
  interface Window {
    __gcse?: {
      parsetags?: "explicit" | "onload";
    };
    google?: {
      search?: {
        cse?: {
          element?: GoogleSearchElementApi;
        };
      };
    };
  }
}

const scriptId = "google-programmable-search";
const queryParameterName = "official_q";
let searchScriptPromise: Promise<void> | undefined;
let elementCounter = 0;

export function OfficialSearchBox({ cx, className, initialQuery = "" }: OfficialSearchBoxProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef(nextElementName("official-box"));
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    loadSearchElement(cx)
      .then(() => {
        if (cancelled || !boxRef.current) {
          return;
        }

        boxRef.current.replaceChildren();
        renderSearchBox(boxRef.current, nameRef.current);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cx]);

  useEffect(() => {
    if (status !== "ready" || !initialQuery.trim()) {
      return;
    }

    window.setTimeout(() => {
      getSearchElementApi()?.getElement(nameRef.current)?.prefillQuery?.(initialQuery.trim());
    }, 0);
  }, [initialQuery, status]);

  return (
    <div className={`official-search-box ${className ?? ""}`.trim()}>
      {status === "error" ? <SectionError message="公式サイト検索を読み込めませんでした。" /> : null}
      {status === "loading" ? <PageLoader label="公式サイト検索を読み込み中" /> : null}
      <div ref={boxRef} hidden={status === "error"} />
    </div>
  );
}

export function OfficialSearchResults({ cx, query }: OfficialSearchResultsProps) {
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const resultsNameRef = useRef(nextElementName("official-results"));
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    loadSearchElement(cx)
      .then(() => {
        if (cancelled || !resultsRef.current) {
          return;
        }

        resultsRef.current.replaceChildren();
        renderSearchResults(resultsRef.current, resultsNameRef.current);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cx]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    window.setTimeout(() => {
      getSearchElementApi()?.getElement(resultsNameRef.current)?.execute(trimmedQuery);
    }, 0);
  }, [query, status]);

  return (
    <div className="official-search-results">
      {status === "error" ? (
        <SectionError message="公式サイト検索を読み込めませんでした。時間をおいて再度お試しください。" />
      ) : null}
      {status === "loading" ? <PageLoader label="公式サイト検索を読み込み中" /> : null}
      <div ref={resultsRef} className="official-search-results__body" aria-label="公式サイト検索結果" hidden={status === "error"} />
    </div>
  );
}

function renderSearchBox(container: Element, gname: string) {
  getSearchElementApi()?.render({
    div: container,
    tag: "searchbox-only",
    gname,
    attributes: {
      resultsUrl: `${window.location.origin}/search`,
      queryParameterName,
      mobileLayout: "disabled"
    }
  });
}

function renderSearchResults(container: Element, gname: string) {
  getSearchElementApi()?.render({
    div: container,
    tag: "searchresults-only",
    gname,
    attributes: {
      queryParameterName,
      autoSearchOnLoad: "true",
      mobileLayout: "disabled"
    }
  });
}

function loadSearchElement(cx: string): Promise<void> {
  if (getSearchElementApi()) {
    return Promise.resolve();
  }

  if (searchScriptPromise) {
    return searchScriptPromise;
  }

  window.__gcse = {
    ...window.__gcse,
    parsetags: "explicit"
  };

  searchScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    const handleReady = () => {
      waitForSearchElement().then(resolve).catch(reject);
    };

    script.addEventListener("load", handleReady, { once: true });
    script.addEventListener("error", () => reject(new Error("Official site search failed to load.")), {
      once: true
    });

    if (!existingScript) {
      script.id = scriptId;
      script.async = true;
      script.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(cx)}`;
      document.head.append(script);
    }
  });

  return searchScriptPromise;
}

function waitForSearchElement(): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tick = () => {
      if (getSearchElementApi()) {
        resolve();
        return;
      }

      attempts += 1;
      if (attempts > 80) {
        reject(new Error("Official site search was not ready."));
        return;
      }

      window.setTimeout(tick, 100);
    };

    tick();
  });
}

function getSearchElementApi(): GoogleSearchElementApi | undefined {
  return window.google?.search?.cse?.element;
}

function nextElementName(prefix: string): string {
  elementCounter += 1;
  return `koriyama-${prefix}-${elementCounter}`;
}
