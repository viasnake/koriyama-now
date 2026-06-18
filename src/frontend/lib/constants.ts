export const searchSuggestions = ["保育", "AED", "Wi-Fi", "トイレ", "図書館", "学校", "医療", "駅前"];

export const placeCategories = [
  { id: "all", label: "すべて" },
  { id: "facility", label: "公共施設" },
  { id: "childcare", label: "子育て" },
  { id: "aed", label: "AED" },
  { id: "medical", label: "医療" },
  { id: "education", label: "学校" },
  { id: "public_wifi", label: "Wi-Fi" },
  { id: "public_toilets", label: "トイレ" }
] as const;

export const placeCategoryAliases: Record<string, string> = {
  aed: "aed",
  "ａｅｄ": "aed",
  "wi-fi": "public_wifi",
  wifi: "public_wifi",
  "wi fi": "public_wifi",
  "ｗｉ-ｆｉ": "public_wifi",
  "ｗｉｆｉ": "public_wifi",
  "トイレ": "public_toilets",
  "といれ": "public_toilets",
  "公衆トイレ": "public_toilets",
  "子育て": "childcare",
  "保育": "childcare",
  "保育園": "childcare",
  "医療": "medical",
  "病院": "medical",
  "学校": "education",
  "小学校": "education",
  "中学校": "education",
  "公共施設": "facility",
  "施設": "facility"
};

export const newsCategories = [
  { id: "all", label: "すべて" },
  { id: "changes", label: "施設の更新" },
  { id: "life", label: "くらし" },
  { id: "event", label: "イベント" },
  { id: "childcare", label: "子育て" },
  { id: "city_admin", label: "施設・行政" },
  { id: "business", label: "事業者" },
  { id: "disaster", label: "防災" }
] as const;
