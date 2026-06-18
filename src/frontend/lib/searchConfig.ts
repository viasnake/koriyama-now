export type SearchConfig = {
  localSearch: {
    enabled: boolean;
  };
  programmableSearch: {
    enabled: boolean;
    cx: string;
  };
};

const googleProgrammableSearchCx = (import.meta.env.VITE_GOOGLE_PSE_CX ?? "").trim();

export const searchConfig: SearchConfig = {
  localSearch: {
    enabled: true
  },
  programmableSearch: {
    enabled: googleProgrammableSearchCx.length > 0,
    cx: googleProgrammableSearchCx
  }
};
