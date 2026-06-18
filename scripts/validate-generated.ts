import { readFile } from "node:fs/promises";
import { join } from "node:path";

const generatedDir = join(process.cwd(), "public", "generated");

type Check = {
  name: string;
  validate: (value: unknown) => string | undefined;
};

const checks: Check[] = [
  {
    name: "home.json",
    validate: (value) =>
      hasGeneratedAt(value) &&
      Array.isArray(value.news) &&
      Array.isArray(value.places) &&
      Array.isArray(value.category_counts)
        ? undefined
        : "home.json must include generated_at and home arrays"
  },
  {
    name: "news.json",
    validate: (value) =>
      hasGeneratedAt(value) && Array.isArray(value.entries)
        ? undefined
        : "news.json must include generated_at and entries"
  },
  {
    name: "places.json",
    validate: (value) =>
      hasGeneratedAt(value) && Array.isArray(value.places) && typeof value.count === "number"
        ? undefined
        : "places.json must include generated_at, places and count"
  },
  {
    name: "places.geojson",
    validate: (value) =>
      hasGeneratedAt(value) && value.type === "FeatureCollection" && Array.isArray(value.features)
        ? undefined
        : "places.geojson must be a generated FeatureCollection"
  },
  {
    name: "search-index.json",
    validate: (value) =>
      hasGeneratedAt(value) && Array.isArray(value.items)
        ? undefined
        : "search-index.json must include generated_at and items"
  },
  {
    name: "build-meta.json",
    validate: (value) =>
      hasGeneratedAt(value) &&
      value.source === "koriyama-open-data-hub" &&
      value.mode === "scheduled-static-build"
        ? undefined
        : "build-meta.json must include source, mode and generated_at"
  }
];

async function main(): Promise<void> {
  const errors: string[] = [];

  for (const check of checks) {
    try {
      const content = await readFile(join(generatedDir, check.name), "utf8");
      const parsed: unknown = JSON.parse(content);
      const error = isRecord(parsed) ? check.validate(parsed) : `${check.name} must be a JSON object`;
      if (error) {
        errors.push(error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${check.name}: ${message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`generated data validation failed:\n${errors.join("\n")}`);
  }

  console.log("generated data validation passed");
}

function hasGeneratedAt(value: Record<string, unknown>): value is Record<string, unknown> & { generated_at: string } {
  return typeof value.generated_at === "string" && value.generated_at.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

void main();
