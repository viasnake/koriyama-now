import { Fragment } from "react";

type HighlightedTextProps = {
  text: string;
  query?: string;
};

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const terms = highlightTerms(query);

  if (terms.length === 0) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern).filter((part) => part.length > 0);

  if (parts.length <= 1) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={`${part}:${index}`}>{isHighlightPart(part, terms) ? <mark>{part}</mark> : part}</Fragment>
      ))}
    </>
  );
}

function highlightTerms(query: string | undefined): string[] {
  if (!query) {
    return [];
  }

  return Array.from(
    new Set(
      query
        .normalize("NFKC")
        .trim()
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u30fc\u2212]/g, "-")
        .split(/\s+/)
        .filter(Boolean)
    )
  ).sort((left, right) => right.length - left.length);
}

function isHighlightPart(part: string, terms: string[]): boolean {
  const normalizedPart = part
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u30fc\u2212]/g, "-")
    .toLocaleLowerCase();

  return terms.some((term) => normalizedPart === term.toLocaleLowerCase());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
