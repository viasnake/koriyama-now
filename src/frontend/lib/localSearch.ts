import type { SearchIndexItem } from "../../shared/types";
import { placeCategoryAliases } from "./constants";

export function searchLocalItems(query: string, indexItems: SearchIndexItem[]): SearchIndexItem[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    return [];
  }

  const category = placeCategoryAliases[normalized];
  const terms = normalized.split(" ").filter(Boolean);

  return indexItems.filter((item) => {
    if (category) {
      return item.type === "place" && itemMatchesPlaceCategory(item, category);
    }

    return terms.every((term) => item.keywords.includes(term));
  });
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u30fc\u2212]/g, "-");
}

function itemMatchesPlaceCategory(item: SearchIndexItem, category: string): boolean {
  const values = [item.category].filter(Boolean);

  if (category === "aed") {
    return values.includes("aed") || values.includes("safety");
  }
  if (category === "public_wifi") {
    return values.includes("public_wifi") || values.includes("wifi");
  }
  if (category === "public_toilets") {
    return values.includes("public_toilets") || values.includes("toilets");
  }
  if (category === "medical") {
    return values.includes("medical") || values.includes("medical_institutions");
  }
  if (category === "education") {
    return values.includes("education") || values.includes("schools");
  }
  if (category === "childcare") {
    return values.includes("childcare") || values.includes("childcare_facilities");
  }
  if (category === "facility") {
    return values.includes("facility") || values.includes("public_facilities");
  }

  return values.includes(category);
}
